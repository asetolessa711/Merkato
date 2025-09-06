# End-to-End Test Coverage Checklist

## Customer Flows
- [ ] Register as a new customer (success, validation errors, duplicate email)
- [ ] Login/logout (success, error, locked account)
- [ ] Browse products and categories
- [ ] Add/remove items from cart
- [ ] Checkout as guest (all required fields, error/success messages)
- [ ] Checkout as registered user (all required fields, error/success messages)
- [ ] View order history and details
- [ ] Submit product reviews (success, error, moderation)
- [ ] View and update profile
- [ ] All actions surface global success/error messages

## Vendor Flows
- [ ] Register as a vendor (success, validation errors, duplicate email)
- [ ] Login/logout (success, error, locked account)
- [ ] Add/edit/delete products
- [ ] View/manage own products
- [ ] View sales analytics and revenue
- [ ] View and manage orders (fulfill, update status)
- [ ] View and respond to customer feedback
- [ ] Update vendor profile/store info
- [ ] All actions surface global success/error messages

## Admin Flows
- [ ] View all users (pagination/filtering)
- [ ] Update user roles (promote/demote)
- [ ] Delete/block/unblock users
- [ ] View all orders (filters)
- [ ] Update order status, delete/cancel orders
- [ ] Resend invoices/notifications
- [ ] View/manage flagged reviews (hide/unhide/delete)
- [ ] Manage delivery options (add/edit/delete/activate)
- [ ] Manage promo codes/campaigns (add/edit/delete/activate)
- [ ] View analytics/dashboard, export reports
- [ ] View/respond to support tickets/feedback
- [ ] All actions surface global success/error messages

---

**For each area, ensure:**
- [ ] All main actions are tested (CRUD, status changes, etc.)
- [ ] Both success and error states are asserted for global message display
- [ ] Edge cases and permission errors are covered
