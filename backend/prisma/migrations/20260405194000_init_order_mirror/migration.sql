-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "OrderMirror" (
    "id" BIGSERIAL NOT NULL,
    "mongoId" TEXT NOT NULL,
    "buyerMongoId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "totalAfterDiscount" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL,
    "promoMongoId" TEXT,
    "shippingAddressJson" JSONB,
    "deliveryOptionJson" JSONB,
    "orderDate" TIMESTAMP(3),
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "mirroredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderMirror_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderVendorMirror" (
    "id" BIGSERIAL NOT NULL,
    "orderMirrorId" BIGINT NOT NULL,
    "vendorMongoId" TEXT NOT NULL,
    "invoiceMongoId" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,
    "shipping" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "commissionRate" DECIMAL(6,4) NOT NULL,
    "commissionAmount" DECIMAL(14,2) NOT NULL,
    "netEarnings" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deliveryStatus" TEXT,
    "displayCurrency" TEXT,
    "exchangeRate" DECIMAL(14,6),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "OrderVendorMirror_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderVendorItemMirror" (
    "id" BIGSERIAL NOT NULL,
    "orderVendorId" BIGINT NOT NULL,
    "productMongoId" TEXT NOT NULL,
    "name" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "tax" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "OrderVendorItemMirror_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderMirror_mongoId_key" ON "OrderMirror"("mongoId");

-- CreateIndex
CREATE INDEX "OrderMirror_buyerMongoId_idx" ON "OrderMirror"("buyerMongoId");

-- CreateIndex
CREATE INDEX "OrderMirror_mirroredAt_idx" ON "OrderMirror"("mirroredAt");

-- CreateIndex
CREATE INDEX "OrderVendorMirror_orderMirrorId_idx" ON "OrderVendorMirror"("orderMirrorId");

-- CreateIndex
CREATE INDEX "OrderVendorMirror_vendorMongoId_idx" ON "OrderVendorMirror"("vendorMongoId");

-- CreateIndex
CREATE INDEX "OrderVendorItemMirror_orderVendorId_idx" ON "OrderVendorItemMirror"("orderVendorId");

-- CreateIndex
CREATE INDEX "OrderVendorItemMirror_productMongoId_idx" ON "OrderVendorItemMirror"("productMongoId");

-- AddForeignKey
ALTER TABLE "OrderVendorMirror" ADD CONSTRAINT "OrderVendorMirror_orderMirrorId_fkey" FOREIGN KEY ("orderMirrorId") REFERENCES "OrderMirror"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVendorItemMirror" ADD CONSTRAINT "OrderVendorItemMirror_orderVendorId_fkey" FOREIGN KEY ("orderVendorId") REFERENCES "OrderVendorMirror"("id") ON DELETE CASCADE ON UPDATE CASCADE;
