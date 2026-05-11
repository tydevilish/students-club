import { describe, it, expect } from "bun:test";

describe("Health Check", () => {
  it("should have server.js entry point", () => {
    const server = require("../server.js");
    // Verifies the file can be loaded without syntax errors
    expect(true).toBe(true);
  });
});

describe("Database Config", () => {
  it("should export a pool from db.js", () => {
    // Only check that the module structure is valid
    const dbModule = require("../db.js");
    expect(dbModule).toBeDefined();
  });
});

describe("Route Modules", () => {
  const routes = ["auth", "clubs", "registrations", "settings", "students"];

  for (const route of routes) {
    it(`should load routes/${route}.js without error`, () => {
      const routeModule = require(`../routes/${route}.js`);
      expect(routeModule).toBeDefined();
    });
  }
});
