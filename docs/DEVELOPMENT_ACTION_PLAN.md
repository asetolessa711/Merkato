# Merkato – Development Acceleration Action Plan

This document outlines a prioritized action plan to accelerate the development of the Merkato platform, based on the implementation status review.

---

## Strategic Priorities

1. **Complete Phase 1 (Core B2B)** - Critical for initial launch
2. **Foundation for Phase 2 (B2I)** - Build Organization model early
3. **Incremental AI Integration** - Start with high-impact, low-complexity AI features
4. **Technical Debt Reduction** - Improve maintainability and scalability

---

## Sprint-Based Action Plan

### 🚀 Sprint 1-2: Phase 1 Completion (High Priority)

#### 1.1 Product Catalog Enhancements
**Effort: Medium | Impact: High**

- [ ] **Bulk Product Upload**
  - Implement CSV/Excel parser for product imports
  - Create template download endpoint
  - Add validation and error reporting
  - Files: `backend/routes/productRoutes.js`, new `utils/bulkUpload.js`

- [ ] **Product Status Workflow**
  - Add `status` field: Draft/PendingReview/Live/Suspended
  - Implement admin approval flow
  - Update product visibility based on status

- [ ] **Product Variants Model**
  - Create `ProductVariant` model with SKU, color, size, price
  - Link variants to parent Product
  - Update catalog UI for variant selection

#### 1.2 Inventory Management
**Effort: Medium | Impact: High**

- [ ] **Enhanced Stock Tracking**
  - Create `InventoryItem` model per product/location
  - Implement low stock alerts
  - Add stock reservation on checkout

- [ ] **Warehouse/Location Support**
  - Add warehouse model
  - Multi-location inventory tracking

#### 1.3 Logistics & Fulfillment
**Effort: Medium | Impact: Medium**

- [ ] **Order Tracking**
  - Create `Shipment` model with tracking number
  - Add status events timeline
  - Webhook-ready for carrier integration

- [ ] **Delivery ETA Display**
  - Show estimated delivery on product pages
  - Calculate based on vendor location + delivery settings

---

### 🏢 Sprint 3-4: Organization & B2I Foundation

#### 2.1 Organization Model
**Effort: High | Impact: Critical for B2I**

- [ ] **Create Organization Schema**
  ```javascript
  // Proposed schema
  {
    legalName: String,
    tradingName: String,
    registrationId: String,
    taxId: String,
    type: ['business', 'institution', 'ngo', 'government'],
    addresses: [AddressSchema],
    primaryContact: { type: ObjectId, ref: 'User' },
    status: ['pending', 'approved', 'suspended'],
    kycStatus: ['pending_review', 'approved', 'rejected'],
    kycDocuments: [DocumentSchema],
    sectors: [String],
    createdAt: Date,
    updatedAt: Date
  }
  ```

- [ ] **User-Organization Relationship**
  - Create `OrgUser` junction model
  - Support multiple orgs per user
  - Define org-level roles (OrgAdmin, OrgStaff, etc.)

- [ ] **API Endpoints**
  - POST /api/organizations - Create organization
  - GET /api/organizations/:id - Get organization details
  - PUT /api/organizations/:id - Update organization
  - POST /api/organizations/:id/users - Add user to org
  - DELETE /api/organizations/:id/users/:userId - Remove user

#### 2.2 KYC/KYB Workflow
**Effort: Medium | Impact: High**

- [ ] **Document Upload**
  - Integrate with secure document storage
  - Support multiple document types (registration, tax, identity)
  - Implement secure access controls

- [ ] **Verification Workflow**
  - Admin review queue
  - Approval/rejection with comments
  - Audit trail for all decisions

- [ ] **Automated Checks (Phase 3)**
  - Integration points for ID verification services
  - Business registry lookups

---

### 📊 Sprint 5-6: RFQ & Quote System (Core B2I)

#### 3.1 RFQ Model & API
**Effort: High | Impact: Critical for B2I**

