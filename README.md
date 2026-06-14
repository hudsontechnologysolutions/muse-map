# Muse Map

Local artists had no centralized way to surface cultural events, and the partnering nonprofit had no recurring revenue stream. Designed and deployed a subscription platform under Jersey City's elected Poet Laureate, featuring an interactive map, event calendar, and Stripe-integrated paywalled tiers from $25/month.

https://muse-map.vercel.app/

---

## Tech Stack

- React.js (frontend)
- Node.js / Express.js (backend)
- MongoDB

---

## Features

- JWT-based register/login with protected routes
- Stripe-powered subscription billing ($5/month or $50/year)
- Create events with title, description, date/time, location, neighborhood, category, and capacity
- Interactive monthly calendar with color-coded event dots by category
- Grid list view with category and neighborhood filtering
- Interactive map view with color-coded pins and geocoded event locations
- Event detail page with attendee list and capacity progress bar
- One-click event registration/unregistration with capacity enforcement
- Dashboard with tabs for events you're organizing vs. attending
- Organizers can edit or delete their events

---

## Payments

- Monthly plan: $25/month
- Powered by Stripe Checkout
- Subscription management via Stripe Billing Portal

---

## Deployment

- Frontend: Netlify
- Backend: Render
- Database: MongoDB Atlas
- Payments: Stripe

---

License

MIT
