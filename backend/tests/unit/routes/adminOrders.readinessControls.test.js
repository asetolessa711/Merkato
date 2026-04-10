const express = require("express");
const request = require("supertest");

const mongoOrders = [
  { _id: "mongo-order-1", total: 42.5, status: "pending" },
];

function buildFindChain(rows) {
  return {
    limit: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(rows),
    }),
  };
}

jest.mock("../../../models/Order", () => ({
  find: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../../models/ReturnRequest", () => ({}));

jest.mock("../../../middleware/authMiddleware", () => ({
  protect: (req, _res, next) => {
    req.user = { _id: "admin-user", roles: ["admin"] };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

jest.mock("../../../prisma/client", () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock("../../../services/orderPostgresMirror", () => ({
  buildMirroredAdminOrderListSummary: jest.fn(),
  resolveOrdersPgMirrorMode: jest.fn(),
  evaluateAdminOrderListRuntimeShadowVerification: jest.fn(),
  evaluateAdminOrderListServingExperimentReadiness: jest.fn(),
}));

const Order = require("../../../models/Order");
const { getPrismaClient } = require("../../../prisma/client");
const {
  buildMirroredAdminOrderListSummary,
  resolveOrdersPgMirrorMode,
  evaluateAdminOrderListRuntimeShadowVerification,
  evaluateAdminOrderListServingExperimentReadiness,
} = require("../../../services/orderPostgresMirror");
const adminOrdersRouter = require("../../../routes/adminOrders");

describe("adminOrders route guarded serving-path experiment", () => {
  let app;
  let consoleWarnSpy;
  let consoleLogSpy;
  let runtimeParity;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api/admin/orders", adminOrdersRouter);

    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    Order.find.mockReturnValue(buildFindChain(mongoOrders));
    getPrismaClient.mockReturnValue({
      orderMirror: {
        findMany: jest.fn().mockResolvedValue([
          { mongoId: "mirror-order-1", status: "cancelled" },
        ]),
      },
    });

    runtimeParity = {
      match: true,
      mismatchClass: null,
      comparatorConfidence: "high",
      discrepancies: [],
      coverage: { sourceCount: 1, mirroredCount: 1, coveredCount: 1 },
      queryContract: { status: null, page: 1, limit: 20 },
      mirroredResult: { page: 1, limit: 20, total: 1, ids: ["mongo-order-1"] },
      mirroredOrders: [{ mongoId: "mongo-order-1", status: "paid" }],
      runtimeLatencyMs: { sourceQuery: 12, mirrorQuery: 9, comparator: 2, sourceMirrorDelta: 3 },
    };

    resolveOrdersPgMirrorMode.mockReturnValue("best_effort");
    evaluateAdminOrderListRuntimeShadowVerification.mockReturnValue(runtimeParity);
    buildMirroredAdminOrderListSummary.mockReturnValue({
      orderMongoId: "mongo-order-1",
      orderExternalId: "ord_01hx00000000000000000001",
      buyerMongoId: "buyer-1",
      buyerExternalId: "usr_01hx00000000000000000001",
      status: "paid",
      currency: "USD",
      paymentMethod: "cod",
      total: "99.90",
      totalAfterDiscount: "89.90",
      discount: "10.00",
      vendorCount: 2,
      itemCount: 3,
      invoiceCount: 1,
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("gate off -> Mongo serves", async () => {
    evaluateAdminOrderListServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["gate-disabled"],
      failClosedDefaultLegacy: true,
      servingPathDecision: "blocked-legacy-only",
      controls: { gate: "off", gateEnabled: false, killSwitchActive: false },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy" },
      evaluationInputs: { mismatchClassSignal: "none" },
    });

    const res = await request(app).get("/api/admin/orders");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mongoOrders);
    expect(buildMirroredAdminOrderListSummary).not.toHaveBeenCalled();
  });

  test("kill switch active -> Mongo serves", async () => {
    evaluateAdminOrderListServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["kill-switch-active"],
      failClosedDefaultLegacy: true,
      servingPathDecision: "blocked-legacy-only",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: true },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy" },
      evaluationInputs: { mismatchClassSignal: "none" },
    });

    const res = await request(app).get("/api/admin/orders");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mongoOrders);
    expect(buildMirroredAdminOrderListSummary).not.toHaveBeenCalled();
  });

  test("readiness blocked -> Mongo serves", async () => {
    evaluateAdminOrderListServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["mismatch-class-query-semantics"],
      failClosedDefaultLegacy: true,
      servingPathDecision: "blocked-legacy-only",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: false },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy" },
      evaluationInputs: { mismatchClassSignal: "query-semantics" },
    });

    const res = await request(app).get("/api/admin/orders");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mongoOrders);
    expect(buildMirroredAdminOrderListSummary).not.toHaveBeenCalled();
  });

  test("eligible guarded path -> PostgreSQL serves within covered contract", async () => {
    evaluateAdminOrderListServingExperimentReadiness.mockReturnValue({
      eligible: true,
      blocked: false,
      blockedReasons: [],
      failClosedDefaultLegacy: true,
      servingPathDecision: "eligible-for-future-experiment",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: false },
      signals: { telemetryHealth: "healthy", comparatorHealth: "healthy" },
      evaluationInputs: { mismatchClassSignal: "none" },
    });

    const res = await request(app).get("/api/admin/orders");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([
      {
        _id: "mongo-order-1",
        orderExternalId: "ord_01hx00000000000000000001",
        buyer: "buyer-1",
        buyerExternalId: "usr_01hx00000000000000000001",
        status: "paid",
        currency: "USD",
        paymentMethod: "cod",
        total: 99.9,
        totalAfterDiscount: 89.9,
        discount: 10,
        vendorCount: 2,
        itemCount: 3,
        invoiceCount: 1,
      },
    ]);
    expect(buildMirroredAdminOrderListSummary).toHaveBeenCalledTimes(1);
  });

  test("degradation or comparator/parity failure -> immediate fallback to Mongo", async () => {
    evaluateAdminOrderListRuntimeShadowVerification.mockImplementation(() => {
      throw new Error("forced-comparator-failure");
    });
    evaluateAdminOrderListServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["comparator-error", "telemetry-health-degraded"],
      failClosedDefaultLegacy: true,
      servingPathDecision: "blocked-legacy-only",
      controls: { gate: "ready", gateEnabled: true, killSwitchActive: false },
      signals: { telemetryHealth: "degraded", comparatorHealth: "degraded" },
      evaluationInputs: { mismatchClassSignal: "comparator-error" },
    });

    const res = await request(app).get("/api/admin/orders");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mongoOrders);
    expect(evaluateAdminOrderListServingExperimentReadiness).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeParity: null,
        comparatorError: "forced-comparator-failure",
      })
    );
    expect(buildMirroredAdminOrderListSummary).not.toHaveBeenCalled();
  });
});