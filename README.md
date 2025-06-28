# 🛠️ Fixeify – Handyman Booking Platform

Fixeify is a scalable full-stack **handyman booking web application** built with the **MERN stack**, featuring **user**, **service provider**, and **admin** modules. Users can search local Fixeify Pros based on their location and book services, while service providers can manage availability and quotations. Admins have full control over the platform's user base, service provider approvals, and category management.

---

## 🚀 Features

### 👤 User
- Sign up with **JWT + OTP-based email verification** (via Redis)
- Location-based search using **Google Maps API** (5–10 km range)
- Service booking and cancellation (before provider accepts)
- Profile image upload using **AWS S3**
- Report service providers

### 🧰 Fixeify Pro (Service Provider)
- Sign up with detailed information for **admin approval**
- Set availability slots and mark days as unavailable
- View bookings, generate **quotations**
- Accept payments via **Razorpay**

### 🛡️ Admin
- Approve/reject service providers
- Ban/unban users and service providers
- Manage categories and resolve user reports

---

## 🧱 Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React, Vite, TypeScript, Tailwind CSS |
| Backend     | Node.js, Express.js, TypeScript     |
| Database    | MongoDB                             |
| Auth        | JWT (Access/Refresh), Redis for OTP |
| File Upload | AWS S3                              |
| Maps        | Google Maps API                     |
| Payments    | Razorpay                            |
| Architecture| Repository-Service-Controller, DTOs |

---

## 📂 Project Structure

### 🔧 Backend (`Fixeify-Backend`)
```
src/
├── config/          # Environment/config settings
├── constants/       # Application constants
├── controllers/     # Route handlers
├── dtos/            # Data Transfer Objects
├── enums/           # App enums
├── logs/            # Request & error logging
├── middleware/      # Auth, error, request logging
├── models/          # Mongoose schemas
├── repositories/    # DB access logic
├── routes/          # Route definitions
├── services/        # Business logic
├── utils/           # Helpers & utilities
├── server.ts        # Entry point
└── types.ts         # Custom TypeScript types
```
---

### 🎨 Frontend (`Fixeify-Frontend`)
```
src/
├── api/             # Axios configurations & API calls
├── assets/          # Static files/images
├── components/      # Reusable UI components
├── context/         # Context Providers
├── interfaces/      # TypeScript interfaces & types
├── lib/             # Custom hooks or helpers
├── pages/           # Route pages (Home, Profile, etc.)
├── routes/          # Route configurations
├── store/           # Redux Toolkit slices
├── Validation/      # Yup/Zod validation schemas
├── App.tsx          # Root component
├── main.tsx         # App entry point
└── vite-env.d.ts    # Vite env type definitions
```
---

## ⚙️ Getting Started

### 1. Clone the Repository
```
git clone https://github.com/your-username/fixeify.git
cd fixeify
```

### 2. Navigate to the backend folder and install dependencies
```
cd Fixeify-Backend
npm install
```

### 3. Create a .env file in Fixeify-Backend directory and add the following environment variables
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/Fixeify
ACCESS_TOKEN_SECRET=yourAccessTokenSecretKey
REFRESH_TOKEN_SECRET=yourRefreshTokenSecretKey
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
NODE_ENV=development
EMAIL_USER=nandalal673029@gmail.com
EMAIL_PASS=jpziyyjtknpjysuu
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
```

### 4. Start the backend server
```
npm run dev
```

### 5. Navigate to the frontend folder and install dependencies
```
cd ../Fixeify-Frontend
npm install
```

### 6. Start the frontend development server
```
npm run dev
```

