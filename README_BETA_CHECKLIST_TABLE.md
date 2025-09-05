# Merkato – Beta Readiness Test Checklist

| #    | Category                        | Check Item                                                                 | Pass (✓/✗) | Remarks / Follow-up |
|------|----------------------------------|----------------------------------------------------------------------------|-------------|---------------------|
| 1.1  | Core System Validation           | Critical modules (product cards, wallet, profile, role nav) are integrated and working |             |                     |
| 1.2  | Core System Validation           | Infinite scrolling performs smoothly and doesn't cause memory leaks         |             |                     |
| 1.3  | Core System Validation           | Layouts display correctly for all user roles (customer, vendor, admin)      |             |                     |
| 1.4  | Core System Validation           | Responsive design confirmed on mobile, tablet, desktop                      |             |                     |
| 1.5  | Core System Validation           | Product search, filters, and sort functionality are accurate                |             |                     |
| 2.1  | Performance & Load Testing        | Homepage, product page, and dashboard load within acceptable time           |             |                     |
| 2.2  | Performance & Load Testing        | Simulated load test run with high concurrent users (e.g., 1000+)            |             |                     |
| 2.3  | Performance & Load Testing        | API response times optimized and monitored under stress                     |             |                     |
| 2.4  | Performance & Load Testing        | Firebase backend (Firestore, auth) stable under load                        |             |                     |
| 3.1  | Security & Data Integrity         | Login/logout/session handling and role switching tested                     |             |                     |
| 3.2  | Security & Data Integrity         | Role-based access control prevents unauthorized access                      |             |                     |
| 3.3  | Security & Data Integrity         | User data encrypted and stored securely                                     |             |                     |
| 3.4  | Security & Data Integrity         | Wallet balance and transaction accuracy validated                           |             |                     |
| 3.5  | Security & Data Integrity         | Form validations and input sanitization in place                            |             |                     |
| 4.1  | Error Handling & Logging          | 404, 500, and transaction failure pages handled gracefully                  |             |                     |
| 4.2  | Error Handling & Logging          | Frontend error tracking enabled (e.g., Crashlytics/Sentry)                  |             |                     |
| 4.3  | Error Handling & Logging          | Backend error logs and warnings monitored                                   |             |                     |
| 4.4  | Error Handling & Logging          | Logs accessible for debugging and structured for triage                     |             |                     |
| 5.1  | Third-Party Integration Testing   | Firebase services (auth, storage, analytics) tested                         |             |                     |
| 5.2  | Third-Party Integration Testing   | External APIs tested with fallback logic in case of downtime                |             |                     |
| 5.3  | Third-Party Integration Testing   | Payment flows tested (including test and live environment)                  |             |                     |
| 5.4  | Third-Party Integration Testing   | Image uploads and CDN delivery validated (e.g., Cloudinary)                 |             |                     |
| 6.1  | Deployment & Versioning           | Codebase tagged for beta (e.g., `v1.0-beta`)                                |             |                     |
| 6.2  | Deployment & Versioning           | Manual or CI/CD deployment pipeline validated                               |             |                     |
| 6.3  | Deployment & Versioning           | Rollback/recovery process in place and tested                               |             |                     |
| 6.4  | Deployment & Versioning           | Staging and production environments separated                               |             |                     |
| 7.1  | Documentation & Support           | Architecture and system flow docs updated                                   |             |                     |
| 7.2  | Documentation & Support           | API documentation available (for internal or external use)                  |             |                     |
| 7.3  | Documentation & Support           | Internal support guide for triaging beta issues available                   |             |                     |
| 7.4  | Documentation & Support           | Beta testers provided with onboarding guide, FAQ, and support contacts      |             |                     |
| 8.1  | Role-Specific UI/UX Testing       | Customer dashboard shows orders, cart, wallet, profile correctly            |             |                     |
| 8.2  | Role-Specific UI/UX Testing       | Vendor dashboard shows product upload, analytics, order mgmt                |             |                     |
| 8.3  | Role-Specific UI/UX Testing       | Admin dashboard shows user/product/review/flag/promo mgmt                   |             |                     |
| 8.4  | Role-Specific UI/UX Testing       | Public (Home) page shows registration, featured products                    |             |                     |
| 8.5  | Role-Specific UI/UX Testing       | Role switching updates layout, menu, and page access                        |             |                     |
| 9.1  | Navigation and Route Access Control | Protected routes redirect unauthenticated users                           |             |                     |
| 9.2  | Navigation and Route Access Control | Nav bar updates by user role (login/logout, dashboard links)              |             |                     |
| 9.3  | Navigation and Route Access Control | Forbidden pages return proper access errors                               |             |                     |
| 9.4  | Navigation and Route Access Control | Logout clears session and redirects correctly                             |             |                     |
| 10.1 | Smart Component Behaviors         | Product cards dynamically update with filters                               |             |                     |
| 10.2 | Smart Component Behaviors         | Flash deals or featured listings highlight correctly                        |             |                     |
| 10.3 | Smart Component Behaviors         | Vendor analytics load and calculate properly                                |             |                     |
| 10.4 | Smart Component Behaviors         | Charts toggle views and support date range                                  |             |                     |
| 10.5 | Smart Component Behaviors         | Export buttons generate valid CSV/PDFs                                      |             |                     |
| 11.1 | Communication & Feedback          | Support/contact form submissions are received                               |             |                     |
| 11.2 | Communication & Feedback          | Feedback/bug reports can be submitted                                       |             |                     |
| 11.3 | Communication & Feedback          | Support team alerted for high-priority issues                               |             |                     |
| 11.4 | Communication & Feedback          | In-app messages are clear and helpful                                       |             |                     |
| 12.1 | Promo Codes / Discounts           | Promo logic applies correctly (one-time, % or flat)                         |             |                     |
| 12.2 | Promo Codes / Discounts           | Admin can create/edit/deactivate promo codes                                |             |                     |
| 12.3 | Promo Codes / Discounts           | Promo analytics display usage stats                                         |             |                     |
| 12.4 | Promo Codes / Discounts           | Checkout reflects correct discount amount                                   |             |                     |
| 13.1 | Data Seeding                      | Test vendors with products uploaded                                         |             |                     |
| 13.2 | Data Seeding                      | Test customers with cart activity                                           |             |                     |
| 13.3 | Data Seeding                      | Admin with permissions and seeded reports                                   |             |                     |
| 13.4 | Data Seeding                      | Dummy transactions for order & wallet tests                                 |             |                     |
| 13.5 | Data Seeding                      | Products include variety for filters (color, size, type)                    |             |                     |
| 14.1 | Compliance & Accessibility        | Cookies and privacy notice included                                         |             |                     |
| 14.2 | Compliance & Accessibility        | Basic accessibility (color contrast, alt text)                              |             |                     |
| 14.3 | Compliance & Accessibility        | Mobile navigation doesn't break on devices                                  |             |                     |
| 14.4 | Compliance & Accessibility        | GDPR/data deletion support (if required)                                    |             |                     |

