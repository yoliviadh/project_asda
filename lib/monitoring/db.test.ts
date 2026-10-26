import { afterEach, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
import { MongoClient } from "mongodb"
import { monitoringDb } from "./db"

const config = {
  mode: "mongodb" as const, uri: "mongodb://localhost:27017", database: "test",
  organizationId: "org-1", siteId: "site-1", accessToken: "unused-test-token",
}
const shared = globalThis as typeof globalThis & { monitoringMongo?: unknown }
afterEach(() => {
  delete shared.monitoringMongo
  vi.restoreAllMocks()
})

it("uses the real driver options and shares one connection across concurrent requests", async () => {
  const connect = vi.spyOn(MongoClient.prototype, "connect").mockImplementation(function (this: MongoClient) {
    expect(this.options.rejectUnauthorized).toBe(true)
    // Undefined preserves Node's default hostname verifier rather than a no-op.
    expect(this.options.checkServerIdentity).toBeUndefined()
    expect(this.options.maxPoolSize).toBe(10)
    return Promise.resolve(this)
  })
  const databases = await Promise.all([monitoringDb(config), monitoringDb(config)])
  expect(connect).toHaveBeenCalledTimes(1)
  expect(databases.map(db => db.databaseName)).toEqual(["test", "test"])
})

it("discards a failed connection so the next request can retry without leaking errors", async () => {
  const connect = vi.spyOn(MongoClient.prototype, "connect")
    .mockRejectedValueOnce(new Error("private connection details"))
    .mockImplementationOnce(function (this: MongoClient) { return Promise.resolve(this) })
  await expect(monitoringDb(config)).rejects.toThrow("MongoDB connection unavailable.")
  await expect(monitoringDb(config)).resolves.toHaveProperty("databaseName", "test")
  expect(connect).toHaveBeenCalledTimes(2)
})
