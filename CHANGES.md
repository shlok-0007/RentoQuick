# RentoQuick — Latest Changes (Round 2)

This document covers the **new** changes in this delivery — Razorpay
payment integration + an improved image-scaling fix on the listing page.
All earlier fixes from round 1 (ScrollToTop, lightbox, verified view
counter, review like/reply) are still present and unchanged.

---

## 1. Razorpay Payment Integration Workflow

### What was wrong before
- The `razorpayController.js` already existed but had several security
  and reliability issues:
  - The verify endpoint used `===` for signature comparison (vulnerable
    to timing attacks).
  - It didn't validate that the `razorpay_order_id` actually belonged
    to the booking being verified (an attacker could pay for booking B
    and use that signature to mark booking A as paid).
  - It only updated `paymentStatus` to `'paid'` but didn't move
    `booking.status` forward, so the booking stayed `pending` even
    after a successful payment.
  - It didn't store any payment audit trail (no `paymentId`,
    `signature`, `verifiedAt`).
  - The `createOrder` endpoint had no idempotency — calling it twice
    created two separate Razorpay orders.
  - The amount was sourced directly from `booking.pricing.totalAmount`
    without rounding to integer paise, which can cause Razorpay to
    reject the order.
- The frontend `BookingCard.jsx` checked `typeof window.Razorpay ===
  'undefined'` but **never loaded the script**, so the payment button
  always bailed out.
- There was no payment flow on the listing detail page at all —
  clicking "Reserve Now" just created a `pending` booking and bounced
  to the bookings page.

### What changed

#### Backend

| File | Change |
|------|--------|
| `backend/src/controllers/razorpayController.js` | Complete rewrite. Three endpoints now: `createOrder`, `verifyPayment`, `getPaymentStatus`. See details below. |
| `backend/src/routes/payments.js` | Added `POST /status` route for polling payment state. All three routes require auth. |
| `backend/src/models/Booking.js` | Added a `paymentDetails` sub-document with `orderId`, `paymentId`, `signature`, `amount`, `currency`, `method`, `verifiedAt`. This gives a full audit trail per booking. |

**`POST /api/payments/create-order`** — body `{ bookingId }`
1. Validates ownership (only the renter can pay for their booking).
2. **Idempotency check #1**: if `booking.paymentStatus === 'paid'`,
   refuses to create another order.
3. **Idempotency check #2**: if the booking already has an
   `orderId` and that order is still in `created` / `attempted`
   state on Razorpay's side, returns the existing order instead
   of creating a duplicate.
4. Computes the amount in **integer paise** on the server
   (`Math.round(totalAmount * 100)`) — never trusts the client.
5. Stores the `orderId` and `amount` on the booking so the verify
   step can later confirm the order actually belongs to this booking.
6. Returns `{ order, key_id, amount, currency }` — the frontend gets
   everything it needs in one round-trip.

**`POST /api/payments/verify`** — body
`{ razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }`
1. Validates ownership.
2. **Order-id binding check**: the `razorpay_order_id` must match the
   `orderId` we stored on the booking at create-order time. This
   prevents order-id swapping attacks.
3. **Idempotency**: if the booking is already paid, returns success
   without re-running the signature check.
4. **Timing-safe signature comparison** using
   `crypto.timingSafeEqual(Buffer, Buffer)` — prevents timing
   side-channel attacks.
5. On success:
   - Sets `paymentStatus = 'paid'`.
   - Sets `booking.status = 'confirmed'` (only if the owner hasn't
     already moved it forward to active/completed).
   - Stores `paymentId`, `signature`, `verifiedAt` on
     `paymentDetails`.
   - Pushes a `paid` entry to the booking timeline with the amount
     and Razorpay payment id for audit.
6. On failure: pushes a `payment_failed` entry to the timeline so
   there's a record.

**`POST /api/payments/status`** — body `{ bookingId }`
Returns the current payment status of a booking. Useful for polling
after a checkout that may have been interrupted (user closed the
tab, network dropped, etc.).

#### Frontend

