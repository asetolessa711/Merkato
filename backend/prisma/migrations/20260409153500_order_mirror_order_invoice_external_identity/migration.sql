ALTER TABLE "OrderMirror"
  ADD COLUMN "orderExternalId" TEXT;

ALTER TABLE "OrderVendorMirror"
  ADD COLUMN "invoiceExternalId" TEXT;

CREATE INDEX "OrderMirror_orderExternalId_idx" ON "OrderMirror"("orderExternalId");
CREATE INDEX "OrderVendorMirror_invoiceExternalId_idx" ON "OrderVendorMirror"("invoiceExternalId");
