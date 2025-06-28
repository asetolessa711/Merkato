# ✅ Merkato Platform – Master Kanban + Testing Tracker

This is your living document to track development, polish, and test coverage for Merkato.

---

## 🚀 Features Kanban

### ✅ Done
- [x] Admin Dashboard with metrics
- [x] Vendor Orders (filtered by own products)
- [x] Customer Orders with discount + receipt
- [x] Feedback popup + floating button
- [x] Promo Code Manager (full CRUD)
- [x] Promo Campaign Builder + integration
- [x] Admin Promo Analytics (bar + pie chart, CSV export)
- [x] Flagged Products via AI keyword rules
- [x] All console warnings fixed (Test #1 ✅)
- [x] Public pages load fully (Test #2 ✅)

### ⚙️ In Progress
- [ ] PDF Receipt Generator for Customers (currently prints, not downloads)
- [ ] Cleanup `/images` static file handling

### ⏳ To Do
- [ ] Product Promotions (featured, sale, new tags)
- [ ] AI Promo Suggestions (based on cart total or products)
- [ ] Order Tagging System (urgent, gift, etc.)
- [ ] Top Vendors / Top Products Leaderboard
- [ ] Add vendor approval logic (e.g. `isApproved` flag)
- [ ] Admin toggle for vendor approval
- [ ] Hide unapproved vendors from public list
- [ ] Allow dev access even if vendor not approved

### 🧼 Needs Polish
- [ ] Confirm static file routes for images
- [ ] Remove unused direct routes (`/admin/promo-codes`) if handled via `/promo-manager`
- [ ] Improve HomePage: fill empty spaces with best sellers or promo tiles

---

## 🧪 System Testing Coverage

### ✅ General System
- [x] No console errors or warnings
- [x] Pages load (Home, Shop, Vendor, Admin)

### 🔑 Authentication
- [ ] User can register
- [ ] User can log in
- [ ] User can log out

### 🏨 Customer Journey
- [ ] Hero Section shows (e.g. colorful logo area)
- [ ] Categories grid on homepage
- [ ] Flash Deals visible
- [ ] Best Sellers visible
- [ ] Shop by Vendor section
- [ ] You May Like section loads (recently viewed logic)
- [ ] Checkout flow applies discounts properly
- [ ] Order history visible under /account/orders

### 🧑‍💻 Vendor Journey
- [ ] Vendor onboarding form works
- [ ] Vendor can upload a product
- [ ] Products appear in VendorDashboard
- [ ] Vendor can edit/delete products
- [ ] Vendor Storefront appears correctly
- [ ] VendorOrders page works
- [ ] Vendor Profile Update (with image preview)

### 🛡️ Admin Journey
- [x] Admin Dashboard loads
- [x] Flagged Products visible
- [x] First-Time Buyer Discount editable
- [x] Admin Analytics page

### 🌍 Multi-language (Future Phase)
- [ ] Language selector in navbar (optional)

### 🔒 Security
- [ ] Only logged-in users can upload
- [ ] Vendors only see their own dashboards
- [ ] Admin dashboard is restricted
- [ ] Unauthorized users are redirected

### 📢 Support Section
- [ ] Support link visible
- [ ] Contact/Support form opens

### 📲 App Banner (Optional)
- [ ] App download banner/link appears on HomePage

### 📄 Footer Links
- [ ] Footer includes Terms, Privacy, FAQ
- [ ] Social media icons (Facebook, Instagram, Twitter)
