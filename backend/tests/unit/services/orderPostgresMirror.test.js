const {
  buildMirrorPayload,
  buildMirrorSummary,
  buildVendorRows,
  compareAdminOrderListSummaryShadowParity,
  compareCanonicalIdentityCompleteness,
  compareCustomerOrderListSummaryShadowParity,
  compareOrderDetailShadowParity,
  compareMirrorSummary,
  compareVendorOrderListSummaryShadowParity,
  enrichVendorsWithCanonicalIdentity,
  resolveBuyerExternalId,
  resolveOrderExternalId,
  resolveOrdersPgMirrorMode,
  summarizeMirroredOrder,
} = require("../../../services/orderPostgresMirror");
const Order = require("../../../models/Order");
const Invoice = require("../../../models/Invoice");
const Product = require("../../../models/Product");
const User = require("../../../models/User");

describe("orderPostgresMirror", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
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
      vendorExternalId: null,
      vendorName: "Vendor One",
      vendorEmail: "vendor@example.com",
      invoiceMongoId: "invoice-1",
    });
    expect(rows[0].items.create[0]).toMatchObject({
      productMongoId: "product-1",
      productExternalId: null,
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

  test("enriches vendor/product/invoice canonical IDs from Mongo lookups", async () => {
    const userFindSpy = jest.spyOn(User, "find").mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: "vendor-1", externalId: "uid_11111111111111111111" }]),
      }),
    });
    const productFindSpy = jest.spyOn(Product, "find").mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: "product-1", externalId: "pid_11111111111111111111" }]),
      }),
    });
    const invoiceFindSpy = jest.spyOn(Invoice, "find").mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ _id: "invoice-1", externalId: "iid_11111111111111111111" }]),
      }),
    });

    const enriched = await enrichVendorsWithCanonicalIdentity([
      {
        vendorId: "vendor-1",
        invoiceId: "invoice-1",
        products: [{ product: "product-1", name: "Mirror Product", quantity: 1, price: 10 }],
      },
    ]);

    expect(userFindSpy).toHaveBeenCalledWith({ _id: { $in: ["vendor-1"] } });
    expect(productFindSpy).toHaveBeenCalledWith({ _id: { $in: ["product-1"] } });
    expect(invoiceFindSpy).toHaveBeenCalledWith({ _id: { $in: ["invoice-1"] } });
    expect(enriched[0].vendorExternalId).toBe("uid_11111111111111111111");
    expect(enriched[0].invoiceExternalId).toBe("iid_11111111111111111111");
    expect(enriched[0].products[0].productExternalId).toBe("pid_11111111111111111111");
  });

  test("buildVendorRows keeps canonical IDs additive and nullable", () => {
    const rows = buildVendorRows([
      {
        vendorId: "vendor-1",
        vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
        invoiceId: "invoice-1",
        invoiceExternalId: "iid_cccccccccccccccccccc",
        products: [
          {
            product: "product-1",
            productExternalId: "pid_bbbbbbbbbbbbbbbbbbbb",
            quantity: 1,
            price: 10,
          },
          {
            product: "product-2",
            productExternalId: "invalid",
            quantity: 1,
            price: 12,
          },
        ],
      },
    ]);

    expect(rows[0].vendorExternalId).toBe("uid_aaaaaaaaaaaaaaaaaaaa");
    expect(rows[0].invoiceExternalId).toBe("iid_cccccccccccccccccccc");
    expect(rows[0].items.create[0].productExternalId).toBe("pid_bbbbbbbbbbbbbbbbbbbb");
    expect(rows[0].items.create[1].productExternalId).toBeNull();
  });

  test("resolveBuyerExternalId prefers explicit canonical buyer ID", async () => {
    const findByIdSpy = jest.spyOn(User, "findById");

    const result = await resolveBuyerExternalId({
      buyer: "buyer-1",
      buyerExternalId: "UID_AAAAAAAAAAAAAAAAAAAA",
    });

    expect(result).toBe("uid_aaaaaaaaaaaaaaaaaaaa");
    expect(findByIdSpy).not.toHaveBeenCalled();
  });

  test("resolveBuyerExternalId falls back to buyer lookup when explicit value missing", async () => {
    const findByIdSpy = jest.spyOn(User, "findById").mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve({ _id: "buyer-1", externalId: "uid_cccccccccccccccccccc" }),
      }),
    });

    const result = await resolveBuyerExternalId({ buyer: "buyer-1" });

    expect(findByIdSpy).toHaveBeenCalledWith("buyer-1");
    expect(result).toBe("uid_cccccccccccccccccccc");
  });

  test("resolveOrderExternalId prefers explicit canonical order ID", async () => {
    const findByIdSpy = jest.spyOn(Order, "findById");

    const result = await resolveOrderExternalId({
      _id: "order-1",
      orderExternalId: "OID_AAAAAAAAAAAAAAAAAAAA",
    });

    expect(result).toBe("oid_aaaaaaaaaaaaaaaaaaaa");
    expect(findByIdSpy).not.toHaveBeenCalled();
  });

  test("resolveOrderExternalId falls back to order lookup when explicit value missing", async () => {
    const findByIdSpy = jest.spyOn(Order, "findById").mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve({ _id: "order-1", externalId: "oid_cccccccccccccccccccc" }),
      }),
    });

    const result = await resolveOrderExternalId({ _id: "order-1" });

    expect(findByIdSpy).toHaveBeenCalledWith("order-1");
    expect(result).toBe("oid_cccccccccccccccccccc");
  });

  test("buildMirrorPayload keeps buyer canonical ID additive with absence fallback", async () => {
    jest.spyOn(User, "findById").mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(null) }),
    });
    jest.spyOn(Order, "findById").mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(null) }),
    });

    const withExplicitBuyerId = await buildMirrorPayload(
      {
        _id: "order-1",
        orderExternalId: "oid_eeeeeeeeeeeeeeeeeeee",
        buyer: "buyer-1",
        buyerExternalId: "uid_dddddddddddddddddddd",
        total: 20,
        totalAfterDiscount: 18,
        discount: 2,
      },
      []
    );

    const withMissingBuyerId = await buildMirrorPayload(
      {
        _id: "order-2",
        buyer: "buyer-2",
        total: 20,
        totalAfterDiscount: 20,
        discount: 0,
      },
      []
    );

    expect(withExplicitBuyerId.data.buyerMongoId).toBe("buyer-1");
    expect(withExplicitBuyerId.data.buyerExternalId).toBe("uid_dddddddddddddddddddd");
    expect(withExplicitBuyerId.data.orderExternalId).toBe("oid_eeeeeeeeeeeeeeeeeeee");
    expect(withMissingBuyerId.data.buyerMongoId).toBe("buyer-2");
    expect(withMissingBuyerId.data.buyerExternalId).toBeNull();
    expect(withMissingBuyerId.data.orderExternalId).toBeNull();
  });

  test("compareCanonicalIdentityCompleteness reports strict source-to-mirror mismatches", () => {
    const discrepancies = compareCanonicalIdentityCompleteness(
      {
        orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
        buyerExternalId: "uid_bbbbbbbbbbbbbbbbbbbb",
        vendors: {
          create: [
            {
              vendorMongoId: "vendor-1",
              invoiceMongoId: "invoice-1",
              vendorExternalId: "uid_cccccccccccccccccccc",
              invoiceExternalId: "iid_dddddddddddddddddddd",
              items: {
                create: [
                  {
                    productMongoId: "product-1",
                    productExternalId: "pid_eeeeeeeeeeeeeeeeeeee",
                  },
                ],
              },
            },
          ],
        },
      },
      {
        orderExternalId: "oid_ffffffffffffffffffff",
        buyerExternalId: "uid_11111111111111111111",
        vendors: [
          {
            vendorMongoId: "vendor-1",
            invoiceMongoId: "invoice-1",
            vendorExternalId: "uid_22222222222222222222",
            invoiceExternalId: "iid_33333333333333333333",
            items: [
              {
                productMongoId: "product-1",
                productExternalId: "pid_44444444444444444444",
              },
            ],
          },
        ],
      }
    );

    expect(discrepancies).toEqual(
      expect.arrayContaining([
        "orderExternalId:oid_aaaaaaaaaaaaaaaaaaaa->oid_ffffffffffffffffffff",
        "buyerExternalId:uid_bbbbbbbbbbbbbbbbbbbb->uid_11111111111111111111",
        "vendor[0].vendorExternalId:uid_cccccccccccccccccccc->uid_22222222222222222222",
        "vendor[0].invoiceExternalId:iid_dddddddddddddddddddd->iid_33333333333333333333",
        "vendor[0].item[0].productExternalId:pid_eeeeeeeeeeeeeeeeeeee->pid_44444444444444444444",
      ])
    );
  });

  test("compareCanonicalIdentityCompleteness keeps nullable/additive absence behavior non-breaking", () => {
    const discrepancies = compareCanonicalIdentityCompleteness(
      {
        orderExternalId: null,
        buyerExternalId: null,
        vendors: {
          create: [
            {
              vendorMongoId: "vendor-1",
              invoiceMongoId: "invoice-1",
              vendorExternalId: null,
              invoiceExternalId: null,
              items: {
                create: [
                  {
                    productMongoId: "product-1",
                    productExternalId: null,
                  },
                ],
              },
            },
          ],
        },
      },
      {
        orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
        buyerExternalId: "uid_bbbbbbbbbbbbbbbbbbbb",
        vendors: [
          {
            vendorMongoId: "vendor-1",
            invoiceMongoId: "invoice-1",
            vendorExternalId: "uid_cccccccccccccccccccc",
            invoiceExternalId: "iid_dddddddddddddddddddd",
            items: [
              {
                productMongoId: "product-1",
                productExternalId: "pid_eeeeeeeeeeeeeeeeeeee",
              },
            ],
          },
        ],
      }
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareCanonicalIdentityCompleteness allows additive vendor invoice linkage when source invoice linkage is absent", () => {
    const discrepancies = compareCanonicalIdentityCompleteness(
      {
        orderExternalId: null,
        buyerExternalId: null,
        vendors: {
          create: [
            {
              vendorMongoId: "vendor-1",
              invoiceMongoId: null,
              vendorExternalId: null,
              invoiceExternalId: null,
              items: {
                create: [
                  {
                    productMongoId: "product-1",
                    productExternalId: null,
                  },
                ],
              },
            },
          ],
        },
      },
      {
        orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
        buyerExternalId: "uid_bbbbbbbbbbbbbbbbbbbb",
        vendors: [
          {
            vendorMongoId: "vendor-1",
            invoiceMongoId: "invoice-1",
            vendorExternalId: "uid_cccccccccccccccccccc",
            invoiceExternalId: "iid_dddddddddddddddddddd",
            items: [
              {
                productMongoId: "product-1",
                productExternalId: "pid_eeeeeeeeeeeeeeeeeeee",
              },
            ],
          },
        ],
      }
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareCanonicalIdentityCompleteness remains strict when source invoice linkage is present", () => {
    const discrepancies = compareCanonicalIdentityCompleteness(
      {
        orderExternalId: null,
        buyerExternalId: null,
        vendors: {
          create: [
            {
              vendorMongoId: "vendor-1",
              invoiceMongoId: "invoice-expected",
              vendorExternalId: null,
              invoiceExternalId: null,
              items: { create: [] },
            },
          ],
        },
      },
      {
        orderExternalId: null,
        buyerExternalId: null,
        vendors: [
          {
            vendorMongoId: "vendor-1",
            invoiceMongoId: "invoice-actual",
            vendorExternalId: null,
            invoiceExternalId: null,
            items: [],
          },
        ],
      }
    );

    expect(discrepancies).toEqual([
      "vendor[0]:missing->vendor-1::invoice-expected",
    ]);
  });

  test("compareOrderDetailShadowParity reports strict order-detail mismatches", () => {
    const discrepancies = compareOrderDetailShadowParity(
      {
        buyerMongoId: "buyer-1",
        orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
        buyerExternalId: "uid_bbbbbbbbbbbbbbbbbbbb",
        total: "100.00",
        totalAfterDiscount: "90.00",
        discount: "10.00",
        vendors: {
          create: [
            {
              vendorMongoId: "vendor-1",
              invoiceMongoId: "invoice-1",
              vendorExternalId: "uid_cccccccccccccccccccc",
              invoiceExternalId: "iid_dddddddddddddddddddd",
              subtotal: "80.00",
              discount: "5.00",
              tax: "8.00",
              shipping: "2.00",
              total: "85.00",
              items: {
                create: [
                  {
                    productMongoId: "product-1",
                    productExternalId: "pid_eeeeeeeeeeeeeeeeeeee",
                    quantity: 2,
                    price: "40.00",
                    subtotal: "80.00",
                    tax: "8.00",
                  },
                ],
              },
            },
          ],
        },
      },
      {
        mongoId: "order-actual",
        buyerMongoId: "buyer-2",
        orderExternalId: "oid_ffffffffffffffffffff",
        buyerExternalId: "uid_11111111111111111111",
        total: "101.00",
        totalAfterDiscount: "92.00",
        discount: "9.00",
        invoiceCount: 1,
        vendors: [
          {
            vendorMongoId: "vendor-1",
            invoiceMongoId: "invoice-1",
            vendorExternalId: "uid_22222222222222222222",
            invoiceExternalId: "iid_33333333333333333333",
            subtotal: "79.00",
            discount: "4.00",
            tax: "7.00",
            shipping: "1.00",
            total: "83.00",
            items: [
              {
                productMongoId: "product-1",
                productExternalId: "pid_44444444444444444444",
                quantity: 1,
                price: "39.00",
                subtotal: "79.00",
                tax: "7.00",
              },
            ],
          },
        ],
      },
      "order-expected"
    );

    expect(discrepancies).toEqual(
      expect.arrayContaining([
        "orderMongoId:order-expected->order-actual",
        "buyerMongoId:buyer-1->buyer-2",
          "total:100->101",
          "totalAfterDiscount:90->92",
          "discount:10->9",
        "orderExternalId:oid_aaaaaaaaaaaaaaaaaaaa->oid_ffffffffffffffffffff",
        "buyerExternalId:uid_bbbbbbbbbbbbbbbbbbbb->uid_11111111111111111111",
        "vendor[0].vendorExternalId:uid_cccccccccccccccccccc->uid_22222222222222222222",
        "vendor[0].invoiceExternalId:iid_dddddddddddddddddddd->iid_33333333333333333333",
        "vendor[0].item[0].productExternalId:pid_eeeeeeeeeeeeeeeeeeee->pid_44444444444444444444",
      ])
    );
  });

  test("compareOrderDetailShadowParity keeps additive invoice-link behavior non-breaking", () => {
    const discrepancies = compareOrderDetailShadowParity(
      {
        buyerMongoId: "buyer-1",
        orderExternalId: null,
        buyerExternalId: null,
        total: "100.00",
        totalAfterDiscount: "90.00",
        discount: "10.00",
        vendors: {
          create: [
            {
              vendorMongoId: "vendor-1",
              invoiceMongoId: null,
              vendorExternalId: null,
              invoiceExternalId: null,
              subtotal: "80.00",
              discount: "5.00",
              tax: "8.00",
              shipping: "2.00",
              total: "85.00",
              items: {
                create: [
                  {
                    productMongoId: "product-1",
                    productExternalId: null,
                    quantity: 2,
                    price: "40.00",
                    subtotal: "80.00",
                    tax: "8.00",
                  },
                ],
              },
            },
          ],
        },
      },
      {
        mongoId: "order-1",
        buyerMongoId: "buyer-1",
        orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
        buyerExternalId: "uid_bbbbbbbbbbbbbbbbbbbb",
        total: "100.00",
        totalAfterDiscount: "90.00",
        discount: "10.00",
        invoiceCount: 1,
        vendors: [
          {
            vendorMongoId: "vendor-1",
            invoiceMongoId: "invoice-1",
            vendorExternalId: "uid_cccccccccccccccccccc",
            invoiceExternalId: "iid_dddddddddddddddddddd",
            subtotal: "80.00",
            discount: "5.00",
            tax: "8.00",
            shipping: "2.00",
            total: "85.00",
            items: [
              {
                productMongoId: "product-1",
                productExternalId: "pid_eeeeeeeeeeeeeeeeeeee",
                quantity: 2,
                price: "40.00",
                subtotal: "80.00",
                tax: "8.00",
              },
            ],
          },
        ],
      },
      "order-1"
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareOrderDetailShadowParity enforces mirrored invoice-count invariant", () => {
    const discrepancies = compareOrderDetailShadowParity(
      {
        buyerMongoId: "buyer-1",
        orderExternalId: null,
        buyerExternalId: null,
        total: "100.00",
        totalAfterDiscount: "100.00",
        discount: "0.00",
        vendors: {
          create: [
            {
              vendorMongoId: "vendor-1",
              invoiceMongoId: null,
              subtotal: "100.00",
              discount: "0.00",
              tax: "0.00",
              shipping: "0.00",
              total: "100.00",
              items: { create: [] },
            },
          ],
        },
      },
      {
        mongoId: "order-1",
        buyerMongoId: "buyer-1",
        orderExternalId: null,
        buyerExternalId: null,
        total: "100.00",
        totalAfterDiscount: "100.00",
        discount: "0.00",
        invoiceCount: 0,
        vendors: [
          {
            vendorMongoId: "vendor-1",
            invoiceMongoId: "invoice-1",
            subtotal: "100.00",
            discount: "0.00",
            tax: "0.00",
            shipping: "0.00",
            total: "100.00",
            items: [],
          },
        ],
      },
      "order-1"
    );

    expect(discrepancies).toEqual(
      expect.arrayContaining([
        "invoiceCountInvariant:0->1",
      ])
    );
  });

  test("compareOrderDetailShadowParity normalizes numeric formatting and ignores non-contract item monetary fields", () => {
    const discrepancies = compareOrderDetailShadowParity(
      {
        buyerMongoId: "buyer-1",
        orderExternalId: null,
        buyerExternalId: null,
        total: "240.00",
        totalAfterDiscount: "240.00",
        discount: "0.00",
        vendors: {
          create: [
            {
              vendorMongoId: "vendor-1",
              invoiceMongoId: null,
              vendorExternalId: null,
              invoiceExternalId: null,
              subtotal: "200.00",
              discount: "0.00",
              tax: "30.00",
              shipping: "0.00",
              total: "240.00",
              items: {
                create: [
                  {
                    productMongoId: "product-1",
                    productExternalId: null,
                    quantity: 2,
                    price: "0.00",
                    subtotal: "0.00",
                    tax: "0.00",
                  },
                ],
              },
            },
          ],
        },
      },
      {
        mongoId: "order-1",
        buyerMongoId: "buyer-1",
        orderExternalId: null,
        buyerExternalId: null,
        total: 240,
        totalAfterDiscount: 240,
        discount: 0,
        invoiceCount: 1,
        vendors: [
          {
            vendorMongoId: "vendor-1",
            invoiceMongoId: "invoice-1",
            vendorExternalId: null,
            invoiceExternalId: null,
            subtotal: 200,
            discount: 0,
            tax: 30,
            shipping: 10,
            total: 240,
            items: [
              {
                productMongoId: "product-1",
                productExternalId: null,
                quantity: 2,
                price: 100,
                subtotal: 200,
                tax: 30,
              },
            ],
          },
        ],
      },
      "order-1"
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareCustomerOrderListSummaryShadowParity enforces covered-list ordering and summary field parity", () => {
    const discrepancies = compareCustomerOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          total: 100,
          totalAfterDiscount: 90,
          discount: 10,
          vendors: [{ products: [{}, {}] }],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          _id: "order-2",
          externalId: "oid_bbbbbbbbbbbbbbbbbbbb",
          buyer: "buyer-1",
          status: "delivered",
          currency: "USD",
          total: 50,
          totalAfterDiscount: 50,
          discount: 0,
          vendors: [{ products: [{}] }],
          createdAt: "2024-01-02T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_ffffffffffffffffffff",
          buyerMongoId: "buyer-2",
          status: "cancelled",
          currency: "ETB",
          total: 101,
          totalAfterDiscount: 91,
          discount: 9,
          vendorCount: 2,
          itemCount: 1,
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
        },
        {
          mongoId: "order-2",
          orderExternalId: "oid_bbbbbbbbbbbbbbbbbbbb",
          buyerMongoId: "buyer-1",
          status: "delivered",
          currency: "USD",
          total: 50,
          totalAfterDiscount: 50,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    );

    expect(discrepancies).toEqual(
      expect.arrayContaining([
        "ordering:order-2|order-1->order-1|order-2",
        "order[1].orderExternalId:oid_aaaaaaaaaaaaaaaaaaaa->oid_ffffffffffffffffffff",
        "order[1].buyerMongoId:buyer-1->buyer-2",
        "order[1].status:pending->cancelled",
        "order[1].currency:USD->ETB",
        "order[1].total:100->101",
        "order[1].totalAfterDiscount:90->91",
        "order[1].discount:10->9",
        "order[1].vendorCount:1->2",
        "order[1].itemCount:2->1",
      ])
    );
  });

  test("compareCustomerOrderListSummaryShadowParity keeps canonical order ID additive when source ID is absent", () => {
    const discrepancies = compareCustomerOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: null,
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          total: "100.00",
          totalAfterDiscount: "100.00",
          discount: "0.00",
          vendors: [{ products: [{}] }],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          buyerMongoId: "buyer-1",
          status: "pending",
          currency: "USD",
          total: 100,
          totalAfterDiscount: 100,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      "buyer-1"
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareCustomerOrderListSummaryShadowParity compares only covered list results", () => {
    const discrepancies = compareCustomerOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          total: 100,
          totalAfterDiscount: 100,
          discount: 0,
          vendors: [{ products: [{}] }],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          _id: "order-2",
          externalId: "oid_bbbbbbbbbbbbbbbbbbbb",
          buyer: "buyer-1",
          status: "delivered",
          currency: "USD",
          total: 50,
          totalAfterDiscount: 50,
          discount: 0,
          vendors: [{ products: [{}] }],
          createdAt: "2024-01-02T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          buyerMongoId: "buyer-1",
          status: "pending",
          currency: "USD",
          total: 100,
          totalAfterDiscount: 100,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          mongoId: "order-extra",
          orderExternalId: "oid_cccccccccccccccccccc",
          buyerMongoId: "buyer-1",
          status: "pending",
          currency: "USD",
          total: 10,
          totalAfterDiscount: 10,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
        },
      ],
      "buyer-1"
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareVendorOrderListSummaryShadowParity enforces covered-list ordering and vendor summary field parity", () => {
    const discrepancies = compareVendorOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          status: "pending",
          currency: "USD",
          createdAt: "2024-01-01T00:00:00.000Z",
          vendors: [
            {
              vendorId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "pending",
              currency: "USD",
              subtotal: 80,
              discount: 5,
              tax: 8,
              shipping: 2,
              total: 85,
              commissionAmount: 8.5,
              netEarnings: 76.5,
              products: [{}, {}],
            },
          ],
        },
        {
          _id: "order-2",
          externalId: "oid_bbbbbbbbbbbbbbbbbbbb",
          status: "delivered",
          currency: "USD",
          createdAt: "2024-01-02T00:00:00.000Z",
          vendors: [
            {
              vendorId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "delivered",
              currency: "USD",
              subtotal: 50,
              discount: 0,
              tax: 5,
              shipping: 1,
              total: 56,
              commissionAmount: 5.6,
              netEarnings: 50.4,
              products: [{}],
            },
          ],
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_ffffffffffffffffffff",
          status: "pending",
          currency: "USD",
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
          vendors: [
            {
              vendorMongoId: "vendor-1",
              vendorExternalId: "uid_bbbbbbbbbbbbbbbbbbbb",
              status: "cancelled",
              currency: "ETB",
              subtotal: 81,
              discount: 4,
              tax: 9,
              shipping: 1,
              total: 87,
              commissionAmount: 9,
              netEarnings: 78,
              items: [{}],
            },
          ],
        },
        {
          mongoId: "order-2",
          orderExternalId: "oid_bbbbbbbbbbbbbbbbbbbb",
          status: "delivered",
          currency: "USD",
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
          vendors: [
            {
              vendorMongoId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "delivered",
              currency: "USD",
              subtotal: 50,
              discount: 0,
              tax: 5,
              shipping: 1,
              total: 56,
              commissionAmount: 5.6,
              netEarnings: 50.4,
              items: [{}],
            },
          ],
        },
      ],
      "vendor-1"
    );

    expect(discrepancies).toEqual(
      expect.arrayContaining([
        "ordering:order-2|order-1->order-1|order-2",
        "order[1].orderExternalId:oid_aaaaaaaaaaaaaaaaaaaa->oid_ffffffffffffffffffff",
        "order[1].vendorExternalId:uid_aaaaaaaaaaaaaaaaaaaa->uid_bbbbbbbbbbbbbbbbbbbb",
        "order[1].status:pending->cancelled",
        "order[1].currency:USD->ETB",
        "order[1].subtotal:80->81",
        "order[1].discount:5->4",
        "order[1].tax:8->9",
        "order[1].shipping:2->1",
        "order[1].total:85->87",
        "order[1].commissionAmount:8.5->9",
        "order[1].netEarnings:76.5->78",
        "order[1].itemCount:2->1",
      ])
    );
  });

  test("compareVendorOrderListSummaryShadowParity keeps canonical vendor ID additive when source ID is absent", () => {
    const discrepancies = compareVendorOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: null,
          status: "pending",
          currency: "USD",
          createdAt: "2024-01-01T00:00:00.000Z",
          vendors: [
            {
              vendorId: "vendor-1",
              vendorExternalId: null,
              status: "pending",
              currency: "USD",
              subtotal: 80,
              discount: 5,
              tax: 8,
              shipping: 2,
              total: 85,
              commissionAmount: 8.5,
              netEarnings: 76.5,
              products: [{}, {}],
            },
          ],
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          status: "pending",
          currency: "USD",
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
          vendors: [
            {
              vendorMongoId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "pending",
              currency: "USD",
              subtotal: 80,
              discount: 5,
              tax: 8,
              shipping: 2,
              total: 85,
              commissionAmount: 8.5,
              netEarnings: 76.5,
              items: [{}, {}],
            },
          ],
        },
      ],
      "vendor-1"
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareVendorOrderListSummaryShadowParity derives source shipping when legacy source vendor field is absent", () => {
    const discrepancies = compareVendorOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          status: "pending",
          currency: "USD",
          createdAt: "2024-01-01T00:00:00.000Z",
          vendors: [
            {
              vendorId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "pending",
              currency: "USD",
              subtotal: 80,
              discount: 0,
              tax: 8,
              total: 98,
              commissionAmount: 8.5,
              netEarnings: 89.5,
              products: [{}, {}],
            },
          ],
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          status: "pending",
          currency: "USD",
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
          vendors: [
            {
              vendorMongoId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "pending",
              currency: "USD",
              subtotal: 80,
              discount: 0,
              tax: 8,
              shipping: 10,
              total: 98,
              commissionAmount: 8.5,
              netEarnings: 89.5,
              items: [{}, {}],
            },
          ],
        },
      ],
      "vendor-1"
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareVendorOrderListSummaryShadowParity compares only covered list results", () => {
    const discrepancies = compareVendorOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          status: "pending",
          currency: "USD",
          createdAt: "2024-01-01T00:00:00.000Z",
          vendors: [
            {
              vendorId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "pending",
              currency: "USD",
              subtotal: 80,
              discount: 5,
              tax: 8,
              shipping: 2,
              total: 85,
              commissionAmount: 8.5,
              netEarnings: 76.5,
              products: [{}, {}],
            },
          ],
        },
        {
          _id: "order-2",
          externalId: "oid_bbbbbbbbbbbbbbbbbbbb",
          status: "pending",
          currency: "USD",
          createdAt: "2024-01-02T00:00:00.000Z",
          vendors: [
            {
              vendorId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "pending",
              currency: "USD",
              subtotal: 60,
              discount: 0,
              tax: 6,
              shipping: 1,
              total: 67,
              commissionAmount: 6.7,
              netEarnings: 60.3,
              products: [{}],
            },
          ],
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          status: "pending",
          currency: "USD",
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
          vendors: [
            {
              vendorMongoId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "pending",
              currency: "USD",
              subtotal: 80,
              discount: 5,
              tax: 8,
              shipping: 2,
              total: 85,
              commissionAmount: 8.5,
              netEarnings: 76.5,
              items: [{}, {}],
            },
          ],
        },
        {
          mongoId: "order-extra",
          orderExternalId: "oid_cccccccccccccccccccc",
          status: "pending",
          currency: "USD",
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
          vendors: [
            {
              vendorMongoId: "vendor-1",
              vendorExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
              status: "pending",
              currency: "USD",
              subtotal: 10,
              discount: 0,
              tax: 1,
              shipping: 0,
              total: 11,
              commissionAmount: 1.1,
              netEarnings: 9.9,
              items: [{}],
            },
          ],
        },
      ],
      "vendor-1"
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareAdminOrderListSummaryShadowParity enforces covered-list ordering and admin summary parity", () => {
    const discrepancies = compareAdminOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 75,
          discount: 5,
          vendors: [{ products: [{}], invoiceId: "inv-1" }],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          _id: "order-2",
          externalId: "oid_bbbbbbbbbbbbbbbbbbbb",
          buyer: "buyer-2",
          status: "delivered",
          currency: "USD",
          paymentMethod: "stripe",
          total: 40,
          totalAfterDiscount: 40,
          discount: 0,
          vendors: [{ products: [{}] }],
          createdAt: "2024-01-02T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_ffffffffffffffffffff",
          buyerMongoId: "buyer-x",
          buyerExternalId: "uid_bbbbbbbbbbbbbbbbbbbb",
          status: "cancelled",
          currency: "ETB",
          paymentMethod: "telebirr",
          total: 81,
          totalAfterDiscount: 76,
          discount: 4,
          vendorCount: 2,
          itemCount: 2,
          invoiceCount: 2,
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
        },
        {
          mongoId: "order-2",
          orderExternalId: "oid_bbbbbbbbbbbbbbbbbbbb",
          buyerMongoId: "buyer-2",
          buyerExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
          status: "delivered",
          currency: "USD",
          paymentMethod: "stripe",
          total: 40,
          totalAfterDiscount: 40,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]
    );

    expect(discrepancies).toEqual(
      expect.arrayContaining([
        "ordering:order-2|order-1->order-1|order-2",
        "order[1].orderExternalId:oid_aaaaaaaaaaaaaaaaaaaa->oid_ffffffffffffffffffff",
        "order[1].buyerMongoId:buyer-1->buyer-x",
        "order[1].status:pending->cancelled",
        "order[1].currency:USD->ETB",
        "order[1].paymentMethod:cod->telebirr",
        "order[1].total:80->81",
        "order[1].totalAfterDiscount:75->76",
        "order[1].discount:5->4",
        "order[1].vendorCount:1->2",
        "order[1].itemCount:1->2",
        "order[1].invoiceCount:1->2",
      ])
    );
  });

  test("compareAdminOrderListSummaryShadowParity keeps canonical IDs additive when source canonical IDs are absent", () => {
    const discrepancies = compareAdminOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: null,
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendors: [{ products: [{}], invoiceId: "inv-1" }],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          buyerMongoId: "buyer-1",
          buyerExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 1,
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareAdminOrderListSummaryShadowParity compares only covered list results", () => {
    const discrepancies = compareAdminOrderListSummaryShadowParity(
      [
        {
          _id: "order-1",
          externalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendors: [{ products: [{}], invoiceId: "inv-1" }],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          _id: "order-2",
          externalId: "oid_bbbbbbbbbbbbbbbbbbbb",
          buyer: "buyer-2",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 40,
          totalAfterDiscount: 40,
          discount: 0,
          vendors: [{ products: [{}] }],
          createdAt: "2024-01-02T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          buyerMongoId: "buyer-1",
          buyerExternalId: "uid_aaaaaaaaaaaaaaaaaaaa",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 1,
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          mongoId: "order-extra",
          orderExternalId: "oid_cccccccccccccccccccc",
          buyerMongoId: "buyer-x",
          buyerExternalId: "uid_cccccccccccccccccccc",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 12,
          totalAfterDiscount: 12,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
        },
      ]
    );

    expect(discrepancies).toEqual([]);
  });
});
