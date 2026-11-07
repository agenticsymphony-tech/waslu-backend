import { describe, expect, it } from "vitest"
import { evaluateHealth } from "./health"

describe("evaluateHealth", () => {
  it("returns 200 and ok when both dependencies are reachable", () => {
    const result = evaluateHealth(true, true)

    expect(result.statusCode).toBe(200)
    expect(result.body.status).toBe("ok")
    expect(result.body.checks).toEqual({
      application: "up",
      postgres: "up",
      redis: "up",
    })
  })

  it("returns 503 when PostgreSQL is unreachable", () => {
    const result = evaluateHealth(false, true)

    expect(result.statusCode).toBe(503)
    expect(result.body.status).toBe("error")
    expect(result.body.checks.postgres).toBe("down")
    expect(result.body.checks.redis).toBe("up")
  })

  it("returns 503 when Redis is unreachable", () => {
    const result = evaluateHealth(true, false)

    expect(result.statusCode).toBe(503)
    expect(result.body.status).toBe("error")
    expect(result.body.checks.postgres).toBe("up")
    expect(result.body.checks.redis).toBe("down")
  })

  it("returns 503 when both dependencies are unreachable", () => {
    const result = evaluateHealth(false, false)

    expect(result.statusCode).toBe(503)
    expect(result.body.checks).toEqual({
      application: "up",
      postgres: "down",
      redis: "down",
    })
  })

  it("always reports the application itself as up", () => {
    // If this code is running, the HTTP server answered — that is the app check.
    expect(evaluateHealth(false, false).body.checks.application).toBe("up")
    expect(evaluateHealth(true, true).body.checks.application).toBe("up")
  })

  it("exposes only status strings, never infrastructure details", () => {
    const serialized = JSON.stringify(evaluateHealth(false, false).body)

    expect(serialized).not.toContain("postgres://")
    expect(serialized).not.toContain("redis://")
    expect(serialized).not.toContain("localhost")
    expect(serialized).not.toContain("password")
    expect(Object.keys(evaluateHealth(false, false).body.checks)).toEqual([
      "application",
      "postgres",
      "redis",
    ])
  })
})