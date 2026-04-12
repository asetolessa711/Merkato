const express = require("express");
const request = require("supertest");

function buildOrderFindChain(rows) {
  const chain = {
    populate: jest.fn(),
    sort: jest.fn(),
  };
  chain.populate.mockReturnValue(chain);
  chain.sort.mockResolvedValue(rows);
  return chain;
}

jest.mock("../../../models/Order", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
}));

jest.mock("../../../models/Product", () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock("../../../models/PromoCode", () => ({
  findById: jest.fn(),
}));

jest.mock("../../../models/Invoice", () => ({
  create: jest.fn(),
}));

jest.mock("../../../models/ReturnRequest", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../../../prisma/client", () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock("../../../middleware/authMiddleware", () => ({
  protect: (req, _res, next) => {
    req.user = { _id: "buyer-1", role: "customer", roles: ["customer"] };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
  optionalAuth: (req, _res, next) => next(),
}));

jest.mock("../../../services/orderPostgresMirror", () => ({
  mirrorOrderCreationToPostgres: jest.fn(),
  resolveOrdersPgMirrorMode: jest.fn(),
  evaluateCustomerOrderHistoryServingExperimentReadiness: jest.fn(),
  evaluateCustomerOrderHistoryRuntimeShadowVerification: jest.fn(),
}));

const Order = require("../../../models/Order");
const { getPrismaClient } = require("../../../prisma/client");
const {
  resolveOrdersPgMirrorMode,
  evaluateCustomerOrderHistoryServingExperimentReadiness,
  evaluateCustomerOrderHistoryRuntimeShadowVerification,
} = require("../../../services/orderPostgresMirror");
const orderRoutes = require("../../../routes/orderRoutes");

