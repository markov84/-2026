# Kondor Lighting Store Management System

## Overview

MARK LIGHT LTD Store Management System is a full-stack web application for managing a lighting retail network. The project uses a React frontend, an Express API, MongoDB Atlas, JWT authentication, Socket.IO notifications, and a mobile-ready PWA shell.

The application is organized as a workspace monorepo:

- `client/` - React, Vite, Material UI application.
- `server/` - Express, Mongoose, MongoDB API.

## Main Features

- User login with JWT authentication.
- Executive dashboard with KPI cards, charts, finance pulse, activity stream, and low-stock watchlist.
- Product management with categories, SKU, barcode, pricing, and product presentation.
- Customer management and CRM-style customer profiles.
- Store management for a multi-store retail network.
- Inventory management by store, with stock and minimum stock tracking.
- Orders and sales management with status and payment status.
- Finance module for income, expenses, and bank entries.
- Invoices and VAT reports.
- Store transfers.
- Employee management with role-based access.
- Socket.IO realtime notifications.
- Responsive shell with desktop sidebar, horizontal quick icon navigation, mobile bottom navigation, and mobile quick actions.
- PWA foundation through `manifest.webmanifest` and service worker support.

## Tech Stack

### Frontend

- React
- React Router
- Material UI
- Axios
- Recharts
- Socket.IO Client
- Vite
- Vitest and Testing Library

### Backend

- Express.js
- Mongoose
- MongoDB Atlas
- JWT
- bcryptjs
- helmet
- express-rate-limit
- morgan
- multer
- Cloudinary
- Socket.IO

## Project Structure

```txt
client/
  public/
  src/
    components/
    hooks/
    lib/
    pages/
    providers/
    test/

server/
  src/
    config/
    middleware/
    models/
    routes/
    scripts/
```

## Active Frontend Files

The current router in `client/src/App.jsx` uses:

- `client/src/components/CommandCenterShellClean.jsx`
- `client/src/pages/ExecutiveDashboardPagePolished.jsx`
- `client/src/pages/ProductsPagePolished.jsx`
- `client/src/pages/CustomersPageStable.jsx`
- `client/src/pages/StoresPageStable.jsx`
- `client/src/pages/InventoryPageReady.jsx`
- `client/src/pages/OrdersPageStable.jsx`
- `client/src/pages/FinancePageStable.jsx`
- `client/src/pages/EmployeesPageStable.jsx`
- `client/src/pages/TransfersPageStable.jsx`
- `client/src/pages/InvoicesPageStable.jsx`
- `client/src/pages/VatReportsPageClean.jsx`

Active shell/provider files:

- `client/src/App.jsx`
- `client/src/main.jsx`
- `client/src/providers/AuthProviderStable.jsx`
- `client/src/hooks/useRealtimeNotificationsStable.js`
- `client/src/components/MobileBottomNavigation.jsx`
- `client/src/components/MobileQuickActions.jsx`

Legacy page variants are archived under:

- `client/src/pages/_legacy/`

## Main Backend Models

- `User`
- `Product`
- `Store`
- `Customer`
- `InventoryItem`
- `Order`
- `FinancialEntry`
- `AuditLog`

## Environment

Create and maintain local server configuration in:

```txt
server/.env
```

Example:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/programa?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=http://localhost:5173
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Markov8406162224
```

Notes:

- Do not commit real database passwords or JWT secrets.
- If the MongoDB password contains special characters, encode them in the URI. For example, `+` must be written as `%2B`.
- MongoDB Atlas network access must allow the machine that runs the server.

## Local Development

Install dependencies:

```powershell
npm install
```

Seed admin user:

```powershell
npm run seed
```

Seed demo data:

```powershell
npm run seed:demo
```

Start both frontend and backend:

```powershell
npm run dev
```

Start only the backend:

```powershell
npm run dev:server
```

Start only the frontend:

```powershell
npm run dev:client
```

Default local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api`
- Health check: `http://localhost:5000/api/health`

## Build and Test

Build the frontend:

```powershell
npm run build
```

Run client tests:

```powershell
npm run test
```

Serve built SPA locally:

```powershell
npm run serve:client
```

## API Summary

Base URL:

```txt
http://localhost:5000/api
```

### Auth

- `POST /auth/login`
- `GET /auth/me`

### Dashboard

- `GET /dashboard`

### Products

- `GET /products`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`

### Customers

- `GET /customers`
- `POST /customers`

### Stores

- `GET /stores`
- `POST /stores`

### Inventory

- `GET /inventory/summary`
- `POST /inventory/summary`

### Orders

- `GET /orders`
- `POST /orders`

### Finance

- `GET /finance`
- `POST /finance`

### Health

- `GET /health`

## User Roles

- `admin`
- `manager`
- `sales`
- `warehouse`

Employees page access is limited in the router to `admin` and `manager`.

## Deployment Notes

Recommended production settings:

- Restrict MongoDB Atlas network access.
- Use a strong `JWT_SECRET`.
- Rotate admin credentials.
- Serve the frontend over HTTPS.
- Configure an exact CORS origin.
- Use a process manager, container, or managed hosting.
- Keep `.env` secrets out of source control.

## Current Checklist

Done:

- Full-stack workspace with `client` and `server`.
- MongoDB connection and seed scripts.
- JWT authentication.
- Active shell moved to `CommandCenterShellClean`.
- Stable auth provider is active.
- Stable realtime notifications hook is active.
- Products, customers, stores, inventory, orders, finance, employees, transfers, invoices, and VAT report pages are wired.
- CRUD actions and shared delete confirmation flow are present on active screens.
- Responsive data table wrapper is improved for mobile.
- Legacy pages are archived in `_legacy`.
- Smoke tests exist for login, auth guard, and basic CRUD validation.
- Production build passes.
- Test suite passes.
- Horizontal colorful quick icon navigation was added to the desktop shell.

Remaining:

- LAN access from phone may still require Windows firewall or network profile configuration.
- Further performance work can split larger frontend chunks.
- Docker support can be added later if needed.

## Security Reminder

This repository uses local `.env` files for sensitive settings. Real MongoDB credentials, JWT secrets, and service keys should stay local and should be rotated if they were ever shared publicly.
