# ⚡ RentoQuick

**RentoQuick** is a premium Peer-to-Peer (P2P) Rental Marketplace built with the MERN stack. It enables users to rent out their items or find items to rent in a seamless, secure, and visually stunning environment.

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![JSON](https://img.shields.io/badge/Storage-JSON_File-orange?style=for-the-badge&logo=json&logoColor=white)](https://www.json.org/)

---

## ✨ Features

- 🔐 **Secure Authentication**: JWT-based login and registration with encrypted passwords.
- 🏠 **Listing Management**: Create, edit, and manage your rental listings with ease.
- 🔍 **Advanced Search & Filter**: Find exactly what you need with powerful discovery tools.
- 📅 **Booking System**: Intuitive booking flow for both renters and owners.
- ❤️ **Wishlist**: Save your favorite items for later.
- 👤 **User Profiles**: Manage your personal information, listings, and rental history.
- 🎨 **Premium UI/UX**:
    - ✨ **Glassmorphism** effects for a modern look.
    - 🌈 **Gradient Typography** and smooth transitions.
    - ⚡ **Optimistic Updates** and shimmer loading states.
    - 📱 **Fully Responsive** design for all devices.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS (Custom Design System)
- **Icons**: Lucide React
- **UI Components**: Headless UI
- **Routing**: React Router 7
- **Toasts**: React Hot Toast

### Backend
- **Environment**: Node.js + Express
- **Database**: File-based JSON Storage (No external DB required!)
- **Security**: JWT, BcryptJS, Helmet, Express Rate Limit
- **Logs**: Morgan

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rentoquick
   ```

2. **Install dependencies**
   Install for both frontend and backend using the root script:
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   - Create a `.env` file in the `backend` directory.
   - Add the following variables:
     ```env
     PORT=5000
     JWT_SECRET=your_secret_key
     ```

4. **Seed Database (Optional)**
   To populate the marketplace with initial demo data:
   ```bash
   npm run seed
   ```

### Running the Application

You can run both the frontend and backend simultaneously (in separate terminals) using:

**Backend:**
```bash
npm run dev:backend
```

**Frontend:**
```bash
npm run dev:frontend
```

---

## 📂 Project Structure

```text
├── backend/            # Express server & API
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── models/      # Mongoose schemas
│   │   ├── routes/      # API endpoints
│   │   └── server.js    # Entry point
├── frontend/           # Vite + React app
│   ├── src/
│   │   ├── components/  # Reusable UI elements
│   │   ├── pages/       # Route views
│   │   └── App.jsx      # Main routing
└── package.json        # Root scripts
```