| File | Change |
|------|--------|
| `frontend/src/lib/razorpay.js` | **NEW file.** Two exports: `loadRazorpay()` (idempotent dynamic script loader for `https://checkout.razorpay.com/v1/checkout.js`) and `initiatePayment({ bookingId, user, listingTitle, onDismiss })` (end-to-end flow: load script → create order → open Razorpay checkout modal → call verify endpoint → resolve with updated booking). |
| `frontend/src/pages/ListingDetailPage.jsx` | `handleBook` now does **three steps in sequence**: (1) create the booking via `bookingsAPI.create`, (2) call `initiatePayment` to open the Razorpay modal, (3) on success, navigate to `/bookings` with a success toast. Button shows granular phase feedback ("Creating booking…", "Opening payment…", "Verifying…"). Added a "Secured by Razorpay · 256-bit encryption" hint with `Lock` + `CreditCard` icons. If the user dismisses the modal, the booking still exists in `pending`/`unpaid` state and they can pay later from the Bookings page. |
| `frontend/src/components/bookings/BookingCard.jsx` | Replaced the inline `window.Razorpay` code with a call to the shared `initiatePayment` helper. Now works for both `pending` AND `confirmed` unpaid bookings (so users who closed the modal mid-checkout can retry). Button shows a `Loader2` spinner during the order-creation phase. |

### How the flow works end-to-end

```
User clicks "Reserve & Pay Now" on listing page
         │
         ▼
  [Frontend] bookingsAPI.create()
         │
         ▼
   [Backend] POST /api/bookings  →  creates Booking
              status='pending', paymentStatus='unpaid'
         │
         ▼
  [Frontend] initiatePayment(bookingId)
         │
         ├─ loadRazorpay()  →  injects checkout.js into <head>
         │
         ├─ paymentsAPI.createOrder(bookingId)
         │       │
         │       ▼
         │  [Backend] POST /api/payments/create-order
         │       │  • ownership check
         │       │  • idempotency check
         │       │  • compute integer-paise amount from booking.pricing
         │       │  • razorpay.orders.create()
         │       │  • persist orderId on booking
         │       │  • return { order, key_id, amount, currency }
         │       ▼
         │  new window.Razorpay({ key, amount, order_id, ... }).open()
         │
         │  ─── user enters card/UPI in Razorpay modal ───
         │
         ├─ rzp.handler(response)  ←  Razorpay calls this on success
         │       │
         │       ▼
         │  paymentsAPI.verify({ ...response, bookingId })
         │       │
         │       ▼
         │  [Backend] POST /api/payments/verify
         │       │  • ownership check
         │       │  • order-id binding check
         │       │  • timing-safe HMAC-SHA256 signature compare
         │       │  • on match: status='confirmed', paymentStatus='paid',
         │       │             persist paymentDetails + timeline entry
         │       ▼
         │  resolve(verifyRes.data)
         │
         ▼
  [Frontend] toast.success("Payment successful! Booking confirmed. 🎉")
         │
         ▼
  navigate('/bookings')
```

### Configuration required

The existing `.env` files already contain the test-mode Razorpay keys,
so no setup is needed for development:

```
# backend/.env
RAZORPAY_KEY_ID=rzp_test_T4HYAxjg7mKSqL
RAZORPAY_KEY_SECRET=48vwXZ86Qux3jeVN8zd4RRDx

# frontend/.env
VITE_RAZORPAY_KEY_ID=rzp_test_T4HYAxjg7mKSqL
```

For production, swap in your live keypair from the Razorpay dashboard.

### How to test

1. Sign in as a renter, open any listing, select dates, click
   **"Reserve & Pay Now"**.
2. The button should cycle through "Creating booking…" → "Opening
   payment…" and the Razorpay checkout modal should appear with the
   correct amount prefilled.
3. Use Razorpay's test cards (e.g. `4111 1111 1111 1111`, any future
   expiry, any CVV) or test UPI (`success@razorpay`).
4. On success: green toast, redirect to `/bookings`, booking shows
   `Confirmed` + `Paid` badges.
5. If you close the modal mid-payment: blue info toast, redirect to
   `/bookings` where the booking appears as `Pending` + `Unpaid` with
   a **Pay Now** button to retry.
6. Try refreshing the bookings page after a successful payment — the
   `paid` state should persist (idempotency check).

