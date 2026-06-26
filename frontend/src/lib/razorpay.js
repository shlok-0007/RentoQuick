/**
 * Frontend Razorpay helper.
 *
 * Exposes:
 *   - loadRazorpay()  : dynamically injects the Razorpay checkout script
 *                       into <head> (idempotent — only loads once).
 *   - initiatePayment(): end-to-end flow — creates an order on the backend,
 *                       opens the Razorpay checkout modal, calls the verify
 *                       endpoint on success, and resolves with the updated
 *                       booking.
 *
 * The component using this helper only needs to:
 *   1. Show a loading spinner while `initiatePayment()` is awaited.
 *   2. Listen for the resolved promise → success toast + navigate away.
 *   3. Listen for the rejected promise → error toast.
 */

import { paymentsAPI } from '../api';

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;

/**
 * Dynamically load the Razorpay checkout script.
 * Returns a Promise that resolves to `true` once `window.Razorpay` is
 * available. The script is only injected once across the whole app
 * (subsequent calls return the cached promise).
 */
export function loadRazorpay() {
    if (typeof window !== 'undefined' && window.Razorpay) {
        return Promise.resolve(true);
    }
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
        if (existing) {
            // Script tag exists but window.Razorpay isn't ready yet — wait
            // for it to fire its load event.
            existing.addEventListener('load', () => resolve(true), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay script')), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = RAZORPAY_SCRIPT_SRC;
        script.async = true;
        script.onload = () => {
            if (window.Razorpay) {
                resolve(true);
            } else {
                reject(new Error('Razorpay script loaded but window.Razorpay is undefined'));
            }
        };
        script.onerror = () => {
            scriptPromise = null; // allow retry
            reject(new Error('Failed to load Razorpay script. Check your network connection.'));
        };
        document.head.appendChild(script);
    });
    return scriptPromise;
}

/**
 * End-to-end Razorpay payment flow.
 *
 * @param {object}   opts
 * @param {string}   opts.bookingId       — Mongo _id of the booking to pay for
 * @param {object}   opts.user            — current logged-in user (for prefill)
 * @param {string}   opts.listingTitle    — name shown in the checkout modal
 * @param {function} [opts.onDismiss]     — called when the user closes the
 *                                          modal without paying (NOT an error)
 * @returns {Promise<object>} resolves with the updated booking from the
 *                            verify endpoint; rejects with an Error on any
 *                            hard failure (script load, order creation,
 *                            signature verification).
 */
export async function initiatePayment({ bookingId, user, listingTitle, onDismiss }) {
    if (!bookingId) throw new Error('bookingId is required');

    // 1) Make sure the script is loaded
    try {
        await loadRazorpay();
    } catch (err) {
        throw new Error('Could not load the payment gateway. Please check your internet connection and try again.');
    }

    if (typeof window.Razorpay === 'undefined') {
        throw new Error('Payment gateway failed to initialise.');
    }

    // 2) Create the order on the backend (server computes the amount)
    let orderRes;
    try {
        orderRes = await paymentsAPI.createOrder(bookingId);
    } catch (err) {
        const msg = err.response?.data?.message || 'Failed to create payment order.';
        throw new Error(msg);
    }

    const { order, key_id, amount, currency } = orderRes.data;
    if (!order?.id || !key_id) {
        throw new Error('Invalid order response from server.');
    }

    // 3) Open the Razorpay checkout modal
    return new Promise((resolve, reject) => {
        const options = {
            key: key_id,
            amount: amount || order.amount,
            currency: currency || order.currency || 'INR',
            name: 'RentoQuick',
            description: listingTitle ? `Payment for ${listingTitle}` : 'Rental Payment',
            order_id: order.id,
            // Prefill whatever user info we have so the modal opens faster
            prefill: {
                name: user?.name || '',
                email: user?.email || '',
                contact: user?.phone || '',
            },
            // Show a nice RentoQuick-branded theme
            theme: { color: '#de6b6b' },
            // Single-shot modal — Razorpay dismisses it after success.
            modal: {
                ondismiss() {
                    // The user closed the modal without paying. This is NOT
                    // a hard error — the booking remains in 'unpaid' state
                    // and the user can retry later.
                    if (typeof onDismiss === 'function') onDismiss();
                    else reject(new Error('Payment cancelled. You can pay later from the Bookings page.'));
                },
            },
            // Success handler — verify the signature on the backend.
            handler: async (response) => {
                const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = response;
                if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                    reject(new Error('Incomplete payment response from gateway.'));
                    return;
                }
                try {
                    const verifyRes = await paymentsAPI.verify({
                        razorpay_order_id,
                        razorpay_payment_id,
                        razorpay_signature,
                        bookingId,
                    });
                    resolve(verifyRes.data);
                } catch (err) {
                    const msg = err.response?.data?.message || 'Payment verification failed.';
                    reject(new Error(msg));
                }
            },
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (resp) => {
                // Razorpay fires this for failed UPI/card attempts INSIDE the
                // modal — the modal stays open so the user can retry. We
                // don't reject the promise here; we just log so the dev
                // can see what happened. The user can still close the modal
                // themselves (which triggers modal.ondismiss above).
                console.warn('[Razorpay] payment.failed', resp?.error);
            });
            rzp.open();
        } catch (err) {
            reject(new Error(err.message || 'Failed to open payment modal.'));
        }
    });
}
