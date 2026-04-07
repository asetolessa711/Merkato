const {
  buildMirrorSummary,
  buildVendorRows,
  compareMirrorSummary,
  resolveOrdersPgMirrorMode,
  summarizeMirroredOrder,
} = require("../../../services/orderPostgresMirror");

describe("orderPostgresMirror", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("falls back to off when mirror mode is invalid", () => {
    process.env.ORDERS_PG_MIRROR_MODE = "unsupported";

    expect(resolveOrdersPgMirrorMode()).toBe("off");
  });

  test("builds vendor rows with richer mirrored shape", () => {
    const rows = buildVendorRows([
      {
        vendorId: "vendor-1",
        vendorName: "Vendor One",
        vendorEmail: "vendor@example.com",
        invoiceId: "invoice-1",
        subtotal: 25,
        discount: 1,
        tax: 3.75,
        shipping: 5,
        total: 32.75,
        commissionRate: 0.1,
        commissionAmount: 2.5,
        netEarnings: 30.25,
        currency: "USD",
        status: "pending",
        products: [
          {
            product: "product-1",
            name: "Mirror Product",
            quantity: 2,
            price: 12.5,
            subtotal: 25,
            tax: 3.75,
          },
        ],
      },
    ]);

    expect(rows[0]).toMatchObject({
      vendorMongoId: "vendor-1",
      vendorName: "Vendor One",
      vendorEmail: "vendor@example.com",
      invoiceMongoId: "invoice-1",
    });
    expect(rows[0].items.create[0]).toMatchObject({
      productMongoId: "product-1",
      name: "Mirror Product",
      quantity: 2,
      price: "12.50",
      subtotal: "25.00",
      tax: "3.75",
    });
  });

  test("summarizes mirror counts for observability", () => {
    const sourceSummary = buildMirrorSummary(
      { _id: "order-1", total: 42.75, totalAfterDiscount: 40.25, discount: 2.5 },
      [
        { invoiceId: "invoice-1", products: [{}, {}] },
        { invoiceId: "invoice-2", products: [{}] },
      ]
    );

    expect(sourceSummary).toMatchObject({
      orderMongoId: "order-1",
      total: "42.75",
      totalAfterDiscount: "40.25",
      discount: "2.50",
      vendorCount: 2,
      itemCount: 3,
      invoiceCount: 2,
    });
  });

  test("reports summary discrepancies explicitly", () => {
    const discrepancies = compareMirrorSummary(
      {
        total: "42.75",
        totalAfterDiscount: "40.25",
        discount: "2.50",
        vendorCount: 2,
        itemCount: 3,
        invoiceCount: 2,
      },
      {
        total: "42.75",
        totalAfterDiscount: "39.00",
        discount: "2.50",
        vendorCount: 1,
        itemCount: 2,
        invoiceCount: 1,
      }
    );

    expect(discrepancies).toEqual(
      expect.arrayContaining([
        "totalAfterDiscount:40.25->39.00",
        "vendorCount:2->1",
        "itemCount:3->2",
        "invoiceCount:2->1",
      ])
    );
  });

  test("summarizes mirrored rows using stored observability counts", () => {
    const summary = summarizeMirroredOrder({
      mongoId: "order-2",
      total: "42.75",
      totalAfterDiscount: "40.25",
      discount: "2.50",
      vendorCount: 2,
      itemCount: 3,
      invoiceCount: 2,
      vendors: [
        { invoiceMongoId: "invoice-1", items: [{}, {}] },
        { invoiceMongoId: "invoice-2", items: [{}] },
      ],
    });

    expect(summary).toMatchObject({
      orderMongoId: "order-2",
      vendorCount: 2,
      itemCount: 3,
      invoiceCount: 2,
    });
  });
});