describe("orderRoutes customer-history runtime shadow", () => {
  let app;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_REHEARSAL_FORCE_COMPARATOR_FAILURE;

    app = express();
    app.use(express.json());
    app.use("/api/orders", orderRoutes);

    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const mongoDocs = [
      {
        toObject: () => ({
          _id: "order-1",
          buyer: "buyer-1",
          status: "pending",
          currency: "USD",
          total: 35,
          totalAfterDiscount: 30,
          discount: 5,
          vendors: [{ products: [{ name: "Widget" }] }],
        }),
      },
    ];
    Order.find.mockReturnValue(buildOrderFindChain(mongoDocs));

    getPrismaClient.mockReturnValue({
      orderMirror: {
        findMany: jest.fn().mockResolvedValue([
          {
            mongoId: "order-1",
            buyerMongoId: "buyer-1",
            status: "pending",
            currency: "USD",
            total: 35,
            totalAfterDiscount: 30,
            discount: 5,
            vendorCount: 1,
            itemCount: 1,
            sourceCreatedAt: "2024-02-02T00:00:00.000Z",
            vendors: [{ items: [{}] }],
          },
        ]),
      },
    });

    resolveOrdersPgMirrorMode.mockReturnValue("best_effort");
    evaluateCustomerOrderHistoryRuntimeShadowVerification.mockReturnValue({
      match: true,
      mismatchClass: null,
      comparatorConfidence: "high",
      discrepancies: [],
      coverage: { sourceCount: 1, mirroredCount: 1, coveredCount: 1 },
      queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my-orders" },
      sourceResult: { total: 1, ids: ["order-1"] },
      mirroredResult: { total: 1, ids: ["order-1"] },
    });
    evaluateCustomerOrderHistoryServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["gate-disabled"],
      failClosedDefaultLegacy: true,
      servingPathDecision: "blocked-legacy-only",
      controls: { gate: "off", gateEnabled: false, killSwitchActive: false },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy", aliasContract: "aligned" },
      evaluationInputs: { aliasPath: "/my-orders", mismatchClassSignal: "none" },
    });
  });

  afterEach(() => {
    delete process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_REHEARSAL_FORCE_COMPARATOR_FAILURE;
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("keeps alias handling consistent for /my-orders and /my in runtime shadow mode", async () => {
    const myOrdersRes = await request(app).get("/api/orders/my-orders");
    const myAliasRes = await request(app).get("/api/orders/my");

    expect(myOrdersRes.statusCode).toBe(200);
    expect(myAliasRes.statusCode).toBe(200);
    expect(myAliasRes.body).toEqual(myOrdersRes.body);

    const aliasesPassed = evaluateCustomerOrderHistoryRuntimeShadowVerification.mock.calls.map((call) => call[2].aliasPath);
    const readinessAliases = evaluateCustomerOrderHistoryServingExperimentReadiness.mock.calls.map(
      (call) => call[0].aliasPath
    );
    expect(aliasesPassed).toEqual(["/my-orders", "/my"]);
    expect(readinessAliases).toEqual(["/my-orders", "/my"]);
  });

  test("emits ownership mismatch telemetry while preserving Mongo serving response", async () => {
    evaluateCustomerOrderHistoryRuntimeShadowVerification.mockReturnValue({
      match: false,
      mismatchClass: "ownership-mismatch",
      comparatorConfidence: "medium",
      discrepancies: ["ownership.mirror.out-of-scope-count:1"],
      coverage: { sourceCount: 1, mirroredCount: 0, coveredCount: 0 },
      queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my-orders" },
      sourceResult: { total: 1, ids: ["order-1"] },
      mirroredResult: { total: 0, ids: [] },
    });
    evaluateCustomerOrderHistoryServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["mismatch-class-ownership-mismatch"],
      failClosedDefaultLegacy: true,
      servingPathDecision: "blocked-legacy-only",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: false },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy", aliasContract: "aligned" },
      evaluationInputs: { aliasPath: "/my-orders", mismatchClassSignal: "ownership-mismatch" },
    });

    const res = await request(app).get("/api/orders/my-orders");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("ownership-mismatch"));
  });

  test("kill switch active keeps Mongo-only serving response", async () => {
    evaluateCustomerOrderHistoryServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["kill-switch-active"],
      failClosedDefaultLegacy: true,
      servingPathDecision: "blocked-legacy-only",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: true },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy", aliasContract: "aligned" },
      evaluationInputs: { aliasPath: "/my-orders", mismatchClassSignal: "none" },
    });

    const res = await request(app).get("/api/orders/my-orders");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("kill-switch-active"));
  });

  test("eligible guarded path may serve covered PostgreSQL response", async () => {
    getPrismaClient.mockReturnValue({
      orderMirror: {
        findMany: jest.fn().mockResolvedValue([
          {
            mongoId: "order-1",
            orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
            buyerMongoId: "buyer-1",
            status: "pending",
            currency: "USD",
            paymentMethod: "cod",
            total: "35.00",
            totalAfterDiscount: "30.00",
            discount: "5.00",
            sourceCreatedAt: "2024-02-02T00:00:00.000Z",
            vendors: [
              {
                vendorMongoId: "vendor-1",
                vendorName: "Vendor One",
                status: "pending",
                currency: "USD",
                subtotal: "30.00",
                discount: "5.00",
                tax: "0.00",
                shipping: "0.00",
                total: "30.00",
                items: [
                  {
                    productMongoId: "product-1",
                    name: "Mirror Widget",
                    quantity: 1,
                    price: "30.00",
                    subtotal: "30.00",
                    tax: "0.00",
                  },
                ],
              },
            ],
          },
        ]),
      },
    });

    evaluateCustomerOrderHistoryRuntimeShadowVerification.mockReturnValue({
      match: true,
      mismatchClass: null,
      comparatorConfidence: "high",
      discrepancies: [],
      coverage: { sourceCount: 1, mirroredCount: 1, coveredCount: 1 },
      queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my-orders" },
      sourceResult: { total: 1, ids: ["order-1"] },
      mirroredResult: { total: 1, ids: ["order-1"] },
      runtimeLatencyMs: { sourceQuery: 12, mirrorQuery: 10, comparator: 2, sourceMirrorDelta: 2 },
    });
    evaluateCustomerOrderHistoryServingExperimentReadiness.mockReturnValue({
      eligible: true,
      blocked: false,
      blockedReasons: [],
      failClosedDefaultLegacy: true,
      servingPathDecision: "eligible-for-future-experiment",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: false },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy", aliasContract: "aligned" },
      evaluationInputs: { aliasPath: "/my-orders", mismatchClassSignal: "none" },
    });

    const res = await request(app).get("/api/orders/my-orders");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orders).toEqual([
      {
        _id: "order-1",
        orderExternalId: "oid_aaaaaaaaaaaaaaaaaaaa",
        buyer: "buyer-1",
        status: "pending",
        currency: "USD",
        paymentMethod: "cod",
        total: 35,
        totalAfterDiscount: 30,
        discount: 5,
        createdAt: "2024-02-02T00:00:00.000Z",
        vendors: [
          {
            vendorId: "vendor-1",
            vendorExternalId: null,
            vendorName: "Vendor One",
            status: "pending",
            currency: "USD",
            subtotal: 30,
            discount: 5,
            tax: 0,
            shipping: 0,
            total: 30,
            products: [
              {
                product: "product-1",
                name: "Mirror Widget",
                quantity: 1,
                price: 30,
                subtotal: 30,
                tax: 0,
              },
            ],
          },
        ],
      },
    ]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("postgres-covered-experiment"));
  });

  test("eligible guarded path stays alias-consistent for /my-orders and /my", async () => {
    evaluateCustomerOrderHistoryRuntimeShadowVerification.mockReturnValue({
      match: true,
      mismatchClass: null,
      comparatorConfidence: "high",
      discrepancies: [],
      coverage: { sourceCount: 1, mirroredCount: 1, coveredCount: 1 },
      queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my-orders" },
      sourceResult: { total: 1, ids: ["order-1"] },
      mirroredResult: { total: 1, ids: ["order-1"] },
      mirroredOrders: [
        {
          mongoId: "order-1",
          buyerMongoId: "buyer-1",
          status: "pending",
          currency: "USD",
          paymentMethod: "cod",
          total: "35.00",
          totalAfterDiscount: "30.00",
          discount: "5.00",
          sourceCreatedAt: "2024-02-02T00:00:00.000Z",
          vendors: [{ items: [] }],
        },
      ],
      runtimeLatencyMs: { sourceQuery: 12, mirrorQuery: 10, comparator: 2, sourceMirrorDelta: 2 },
    });
    evaluateCustomerOrderHistoryServingExperimentReadiness.mockReturnValue({
      eligible: true,
      blocked: false,
      blockedReasons: [],
      failClosedDefaultLegacy: true,
      servingPathDecision: "eligible-for-future-experiment",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: false },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy", aliasContract: "aligned" },
      evaluationInputs: { aliasPath: "/my-orders", mismatchClassSignal: "none" },
    });

    const myOrdersRes = await request(app).get("/api/orders/my-orders");
    const myAliasRes = await request(app).get("/api/orders/my");

    expect(myOrdersRes.statusCode).toBe(200);
    expect(myAliasRes.statusCode).toBe(200);
    expect(myAliasRes.body).toEqual(myOrdersRes.body);
  });

  test("eligible guarded path fails closed to Mongo when covered mirrored window is incomplete", async () => {
    getPrismaClient.mockReturnValue({
      orderMirror: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });

    evaluateCustomerOrderHistoryRuntimeShadowVerification.mockReturnValue({
      match: true,
      mismatchClass: null,
      comparatorConfidence: "high",
      discrepancies: [],
      coverage: { sourceCount: 1, mirroredCount: 1, coveredCount: 1 },
      queryContract: { buyerMongoId: "buyer-1", aliasPath: "/my-orders" },
      sourceResult: { total: 1, ids: ["order-1"] },
      mirroredResult: { total: 1, ids: ["order-1"] },
      runtimeLatencyMs: { sourceQuery: 12, mirrorQuery: 10, comparator: 2, sourceMirrorDelta: 2 },
    });
    evaluateCustomerOrderHistoryServingExperimentReadiness.mockReturnValue({
      eligible: true,
      blocked: false,
      blockedReasons: [],
      failClosedDefaultLegacy: true,
      servingPathDecision: "eligible-for-future-experiment",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: false },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy", aliasContract: "aligned" },
      evaluationInputs: { aliasPath: "/my-orders", mismatchClassSignal: "none" },
    });

    const res = await request(app).get("/api/orders/my-orders");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders[0]).toMatchObject({ _id: "order-1" });
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("covered-window-incomplete"));
  });

  test("fails closed to Mongo response when runtime comparator throws", async () => {
    evaluateCustomerOrderHistoryRuntimeShadowVerification.mockImplementation(() => {
      throw new Error("forced-customer-comparator-failure");
    });
    evaluateCustomerOrderHistoryServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["comparator-error", "telemetry-health-degraded", "comparator-health-degraded"],
      failClosedDefaultLegacy: true,
      servingPathDecision: "blocked-legacy-only",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: false },
      signals: { telemetryHealth: "degraded", comparatorHealth: "degraded", aliasContract: "degraded" },
      evaluationInputs: { aliasPath: "/my", mismatchClassSignal: "comparator-error" },
    });

    const res = await request(app).get("/api/orders/my");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("comparator-error"));
    expect(evaluateCustomerOrderHistoryServingExperimentReadiness).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeParity: null,
        comparatorError: "forced-customer-comparator-failure",
        aliasPath: "/my",
      })
    );
  });

  test("fails closed through explicit comparator/runtime-failure rehearsal switch", async () => {
    process.env.CUSTOMER_ORDER_HISTORY_PG_PROMOTION_REHEARSAL_FORCE_COMPARATOR_FAILURE = "true";
    evaluateCustomerOrderHistoryServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["comparator-error", "outside-promotion-window"],
      failClosedDefaultLegacy: true,
      servingPathDecision: "blocked-legacy-only",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: false },
      signals: { telemetryHealth: "degraded", comparatorHealth: "degraded", aliasContract: "aligned" },
      evaluationInputs: { aliasPath: "/my-orders", mismatchClassSignal: "comparator-error" },
    });

    const res = await request(app).get("/api/orders/my-orders");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(evaluateCustomerOrderHistoryServingExperimentReadiness).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeParity: null,
        comparatorError: "forced-customer-comparator-failure-rehearsal",
        aliasPath: "/my-orders",
      })
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("forced-customer-comparator-failure-rehearsal")
    );
  });
});