- [ ] **Create RFQ Schema**
  ```javascript
  {
    organization: { type: ObjectId, ref: 'Organization' },
    createdBy: { type: ObjectId, ref: 'User' },
    title: String,
    description: String,
    lineItems: [{
      description: String,
      quantity: Number,
      unit: String,
      specifications: Mixed,
      deliveryLocation: String,
      deliveryDate: Date
    }],
    status: ['draft', 'published', 'closed', 'awarded', 'cancelled'],
    closingDate: Date,
    attachments: [String],
    visibility: ['public', 'invited'],
    invitedVendors: [{ type: ObjectId, ref: 'User' }]
  }
  ```

- [ ] **RFQ Workflow API**
  - POST /api/rfqs - Create RFQ
  - PUT /api/rfqs/:id/publish - Publish RFQ
  - GET /api/rfqs - List RFQs (with filters)
  - POST /api/rfqs/:id/invite - Invite vendors

#### 3.2 Quote Model & API
**Effort: High | Impact: Critical for B2I**

- [ ] **Create Quote Schema**
  ```javascript
  {
    rfq: { type: ObjectId, ref: 'RFQ' },
    vendor: { type: ObjectId, ref: 'User' },
    lineItems: [{
      rfqLineItem: ObjectId,
      unitPrice: Number,
      totalPrice: Number,
      leadTimeDays: Number,
      notes: String
    }],
    totalAmount: Number,
    currency: String,
    validUntil: Date,
    status: ['draft', 'submitted', 'shortlisted', 'awarded', 'rejected'],
    attachments: [String]
  }
  ```

- [ ] **Quote Workflow API**
  - POST /api/quotes - Submit quote
  - PUT /api/rfqs/:id/shortlist - Shortlist quotes
  - PUT /api/rfqs/:id/award - Award RFQ

#### 3.3 Approval Workflows
**Effort: Medium | Impact: High for B2I**

- [ ] **Approval Configuration**
  - Define approval rules (amount thresholds, department)
  - Multi-level approval chains
  - Auto-approve for small amounts

- [ ] **Approval API**
  - Pending approvals queue
  - Approve/reject with comments
  - Full audit trail

---

### 🤖 Sprint 7-8: AI Integration (Phase 3 Start)

#### 4.1 AI Orchestrator Service
**Effort: High | Impact: High**

- [ ] **Service Setup**
  - Create AI service module
  - OpenAI/Azure OpenAI integration
  - Rate limiting and fallback handling

- [ ] **Catalog Enrichment (High Impact)**
  - Auto-generate product descriptions
  - Category suggestion from product name/image
  - Attribute extraction from descriptions

#### 4.2 Search Enhancement
**Effort: Medium | Impact: High**

- [ ] **Semantic Search Foundation**
  - Integrate vector database (pgvector or Pinecone)
  - Generate embeddings for products
  - Hybrid search (keyword + semantic)

- [ ] **Query Understanding**
  - Spell correction
  - Query expansion with synonyms
  - Natural language to filter conversion

#### 4.3 Recommendations (Medium Priority)
**Effort: Medium | Impact: Medium**

- [ ] **Similar Products**
  - Based on category and attributes
  - Based on vector similarity

- [ ] **Frequently Bought Together**
  - Analyze order data
  - Generate product pairs

---

### 🔒 Sprint 9-10: Security & Compliance

#### 5.1 Security Hardening
**Effort: Medium | Impact: Critical**

- [ ] **MFA Implementation**
  - TOTP-based MFA for admin/vendor
  - Backup codes
  - Enforce for high-privilege actions

- [ ] **Session Management**
  - Active sessions listing
  - Remote session termination
  - Device trust management

- [ ] **Enhanced Rate Limiting**
  - Per-endpoint rate limits
  - Account lockout after failed attempts
  - CAPTCHA integration

#### 5.2 Compliance Features
**Effort: Medium | Impact: High for B2I**

- [ ] **Audit Trail System**
  - Create `AuditLog` model
  - Log all sensitive operations
  - Immutable audit records

- [ ] **Data Subject Rights**
  - Export personal data (GDPR)
  - Account deletion workflow
  - Consent management

---

### 🏗️ Sprint 11-12: Infrastructure & Scalability

