ALTER TABLE "OrderMirror"
  ADD COLUMN "buyerExternalId" TEXT;

CREATE INDEX "OrderMirror_buyerExternalId_idx" ON "OrderMirror"("buyerExternalId");
