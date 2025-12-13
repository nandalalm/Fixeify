# 🛠️ Fixeify — Scalable Handyman Booking Platform

Fixeify is a **production-grade full-stack handyman booking platform** built with the **MERN stack and TypeScript**, designed to handle real-world booking flows, payments, background jobs, and role-based access control.

The platform supports **three distinct roles** — **Users**, **Service Providers (Fixeify Pros)**, and **Admins** — and focuses on **scalability, maintainability, and system reliability** rather than just feature delivery.

---

## 🧠 System Overview

Fixeify solves the problem of **reliable service booking** by combining:
- Location-based discovery
- Time-bound availability management
- Secure payments
- Asynchronous background processing

The backend is architected using **Repository–Service–Controller pattern**, **DTOs**, and **SOLID principles** to ensure long-term maintainability and testability.

---

## 🚀 Core Features

### 👤 User
- JWT-based authentication with **OTP email verification** (Redis-backed)
- Location-based provider discovery using **Google Maps API** (5–10 km radius)
- Service booking and cancellation (before provider acceptance)
- Booking status tracking
- Profile image upload using **AWS S3**
- Ability to report service providers

---

### 🧰 Fixeify Pro (Service Provider)
- Signup with detailed profile → **Admin approval workflow**
- Availability slot creation and schedule management
- Automatic slot locking during booking flow
- Quotation generation and booking management
- Accept payments via **Stripe / Razorpay**

---

### 🛡️ Admin
- Approve or reject service provider applications
- Ban / unban users and providers
- Category and service management
- Handle user reports and platform moderation

---

## ⚙️ Background Jobs & Automation

To prevent blocking API requests and ensure booking consistency:

- Implemented **BullMQ with Redis** for background processing
- **Automatic slot release**
  - Frees provider availability if booking is not confirmed within a defined time window
- Scheduled cleanup jobs to prevent stale bookings
- Improved system responsiveness under concurrent booking scenarios

This design decouples time-based logic from request lifecycle and improves fault tolerance.

---

## 💳 Payments & Booking Lifecycle

- Integrated **Stripe** for secure card payments
- Webhook-driven payment confirmation
- Booking state transitions handled after verified payment events
- Razorpay supported for alternate payment flows
- Idempotent webhook handling to prevent duplicate state updates

---

## 🧱 Tech Stack

| Layer         | Technology                                       |
|---------------|------------------------------------------------- |
| Frontend      | React, Vite, TypeScript, Tailwind CSS            |
| Backend       | Node.js, Express.js, TypeScript                  |
| Database      | MongoDB                                          |
| Cache / Queue | Redis, BullMQ                                    |
| Auth          | JWT (Access & Refresh), OTP via Redis            |
| File Storage  | AWS S3                                           |
| Maps          | Google Maps API                                  |
| Payments      | Stripe, Razorpay                                 |
| Architecture  | Repository–Service–Controller, DTOs, SOLID       |

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
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password
REDIS_URL=your_redis_connection_url
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
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

### 6. Create a .env file in Fixeify-Frontend directory and add the following environment variables
```
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_AWS_ACCESS_KEY_ID=your_aws_access_key_id
VITE_AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
VITE_AWS_REGION=your_aws_region
VITE_S3_BUCKET_NAME=your_s3_bucket_name
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 7. Start the frontend development server
```
npm run dev
```