#### 6.1 Performance Optimization
**Effort: Medium | Impact: High**

- [ ] **Redis Caching Layer**
  - Session storage
  - API response caching
  - Rate limiting storage

- [ ] **Database Optimization**
  - Indexing strategy review
  - Query optimization
  - Read replicas consideration

#### 6.2 Observability
**Effort: Medium | Impact: Medium**

- [ ] **Structured Logging**
  - Implement Winston or Pino
  - JSON log format
  - Request correlation IDs

- [ ] **Metrics & Monitoring**
  - Health check endpoints
  - Key metric collection
  - Dashboard setup (Grafana/DataDog)

---

## Quick Wins (Immediate Impact)

These can be completed quickly with high value:

### Week 1 Quick Wins
1. **Product Status Field** - Add status enum to Product model (2-4 hours)
2. **Low Stock Alerts** - Add threshold check in inventory routes (2-4 hours)
3. **Admin Audit Trail** - Add createdBy/updatedBy to admin actions (4-6 hours)
4. **CSV Export Enhancement** - Add more export options to analytics (2-4 hours)

### Week 2 Quick Wins
1. **Saved Searches** - Let users save product search filters (4-6 hours)
2. **Wishlist Improvements** - Enhance favorites with notifications (4-6 hours)
3. **Order Notes** - Add notes field for buyer/vendor communication (2-4 hours)
4. **Bulk Order Status Update** - Admin can update multiple orders (4-6 hours)

---

## Resource Allocation Recommendations

### Team Structure (Ideal)
| Role | Count | Focus Area |
|------|-------|------------|
| Backend Lead | 1 | Architecture, API design |
| Backend Dev | 2 | Core features, integrations |
| Frontend Lead | 1 | UI architecture, components |
| Frontend Dev | 2 | Pages, user flows |
| DevOps | 1 | CI/CD, infrastructure |
| QA Engineer | 1 | Testing, quality |
| ML/AI Engineer | 1 | AI features (Phase 3) |

### Priority Focus by Role

**Backend Team:**
1. Organization model (Sprint 3-4)
2. RFQ/Quote system (Sprint 5-6)
3. API performance optimization

**Frontend Team:**
1. Bulk upload UI
2. RFQ/Quote interfaces
3. Admin console enhancements

**DevOps:**
1. Docker containerization
2. Staging environment setup
3. Monitoring and alerting

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| Scope creep | Strict sprint planning, MVP focus |
| Technical debt | 20% time for refactoring each sprint |
| Integration complexity | Early integration testing, API versioning |
| Performance at scale | Load testing from Sprint 6 onwards |
| Security vulnerabilities | Regular security audits, automated scanning |

---

## Milestones & Timeline

| Milestone | Target | Description |
|-----------|--------|-------------|
| Phase 1 Complete | Sprint 2 | Core B2B marketplace functional |
| Organization Launch | Sprint 4 | B2I buyers can create orgs |
| RFQ MVP | Sprint 6 | Basic RFQ workflow live |
| AI v1 | Sprint 8 | Catalog enrichment, basic search |
| Beta Launch | Sprint 10 | Full feature set for beta testing |
| GA Readiness | Sprint 12 | Production-ready platform |

---

## Success Metrics

### Development Velocity
- Sprint velocity trend (story points completed)
- Defect escape rate
- Code coverage percentage

### Platform Health
- API response time p95
- Error rate
- Uptime percentage

### Business Metrics
- Vendor onboarding completion rate
- Order conversion rate
- RFQ to order conversion rate

---

## Appendix: Technical Debt Items

Priority items to address during development:

1. **TypeScript Migration** - Gradual migration for type safety
2. **Test Coverage** - Increase to 80%+ for critical paths
3. **API Documentation** - Generate OpenAPI specs
4. **Code Modularization** - Prepare for microservices split
5. **Error Handling Standardization** - Consistent error responses
6. **Logging Improvement** - Structured, searchable logs

---

*Action Plan Created: November 2024*
*Review Frequency: Bi-weekly*
*Owner: Technical Lead*