---

## 2. Fix Image Scaling on Listing Page (Round 2)

### What was wrong
The previous round-1 fix used a **fixed** `h-[500px]` container with a
**checkered `image-stage` background**. While the image was no longer
cropped (thanks to `object-contain`), the visual result was still
awkward:
- A 500px-tall box is disproportionate on mobile (it occupies most of
  the screen for a small product).
- The checkered pattern looked "debug-y" and clashed with the clean
  white card aesthetic of the rest of the page.
- Letterboxed areas on a dark product photo blended into the checkered
  pattern, making the product look "floating" instead of framed.

### What changed

**File:** `frontend/src/pages/ListingDetailPage.jsx` (gallery section)

Replaced the fixed-height checkered container with a clean
**aspect-ratio-based** layout:

```jsx
<div className="relative rounded-[2rem] overflow-hidden bg-white
                aspect-[4/3] shadow-xl shadow-primary-500/10
                border border-surface-100 cursor-zoom-in group">
    <div className="absolute inset-0 p-2 sm:p-4">
        <img
            src={getDetailUrl(images[imgIdx]?.url)}
            alt={images[imgIdx]?.alt || listing.title}
            className="w-full h-full object-contain
                       transition-transform duration-500
                       group-hover:scale-[1.02]"
        />
    </div>
    {/* ...prev/next arrows, dot indicators, click-to-enlarge badge... */}
</div>
```

Key differences from the previous version:

| Aspect | Before (round 1) | After (round 2) |
|--------|------------------|-----------------|
| Container height | Fixed `h-[500px]` (too tall on mobile) | `aspect-[4/3]` (proportional on every screen) |
| Background | Checkered `image-stage` pattern (looked "debug-y") | Clean `bg-white` (matches the rest of the card UI) |
| Inner padding | None (image touched the rounded corners) | `p-2 sm:p-4` wrapper (breathing room) |
| Border radius | `rounded-[2.5rem]` (very aggressive) | `rounded-[2rem]` (still rounded but cleaner) |
| Border | Thick 4px white border (looked like a photo frame) | Thin 1px `border-surface-100` (subtle) |
| Prev/next arrows | 48×48px (too big) | 44×44px (`w-11 h-11`) — better proportioned |
| Dot indicators | Always rendered (even with 1 image) | Only rendered when `images.length > 1` |

### Why this approach is cleanest

- **`aspect-[4/3]`** is the universal product-photo aspect ratio. It
  naturally accommodates landscape, square, and even portrait product
  shots without distortion.
- **`object-contain`** ensures the **entire product is always visible**
  — no cropping, no awkward stretching.
- **Solid white background** is the cleanest possible backdrop for
  letterboxed product photos. It matches the white card aesthetic of
  the rest of the booking UI.
- **Inner padding** (`p-2 sm:p-4`) gives the image breathing room so
  it never visually touches the rounded corners — this is what makes
  it look "framed" instead of "floating".
- The lightbox (round 1) still works exactly the same — clicking the
  image opens the fullscreen `ImageLightbox` with the full-resolution
  non-cropped URL.

---

## Files Modified / Created Summary

### Frontend
| File | Status |
|------|--------|
| `frontend/src/lib/razorpay.js` | ✨ NEW — `loadRazorpay()` + `initiatePayment()` |
| `frontend/src/pages/ListingDetailPage.jsx` | ✏️ Rewired `handleBook` to do booking+payment in sequence; fixed gallery image scaling |
| `frontend/src/components/bookings/BookingCard.jsx` | ✏️ Replaced inline Razorpay code with shared `initiatePayment` helper; added `Loader2` spinner |

### Backend
| File | Status |
|------|--------|
| `backend/src/controllers/razorpayController.js` | ✏️ Complete rewrite — idempotency, timing-safe signature, order-id binding, status bumping |
| `backend/src/routes/payments.js` | ✏️ Added `POST /status` route |
| `backend/src/models/Booking.js` | ✏️ Added `paymentDetails` sub-document |

---

## No New Dependencies

The Razorpay npm package was already in `backend/package.json`
(`"razorpay": "^2.9.6"`). No `npm install` is required.
