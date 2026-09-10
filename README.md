# RoadReady — Vehicle Rental & Booking Management System

A React 19 + Vite enterprise-grade front-end for the Vehicle Rental & Booking Management System, featuring **three properly-permissioned roles** (Admin, Staff, Customer), a **role-aware AI Assistant** (with Gemini API seam and zero-hallucination local reasoning engine), persistent fleet management, and bilingual/trilingual support.

---

## 🚀 Key Features & Multi-Role Capabilities

### 👑 1. Admin Experience (`Enterprise Fleet Control`)
- **Global Analytics**: Fleet utilization %, gross revenue trends, booking lifecycle breakdown, branch-wise revenue performance, and top rented vehicles.
- **Fleet Inventory Management**: Add, edit, or remove vehicles across branches with live updates reflecting immediately in the catalog and booking flows.
- **Branch Staff Management**: View branch assignments, provision new staff accounts, and toggle active/deactivated status.
- **Coupons & Promotions**: Create, configure (discount %, max cap, expiry), and delete promotional coupon codes.
- **All Bookings**: Manage bookings globally across all branches.

### 🏢 2. Staff Experience (`Branch Operations Console`)
- **Branch-Scoped Operations**: Operations restricted exclusively to the staff member's assigned branch (`int_Pickup_Branch_Id`).
- **Interactive Booking Lifecycle**: Advance reservations smoothly through life stages:
  - `Pending (1)` → `Confirmed (2)` → `Ongoing / Keys Issued (3)` → `Completed (4)` or `Cancelled (5)`.
- **Branch Readiness**: Mark branch vehicles as Available (`A`) or Under Maintenance (`M`) with a single click.

### 👤 3. Customer Experience
- **Personalized Account & Bookings**: Customer accounts with registration and login. `MyBookings.jsx` strictly filters to the customer's own reservations.
- **Customer Profile**: View and edit contact details, review cumulative rental spending and active reservations.
- **Gated Booking**: Unauthenticated users clicking "Book Now" are prompted to sign in or register with seamless return routing. Pre-populates contact details on the checkout form.
- **Quick Re-booking**: One-click re-book action directly from trip history.

### 🤖 4. Role-Aware AI Assistant
- Floating widget on every page (`ChatAssistant.jsx`) tailored to the user's role:
  - **Customer**: Answers vehicle availability queries, recommends affordable rides, explains coupons, and verifies real-time booking statuses without hallucination.
  - **Staff/Admin**: Summarizes today's branch bookings, identifies vehicles under maintenance, reports gross revenue, and provides how-to guidance.
- **Clean LLM Seam (`aiService.js`)**: Can be powered directly by Google Gemini (`VITE_GEMINI_API_KEY`) or via the deterministic local context reasoning engine.
- Complete support for English, Tamil (தமிழ்), and Hindi (हिंदी).

---

## 🔑 Demo Login Directory

Use the quick-login buttons on the `/login` screen or sign in with:

| Role | Username | Password | Scope / Details |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full Enterprise Control & Global Analytics |
| **Staff (Madurai)** | `staff_madurai` | `staff123` | Madurai Central Branch Operations |
| **Staff (Chennai)** | `staff_chennai` | `staff123` | Chennai Airport Desk Operations |
| **Customer (Rahul)** | `customer1` | `user123` | Existing customer account with seeded bookings |
| **Customer (Priya)** | `customer2` | `user123` | Existing customer account with seeded bookings |
| **New Customer** | *Self-service* | *Custom* | Use "Create Account" tab on `/login` |

---

## 🛠️ Configuration & AI Setup

The app works 100% out of the box client-side without any backend or external services using its built-in local context reasoning engine.

### Optional: Connect Real Google Gemini API
To connect the assistant to live Gemini models:
1. Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. Restart the Vite dev server (`npm run dev`). The assistant seam in `src/services/aiService.js` will automatically switch to Google Gemini REST `generateContent`.

---

## 💻 Tech Stack & React Architecture

- **React 19** + **Vite 8**
- **Routing**: `react-router-dom` v7 with `ProtectedRoute` role guarding
- **State Management**: React Context (`ThemeContext`, `LanguageContext`, `AuthContext`, `FleetContext`, `BookingContext`) with `useReducer`
- **Persistence**: `localStorage` (`rr_user`, `rr_users`, `rr_fleet_vehicles`, `rr_coupons`, `rr_bookings`)
- **Theme**: Instant light/dark mode with CSS variable system
- **Multilingual i18n**: English, Tamil (`தமிழ்`), Hindi (`हिंदी`)

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run oxlint checks
npm run lint

# Production bundle build
npm run build
```
