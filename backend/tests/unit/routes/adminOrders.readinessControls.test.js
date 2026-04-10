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
  resolveOrdersPgMirrorMode: jest.fn(),
  evaluateAdminOrderListRuntimeShadowVerification: jest.fn(),
  evaluateAdminOrderListServingExperimentReadiness: jest.fn(),
}));

const Order = require("../../../models/Order");
const { getPrismaClient } = require("../../../prisma/client");
const {
  resolveOrdersPgMirrorMode,
  evaluateAdminOrderListRuntimeShadowVerification,
  evaluateAdminOrderListServingExperimentReadiness,
} = require("../../../services/orderPostgresMirror");
const adminOrdersRouter = require("../../../routes/adminOrders");

describe("adminOrders route readiness controls (telemetry-only)", () => {
  let app;
  let consoleWarnSpy;
  let consoleLogSpy;

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
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("keeps readiness logic telemetry-only and serves Mongo orders", async () => {
    resolveOrdersPgMirrorMode.mockReturnValue("best_effort");
    evaluateAdminOrderListRuntimeShadowVerification.mockReturnValue({
      match: false,
      mismatchClass: "query-semantics",
      comparatorConfidence: "low",
      discrepancies: ["runtime.query.sort:mismatch"],
      coverage: { sourceCount: 1, mirroredCount: 1, coveredCount: 1 },
      queryContract: { status: "pending", page: 1, limit: 20 },
    });
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
    expect(evaluateAdminOrderListRuntimeShadowVerification).toHaveBeenCalledTimes(1);
    expect(evaluateAdminOrderListServingExperimentReadiness).toHaveBeenCalledWith(
      expect.objectContaining({ runtimeParity: expect.any(Object) })
    );
  });

  test("comparator or readiness failure cannot switch serving path", async () => {
    resolveOrdersPgMirrorMode.mockReturnValue("best_effort");
    evaluateAdminOrderListRuntimeShadowVerification.mockImplementation(() => {
      throw new Error("forced-comparator-failure");
    });
    evaluateAdminOrderListServingExperimentReadiness.mockReturnValue({
      eligible: false,
      blocked: true,
      blockedReasons: ["comparator-error", "no-runtime-parity-signal"],
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
  });
});