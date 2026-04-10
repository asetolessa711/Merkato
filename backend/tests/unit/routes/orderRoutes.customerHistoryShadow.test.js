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
  evaluateCustomerOrderHistoryRuntimeShadowVerification: jest.fn(),
}));

const Order = require("../../../models/Order");
const { getPrismaClient } = require("../../../prisma/client");
const {
  resolveOrdersPgMirrorMode,
  evaluateCustomerOrderHistoryRuntimeShadowVerification,
} = require("../../../services/orderPostgresMirror");
const orderRoutes = require("../../../routes/orderRoutes");

describe("orderRoutes customer-history runtime shadow", () => {
  let app;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();

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
  });

  afterEach(() => {
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
    expect(aliasesPassed).toEqual(["/my-orders", "/my"]);
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

    const res = await request(app).get("/api/orders/my-orders");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("ownership-mismatch"));
  });

  test("fails closed to Mongo response when runtime comparator throws", async () => {
    evaluateCustomerOrderHistoryRuntimeShadowVerification.mockImplementation(() => {
      throw new Error("forced-customer-comparator-failure");
    });

    const res = await request(app).get("/api/orders/my");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("comparator-error"));
  });
});
