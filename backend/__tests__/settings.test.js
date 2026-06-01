import { describe, it, expect, mock, beforeAll } from "bun:test";
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const pool = require("../db");
const mockQuery = mock(() => Promise.resolve([[]]));
pool.query = mockQuery;

const settingsRouter = require("../routes/settings");

// Helper to simulate request to settings router
function simulateRequest(method, url, body = {}, headers = {}) {
  return new Promise((resolve) => {
    let responseStatus = 200;
    const responseHeaders = {};

    const req = {
      method,
      url,
      body,
      headers,
      params: {},
      app: {
        get: (key) => {
          if (key === 'io') return { emit: () => {} };
          return null;
        }
      }
    };

    if (url.startsWith('/admins/')) {
      const parts = url.split('/');
      req.params.id = parts[parts.length - 1];
    }

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        resolve({ status: responseStatus, body: data, headers: responseHeaders });
        return this;
      },
      setHeader(name, value) {
        responseHeaders[name] = value;
        return this;
      },
      send(data) {
        resolve({ status: responseStatus, body: data, headers: responseHeaders });
        return this;
      }
    };

    // Find the route handler in Express router
    const match = settingsRouter.stack.find(layer => {
      if (!layer.route) return false;
      const pathMatch = layer.route.path === url || (layer.route.path === '/admins/:id' && url.startsWith('/admins/'));
      const methodMatch = layer.route.methods[method.toLowerCase()];
      return pathMatch && methodMatch;
    });

    if (match) {
      let idx = 0;
      const next = async (err) => {
        if (err) {
          resolve({ status: 500, body: { error: err.message }, headers: responseHeaders });
          return;
        }
        const handler = match.route.stack[idx++];
        if (handler) {
          try {
            await handler.handle(req, res, next);
          } catch (ex) {
            resolve({ status: 500, body: { error: ex.message }, headers: responseHeaders });
          }
        }
      };
      next();
    } else {
      resolve({ status: 404, body: { error: "Not Found" }, headers: responseHeaders });
    }
  });
}

describe("Settings Routes", () => {
  let token;
  
  beforeAll(() => {
    token = jwt.sign({ id: 1, username: 'admin' }, JWT_SECRET);
  });

  it("GET /admins should fail if unauthorized", async () => {
    const res = await simulateRequest("GET", "/admins");
    expect(res.status).toBe(401);
  });

  it("GET /admins should list admins when authorized", async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (sql.includes("SELECT id, username, created_at FROM admins")) {
        return [[{ id: 1, username: "admin", created_at: "2026-05-22" }]];
      }
      return [[]];
    });

    const res = await simulateRequest("GET", "/admins", {}, { authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    expect(res.body).toBeArray();
    expect(res.body[0].username).toBe("admin");
  });

  it("POST /admins should fail if unauthorized", async () => {
    const res = await simulateRequest("POST", "/admins", { username: "newadmin", password: "password123" });
    expect(res.status).toBe(401);
  });

  it("POST /admins should create admin when input is valid", async () => {
    mockQuery.mockImplementation(async (sql, _params) => {
      if (sql.includes("SELECT id FROM admins WHERE username = ?")) {
        return [[]]; // username not taken
      }
      if (sql.includes("INSERT INTO admins")) {
        return [{ insertId: 2 }];
      }
      return [[]];
    });

    const res = await simulateRequest("POST", "/admins", {
      username: "newadmin",
      password: "password123"
    }, { authorization: `Bearer ${token}` });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("ให้สิทธิ์ผู้ดูแลระบบสำเร็จ");
  });

  it("POST /admins should reject short password", async () => {
    const res = await simulateRequest("POST", "/admins", {
      username: "newadmin",
      password: "123"
    }, { authorization: `Bearer ${token}` });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Password ต้องมีอย่างน้อย 6 ตัวอักษร");
  });

  it("DELETE /admins/:id should fail to delete self", async () => {
    const res = await simulateRequest("DELETE", "/admins/1", {}, { authorization: `Bearer ${token}` });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("คุณไม่สามารถลบสิทธิ์ของตัวเองได้");
  });

  it("GET /export-sql should export database data", async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (sql.includes("SHOW TABLES")) {
        return [[{ Tables_in_club_registration: "admins" }]];
      }
      if (sql.includes("SHOW CREATE TABLE")) {
        return [[{ "Create Table": "CREATE TABLE admins (id INT)" }]];
      }
      if (sql.includes("SELECT * FROM")) {
        return [[{ id: 1, username: "admin" }]];
      }
      return [[]];
    });

    const res = await simulateRequest("GET", "/export-sql", {}, { authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    expect(res.headers["Content-Type"]).toBe("application/sql; charset=utf-8");
    expect(res.body).toContain("CREATE TABLE admins");
  });
});
