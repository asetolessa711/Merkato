const {
  buildMirrorPayload,
  buildMirrorSummary,
  buildVendorRows,
  compareAdminOrderListQuerySemanticsShadowParity,
  compareAdminOrderListSummaryShadowParity,
  compareCanonicalIdentityCompleteness,
  compareCustomerOrderListSummaryShadowParity,
  compareOrderDetailShadowParity,
  evaluateCustomerOrderHistoryServingExperimentReadiness,
  evaluateCustomerOrderHistoryRuntimeShadowVerification,
  evaluateAdminOrderListServingExperimentReadiness,
  evaluateAdminOrderListRuntimeShadowVerification,
  compareMirrorSummary,
  compareVendorOrderListSummaryShadowParity,
  enrichVendorsWithCanonicalIdentity,
  resolveAdminOrderListServingExperimentControls,
  resolveCustomerOrderHistoryServingExperimentControls,
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

  test("resolveAdminOrderListServingExperimentControls defaults to fail-closed legacy behavior", () => {
    delete process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_GATE;
    delete process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_KILL_SWITCH;

    const controls = resolveAdminOrderListServingExperimentControls();

    expect(controls).toMatchObject({
      gate: "off",
      gateEnabled: false,
      killSwitchActive: false,
      failClosedDefaultLegacy: true,
    });
    expect(controls.latencyGuards.maxSourceMirrorDeltaMs).toBeGreaterThan(0);
    expect(controls.latencyGuards.maxComparatorMs).toBeGreaterThan(0);
  });

  test("resolveAdminOrderListServingExperimentControls falls back to off for invalid experiment gate", () => {
    process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_GATE = "invalid_gate";

    const controls = resolveAdminOrderListServingExperimentControls();

    expect(controls.gate).toBe("off");
    expect(controls.gateEnabled).toBe(false);
  });

  test("resolveCustomerOrderHistoryServingExperimentControls defaults to fail-closed legacy behavior", () => {
    delete process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_GATE;
    delete process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_KILL_SWITCH;

    const controls = resolveCustomerOrderHistoryServingExperimentControls();

    expect(controls).toMatchObject({
      gate: "off",
      gateEnabled: false,
      killSwitchActive: false,
      failClosedDefaultLegacy: true,
    });
    expect(controls.latencyGuards.maxSourceMirrorDeltaMs).toBeGreaterThan(0);
    expect(controls.latencyGuards.maxComparatorMs).toBeGreaterThan(0);
  });

  test("resolveCustomerOrderHistoryServingExperimentControls falls back to off for invalid experiment gate", () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_GATE = "invalid_gate";

    const controls = resolveCustomerOrderHistoryServingExperimentControls();

    expect(controls.gate).toBe("off");
    expect(controls.gateEnabled).toBe(false);
  });

  test("resolveCustomerOrderHistoryServingExperimentControls resolves bounded in-window controls", () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_START_AT = "2026-04-10T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_END_AT = "2026-04-20T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_NOW_AT = "2026-04-12T12:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_APPROVED_ENVIRONMENT_ID = "promo-west-1";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_ENVIRONMENT_ID = "promo-west-1";

    const controls = resolveCustomerOrderHistoryServingExperimentControls();

    expect(controls.promotionWindow).toMatchObject({
      status: "in-window",
      inWindow: true,
      postWindow: false,
      approvedPromotionEnvironmentId: "promo-west-1",
      promotionEnvironmentId: "promo-west-1",
      startAt: "2026-04-10T00:00:00.000Z",
      endAt: "2026-04-20T00:00:00.000Z",
    });
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

  test("compareAdminOrderListSummaryShadowParity uses explicit source invoiceCount when vendor invoice links are absent", () => {
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
          vendors: [{ products: [{}] }],
          invoiceCount: 1,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
          buyerMongoId: "buyer-1",
          buyerExternalId: null,
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

  test("compareAdminOrderListQuerySemanticsShadowParity validates status/date-range/sort/pagination windows", () => {
    const discrepancies = compareAdminOrderListQuerySemanticsShadowParity(
      [
        {
          _id: "order-1",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendors: [{ products: [{}], invoiceId: "inv-1" }],
          createdAt: "2024-01-03T00:00:00.000Z",
        },
        {
          _id: "order-2",
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
        {
          _id: "order-3",
          buyer: "buyer-3",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 20,
          totalAfterDiscount: 20,
          discount: 0,
          vendors: [{ products: [{}] }],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          buyerMongoId: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 1,
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
        },
        {
          mongoId: "order-2",
          buyerMongoId: "buyer-2",
          status: "delivered",
          currency: "USD",
          paymentMethod: "stripe",
          total: 40,
          totalAfterDiscount: 40,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-02T00:00:00.000Z",
        },
        {
          mongoId: "order-3",
          buyerMongoId: "buyer-3",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 20,
          totalAfterDiscount: 20,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]
    );

    expect(discrepancies).toEqual([]);
  });

  test("compareAdminOrderListQuerySemanticsShadowParity reports query-semantics mismatches", () => {
    const discrepancies = compareAdminOrderListQuerySemanticsShadowParity(
      [
        {
          _id: "order-1",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendors: [{ products: [{}], invoiceId: "inv-1" }],
          createdAt: "2024-01-03T00:00:00.000Z",
        },
        {
          _id: "order-2",
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
        {
          _id: "order-3",
          buyer: "buyer-3",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 20,
          totalAfterDiscount: 20,
          discount: 0,
          vendors: [{ products: [{}] }],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          buyerMongoId: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 1,
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
        },
        {
          mongoId: "order-2",
          buyerMongoId: "buyer-2",
          status: "pending",
          currency: "USD",
          paymentMethod: "stripe",
          total: 40,
          totalAfterDiscount: 40,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-02T00:00:00.000Z",
        },
        {
          mongoId: "order-3",
          buyerMongoId: "buyer-3",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 20,
          totalAfterDiscount: 20,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]
    );

    expect(discrepancies.some((entry) => entry.includes("status-delivered") && entry.includes(".total:1->0"))).toBe(true);
  });

  test("compareAdminOrderListQuerySemanticsShadowParity compares only covered list results", () => {
    const discrepancies = compareAdminOrderListQuerySemanticsShadowParity(
      [
        {
          _id: "order-1",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendors: [{ products: [{}], invoiceId: "inv-1" }],
          createdAt: "2024-01-03T00:00:00.000Z",
        },
        {
          _id: "order-2",
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
          buyerMongoId: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 1,
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
        },
        {
          mongoId: "order-extra",
          buyerMongoId: "buyer-x",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 12,
          totalAfterDiscount: 12,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-04T00:00:00.000Z",
        },
      ]
    );

    expect(discrepancies).toEqual([]);
  });

  test("evaluateCustomerOrderHistoryRuntimeShadowVerification reports match for covered alias and ownership window", () => {
    const result = evaluateCustomerOrderHistoryRuntimeShadowVerification(
      [
        {
          _id: "order-1",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          total: 20,
          totalAfterDiscount: 20,
          discount: 0,
          vendors: [{ products: [{}] }],
          createdAt: "2024-02-02T00:00:00.000Z",
        },
        {
          _id: "order-2",
          buyer: "buyer-1",
          status: "delivered",
          currency: "USD",
          total: 40,
          totalAfterDiscount: 35,
          discount: 5,
          vendors: [{ products: [{}, {}] }],
          createdAt: "2024-02-01T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          buyerMongoId: "buyer-1",
          status: "pending",
          currency: "USD",
          total: 20,
          totalAfterDiscount: 20,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          sourceCreatedAt: "2024-02-02T00:00:00.000Z",
          vendors: [{ items: [{}] }],
        },
        {
          mongoId: "order-2",
          buyerMongoId: "buyer-1",
          status: "delivered",
          currency: "USD",
          total: 40,
          totalAfterDiscount: 35,
          discount: 5,
          vendorCount: 1,
          itemCount: 2,
          sourceCreatedAt: "2024-02-01T00:00:00.000Z",
          vendors: [{ items: [{}, {}] }],
        },
      ],
      { buyerMongoId: "buyer-1", aliasPath: "/my-orders" }
    );

    expect(result.match).toBe(true);
    expect(result.mismatchClass).toBeNull();
    expect(result.comparatorConfidence).toBe("high");
    expect(result.discrepancies).toEqual([]);
    expect(result.sourceResult.ids).toEqual(["order-1", "order-2"]);
    expect(result.mirroredResult.ids).toEqual(["order-1", "order-2"]);
  });

  test("evaluateCustomerOrderHistoryRuntimeShadowVerification classifies ownership mismatch", () => {
    const result = evaluateCustomerOrderHistoryRuntimeShadowVerification(
      [
        {
          _id: "order-1",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          total: 20,
          totalAfterDiscount: 20,
          discount: 0,
          vendors: [{ products: [{}] }],
          createdAt: "2024-02-02T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-1",
          buyerMongoId: "buyer-2",
          status: "pending",
          currency: "USD",
          total: 20,
          totalAfterDiscount: 20,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          sourceCreatedAt: "2024-02-02T00:00:00.000Z",
          vendors: [{ items: [{}] }],
        },
      ],
      { buyerMongoId: "buyer-1", aliasPath: "/my" }
    );

    expect(result.match).toBe(false);
    expect(result.mismatchClass).toBe("ownership-mismatch");
    expect(result.discrepancies).toEqual(
      expect.arrayContaining([
        expect.stringContaining("ownership.mirror.out-of-scope-count"),
      ])
    );
  });

  test("evaluateCustomerOrderHistoryRuntimeShadowVerification classifies alias-contract drift for unsupported alias", () => {
    const result = evaluateCustomerOrderHistoryRuntimeShadowVerification(
      [],
      [],
      { buyerMongoId: "buyer-1", aliasPath: "/orders/history" }
    );

    expect(result.match).toBe(false);
    expect(result.mismatchClass).toBe("alias-contract-drift");
    expect(result.discrepancies).toEqual(
      expect.arrayContaining([
        expect.stringContaining("alias.contract.unsupported:/orders/history"),
      ])
    );
  });

  test("evaluateCustomerOrderHistoryServingExperimentReadiness blocks when gate is off", () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_GATE = "off";

    const readiness = evaluateCustomerOrderHistoryServingExperimentReadiness({
      runtimeParity: {
        match: true,
        mismatchClass: null,
        comparatorConfidence: "high",
        discrepancies: [],
        coverage: { sourceCount: 2, mirroredCount: 2, coveredCount: 2 },
        queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my-orders" },
        runtimeLatencyMs: { sourceQuery: 12, mirrorQuery: 11, comparator: 3, sourceMirrorDelta: 1 },
      },
      aliasPath: "/my-orders",
    });

    expect(readiness.eligible).toBe(false);
    expect(readiness.blocked).toBe(true);
    expect(readiness.blockedReasons).toContain("gate-disabled");
    expect(readiness.servingPathDecision).toBe("blocked-legacy-only");
  });

  test("evaluateCustomerOrderHistoryServingExperimentReadiness blocks when kill switch is active", () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_GATE = "ready";
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_KILL_SWITCH = "true";

    const readiness = evaluateCustomerOrderHistoryServingExperimentReadiness({
      runtimeParity: {
        match: true,
        mismatchClass: null,
        comparatorConfidence: "high",
        discrepancies: [],
        coverage: { sourceCount: 2, mirroredCount: 2, coveredCount: 2 },
        queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my" },
        runtimeLatencyMs: { sourceQuery: 14, mirrorQuery: 10, comparator: 2, sourceMirrorDelta: 4 },
      },
      aliasPath: "/my",
    });

    expect(readiness.eligible).toBe(false);
    expect(readiness.blockedReasons).toContain("kill-switch-active");
    expect(readiness.failClosedDefaultLegacy).toBe(true);
  });

  test("evaluateCustomerOrderHistoryServingExperimentReadiness blocks when telemetry integrity is degraded", () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_GATE = "ready";
    delete process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_KILL_SWITCH;

    const readiness = evaluateCustomerOrderHistoryServingExperimentReadiness({
      runtimeParity: {
        match: false,
        mismatchClass: "coverage-gap",
        comparatorConfidence: "low",
        discrepancies: [],
        coverage: { sourceCount: 1, mirroredCount: 1, coveredCount: 0 },
        queryContract: null,
        runtimeLatencyMs: null,
      },
      aliasPath: "/my-orders",
    });

    expect(readiness.eligible).toBe(false);
    expect(readiness.blockedReasons).toEqual(
      expect.arrayContaining([
        "telemetry-health-degraded",
        "coverage-gap",
        "mismatch-class-coverage-gap",
      ])
    );
    expect(readiness.signals.comparatorHealth).toBe("healthy");
    expect(readiness.signals.telemetryHealth).toBe("degraded");
  });

  test("evaluateCustomerOrderHistoryServingExperimentReadiness fails closed on comparator/runtime error", () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_GATE = "ready";
    delete process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_KILL_SWITCH;
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_START_AT = "2026-04-10T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_END_AT = "2026-04-20T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_NOW_AT = "2026-04-12T12:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_APPROVED_ENVIRONMENT_ID = "promo-west-1";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_ENVIRONMENT_ID = "promo-west-1";

    const readiness = evaluateCustomerOrderHistoryServingExperimentReadiness({
      runtimeParity: null,
      comparatorError: "forced-customer-comparator-failure",
      aliasPath: "/my",
    });

    expect(readiness.eligible).toBe(false);
    expect(readiness.blocked).toBe(true);
    expect(readiness.blockedReasons).toEqual(
      expect.arrayContaining([
        "comparator-error",
        "telemetry-health-degraded",
        "comparator-health-degraded",
        "no-runtime-parity-signal",
      ])
    );
    expect(readiness.servingPathDecision).toBe("blocked-legacy-only");
  });

  test("evaluateCustomerOrderHistoryServingExperimentReadiness keeps alias classification consistent for /my-orders and /my", () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_GATE = "ready";
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_KILL_SWITCH = "false";
    process.env.CUSTOMER_ORDER_HISTORY_PG_READINESS_MAX_SOURCE_MIRROR_DELTA_MS = "50";
    process.env.CUSTOMER_ORDER_HISTORY_PG_READINESS_MAX_COMPARATOR_MS = "50";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_START_AT = "2026-04-10T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_END_AT = "2026-04-20T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_NOW_AT = "2026-04-12T12:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_APPROVED_ENVIRONMENT_ID = "promo-west-1";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_ENVIRONMENT_ID = "promo-west-1";

    const baselineRuntimeParity = {
      match: true,
      mismatchClass: null,
      comparatorConfidence: "high",
      discrepancies: [],
      coverage: { sourceCount: 3, mirroredCount: 3, coveredCount: 3 },
      runtimeLatencyMs: { sourceQuery: 20, mirrorQuery: 18, comparator: 6, sourceMirrorDelta: 2 },
    };

    const myOrdersReadiness = evaluateCustomerOrderHistoryServingExperimentReadiness({
      runtimeParity: {
        ...baselineRuntimeParity,
        queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my-orders" },
      },
      aliasPath: "/my-orders",
    });

    const myAliasReadiness = evaluateCustomerOrderHistoryServingExperimentReadiness({
      runtimeParity: {
        ...baselineRuntimeParity,
        queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my" },
      },
      aliasPath: "/my",
    });

    expect(myOrdersReadiness.eligible).toBe(true);
    expect(myAliasReadiness.eligible).toBe(true);
    expect(myOrdersReadiness.blocked).toBe(false);
    expect(myAliasReadiness.blocked).toBe(false);
    expect(myOrdersReadiness.blockedReasons).toEqual([]);
    expect(myAliasReadiness.blockedReasons).toEqual([]);
    expect(myOrdersReadiness.servingPathDecision).toBe("eligible-for-future-experiment");
    expect(myAliasReadiness.servingPathDecision).toBe("eligible-for-future-experiment");
  });

  test("evaluateCustomerOrderHistoryServingExperimentReadiness blocks outside bounded promotion window", () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_GATE = "ready";
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_KILL_SWITCH = "false";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_START_AT = "2026-04-10T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_END_AT = "2026-04-20T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_NOW_AT = "2026-04-21T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_APPROVED_ENVIRONMENT_ID = "promo-west-1";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_ENVIRONMENT_ID = "promo-west-1";

    const readiness = evaluateCustomerOrderHistoryServingExperimentReadiness({
      runtimeParity: {
        match: true,
        mismatchClass: null,
        comparatorConfidence: "high",
        discrepancies: [],
        coverage: { sourceCount: 3, mirroredCount: 3, coveredCount: 3 },
        queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my-orders" },
        runtimeLatencyMs: { sourceQuery: 20, mirrorQuery: 18, comparator: 6, sourceMirrorDelta: 2 },
      },
      aliasPath: "/my-orders",
    });

    expect(readiness.eligible).toBe(false);
    expect(readiness.blocked).toBe(true);
    expect(readiness.blockedReasons).toEqual(
      expect.arrayContaining(["outside-promotion-window"])
    );
    expect(readiness.signals.promotionWindow.status).toBe("post-window");
    expect(readiness.servingPathDecision).toBe("blocked-legacy-only-post-window-non-go");
  });

  test("evaluateCustomerOrderHistoryServingExperimentReadiness enforces post-window non-GO legacy fallback", () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_GATE = "ready";
    process.env.CUSTOMER_ORDER_HISTORY_PG_SERVING_EXPERIMENT_KILL_SWITCH = "false";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_START_AT = "2026-04-10T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_END_AT = "2026-04-20T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_NOW_AT = "2026-04-21T00:00:00.000Z";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_APPROVED_ENVIRONMENT_ID = "promo-west-1";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_ENVIRONMENT_ID = "promo-west-1";
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_WINDOW_GO_APPROVED = "false";

    const readiness = evaluateCustomerOrderHistoryServingExperimentReadiness({
      runtimeParity: {
        match: true,
        mismatchClass: null,
        comparatorConfidence: "high",
        discrepancies: [],
        coverage: { sourceCount: 2, mirroredCount: 2, coveredCount: 2 },
        queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my" },
        runtimeLatencyMs: { sourceQuery: 18, mirrorQuery: 16, comparator: 4, sourceMirrorDelta: 2 },
      },
      aliasPath: "/my",
    });

    expect(readiness.eligible).toBe(false);
    expect(readiness.blockedReasons).toEqual(
      expect.arrayContaining(["post-window-non-go-default-legacy", "outside-promotion-window"])
    );
    expect(readiness.servingPathDecision).toBe("blocked-legacy-only-post-window-non-go");
  });

  test("evaluateAdminOrderListRuntimeShadowVerification reports match with high confidence when covered window parity holds", () => {
    const result = evaluateAdminOrderListRuntimeShadowVerification(
      [
        {
          _id: "order-1",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendors: [{ products: [{}], invoiceId: "inv-1" }],
          createdAt: "2024-01-03T00:00:00.000Z",
        },
        {
          _id: "order-2",
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
          buyerMongoId: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 1,
          sourceCreatedAt: "2024-01-03T00:00:00.000Z",
        },
        {
          mongoId: "order-2",
          buyerMongoId: "buyer-2",
          status: "delivered",
          currency: "USD",
          paymentMethod: "stripe",
          total: 40,
          totalAfterDiscount: 40,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
      {
        status: "pending",
        page: 1,
        limit: 10,
      }
    );

    expect(result.match).toBe(true);
    expect(result.mismatchClass).toBeNull();
    expect(result.comparatorConfidence).toBe("high");
    expect(result.coverage).toEqual({ sourceCount: 2, mirroredCount: 2, coveredCount: 2 });
    expect(result.discrepancies).toEqual([]);
    expect(result.sourceResult.ids).toEqual(["order-1"]);
    expect(result.mirroredResult.ids).toEqual(["order-1"]);
  });

  test("evaluateAdminOrderListRuntimeShadowVerification classifies query semantics mismatch for live window drift", () => {
    const result = evaluateAdminOrderListRuntimeShadowVerification(
      [
        {
          _id: "order-1",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendors: [{ products: [{}], invoiceId: "inv-1" }],
          createdAt: "2024-01-03T00:00:00.000Z",
        },
        {
          _id: "order-2",
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
          buyerMongoId: "buyer-1",
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
          mongoId: "order-2",
          buyerMongoId: "buyer-2",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 40,
          totalAfterDiscount: 40,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-02T00:00:00.000Z",
        },
      ],
      {
        status: "pending",
        page: 1,
        limit: 1,
      }
    );

    expect(result.match).toBe(false);
    expect(result.mismatchClass).toBe("query-semantics-mismatch");
    expect(result.comparatorConfidence).toBe("high");
    expect(result.discrepancies).toEqual(
      expect.arrayContaining([
        expect.stringContaining("runtime.query.window:"),
      ])
    );
  });

  test("evaluateAdminOrderListRuntimeShadowVerification classifies coverage gap when no mirrored overlap exists", () => {
    const result = evaluateAdminOrderListRuntimeShadowVerification(
      [
        {
          _id: "order-1",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 80,
          totalAfterDiscount: 80,
          discount: 0,
          vendors: [{ products: [{}], invoiceId: "inv-1" }],
          createdAt: "2024-01-03T00:00:00.000Z",
        },
      ],
      [
        {
          mongoId: "order-other",
          buyerMongoId: "buyer-x",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: 10,
          totalAfterDiscount: 10,
          discount: 0,
          vendorCount: 1,
          itemCount: 1,
          invoiceCount: 0,
          sourceCreatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      {
        page: 1,
        limit: 10,
      }
    );

    expect(result.match).toBe(false);
    expect(result.mismatchClass).toBe("coverage-gap");
    expect(result.comparatorConfidence).toBe("low");
    expect(result.coverage).toEqual({ sourceCount: 1, mirroredCount: 1, coveredCount: 0 });
    expect(result.discrepancies).toEqual([]);
  });

  test("evaluateAdminOrderListServingExperimentReadiness blocks when gate is off", () => {
    process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_GATE = "off";

    const readiness = evaluateAdminOrderListServingExperimentReadiness({
      runtimeParity: {
        match: true,
        mismatchClass: null,
        comparatorConfidence: "high",
        discrepancies: [],
        coverage: { sourceCount: 3, mirroredCount: 3, coveredCount: 3 },
        queryContract: { status: "pending", page: 1, limit: 10 },
        runtimeLatencyMs: { sourceQuery: 12, mirrorQuery: 11, comparator: 3, sourceMirrorDelta: 1 },
      },
    });

    expect(readiness.eligible).toBe(false);
    expect(readiness.blocked).toBe(true);
    expect(readiness.blockedReasons).toContain("gate-disabled");
    expect(readiness.servingPathDecision).toBe("blocked-legacy-only");
  });

  test("evaluateAdminOrderListServingExperimentReadiness blocks when kill switch is active", () => {
    process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_GATE = "ready";
    process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_KILL_SWITCH = "true";

    const readiness = evaluateAdminOrderListServingExperimentReadiness({
      runtimeParity: {
        match: true,
        mismatchClass: null,
        comparatorConfidence: "high",
        discrepancies: [],
        coverage: { sourceCount: 2, mirroredCount: 2, coveredCount: 2 },
        queryContract: { status: null, page: 1, limit: 20 },
        runtimeLatencyMs: { sourceQuery: 14, mirrorQuery: 10, comparator: 2, sourceMirrorDelta: 4 },
      },
    });

    expect(readiness.eligible).toBe(false);
    expect(readiness.blockedReasons).toContain("kill-switch-active");
    expect(readiness.failClosedDefaultLegacy).toBe(true);
  });

  test("evaluateAdminOrderListServingExperimentReadiness blocks when telemetry integrity is degraded", () => {
    process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_GATE = "ready";
    delete process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_KILL_SWITCH;

    const readiness = evaluateAdminOrderListServingExperimentReadiness({
      runtimeParity: {
        match: false,
        mismatchClass: "coverage-gap",
        comparatorConfidence: "low",
        discrepancies: [],
        coverage: { sourceCount: 1, mirroredCount: 1, coveredCount: 0 },
        queryContract: null,
        runtimeLatencyMs: null,
      },
    });

    expect(readiness.eligible).toBe(false);
    expect(readiness.blockedReasons).toEqual(
      expect.arrayContaining([
        "telemetry-health-degraded",
        "coverage-gap",
        "mismatch-class-coverage-gap",
      ])
    );
    expect(readiness.signals.comparatorHealth).toBe("healthy");
    expect(readiness.signals.telemetryHealth).toBe("degraded");
  });

  test("evaluateAdminOrderListServingExperimentReadiness can classify eligible inputs while remaining non-serving", () => {
    process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_GATE = "ready";
    process.env.ADMIN_ORDER_LIST_PG_SERVING_EXPERIMENT_KILL_SWITCH = "false";
    process.env.ADMIN_ORDER_LIST_PG_READINESS_MAX_SOURCE_MIRROR_DELTA_MS = "50";
    process.env.ADMIN_ORDER_LIST_PG_READINESS_MAX_COMPARATOR_MS = "50";

    const readiness = evaluateAdminOrderListServingExperimentReadiness({
      runtimeParity: {
        match: true,
        mismatchClass: null,
        comparatorConfidence: "high",
        discrepancies: [],
        coverage: { sourceCount: 4, mirroredCount: 4, coveredCount: 4 },
        queryContract: { status: "pending", page: 1, limit: 10 },
        runtimeLatencyMs: { sourceQuery: 20, mirrorQuery: 18, comparator: 6, sourceMirrorDelta: 2 },
      },
    });

    expect(readiness.eligible).toBe(true);
    expect(readiness.blocked).toBe(false);
    expect(readiness.blockedReasons).toEqual([]);
    expect(readiness.signals.telemetryHealth).toBe("healthy");
    expect(readiness.signals.comparatorHealth).toBe("healthy");
    expect(readiness.servingPathDecision).toBe("eligible-for-future-experiment");
  });
});
