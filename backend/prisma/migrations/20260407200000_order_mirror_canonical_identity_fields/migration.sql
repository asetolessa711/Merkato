ALTER TABLE "OrderVendorMirror"
  ADD COLUMN "vendorExternalId" TEXT;

ALTER TABLE "OrderVendorItemMirror"
  ADD COLUMN "productExternalId" TEXT;

CREATE INDEX "OrderVendorMirror_vendorExternalId_idx" ON "OrderVendorMirror"("vendorExternalId");
CREATE INDEX "OrderVendorItemMirror_productExternalId_idx" ON "OrderVendorItemMirror"("productExternalId");
