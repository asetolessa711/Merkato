# Admin End-to-End Test Coverage Checklist

## 1. User Management
- [ ] Admin can view all users (with pagination/filtering if available)
- [ ] Admin can update user roles (promote/demote)
- [ ] Admin can delete users
- [ ] Admin can block/unblock users (if supported)
- [ ] All actions surface global success/error messages
- [ ] Permission errors and edge cases (e.g., self-escalation) are handled and surfaced

## 2. Order Management
- [ ] Admin can view all orders (with filters: status, date, user, etc.)
- [ ] Admin can update order status (shipped, delivered, cancelled, etc.)
- [ ] Admin can delete/cancel orders
- [ ] Admin can resend invoices/notifications
- [ ] All actions surface global success/error messages
- [ ] Permission errors and edge cases are handled and surfaced

## 3. Review Moderation
- [ ] Admin can view flagged reviews
- [ ] Admin can hide/unhide reviews
- [ ] Admin can delete reviews
- [ ] All actions surface global success/error messages
- [ ] Already hidden/unhidden/deleted and network errors are handled

## 4. Delivery/Expense/Settings Management
- [ ] Admin can add/edit/delete delivery options
- [ ] Admin can activate/deactivate delivery options
- [ ] Admin can manage expense categories/settings
- [ ] All actions surface global success/error messages

## 5. Promo/Discount Management
- [ ] Admin can create/edit/delete promo codes/campaigns
- [ ] Admin can activate/deactivate promos
- [ ] All actions surface global success/error messages

## 6. Analytics/Dashboard
- [ ] Admin can view dashboard metrics (user count, sales, revenue, etc.)
- [ ] Admin can download/export reports (CSV, PDF, etc.)
- [ ] All actions surface global success/error messages

## 7. Support/Feedback Inbox
- [ ] Admin can view/respond to support tickets or feedback
- [ ] Admin can mark tickets as resolved/unresolved
- [ ] All actions surface global success/error messages

---

**For each area, ensure:**
- [ ] All main actions are tested (CRUD, status changes, etc.)
- [ ] Both success and error states are asserted for global message display
- [ ] Edge cases and permission errors are covered
