import test from "node:test";
import assert from "node:assert/strict";
import { csrfProtection } from "./csrf.js";

function createMockReq(path, method = "POST") {
  return {
    method,
    path,
    headers: {}
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value) {
      this.cookies[name] = value;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    }
  };
}

test("allows login requests under /api/auth/login without CSRF token", (t) => {
  const req = createMockReq("/api/auth/login", "POST");
  const res = createMockRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("rejects non-safe requests without a CSRF token", (t) => {
  const req = createMockReq("/api/products", "POST");
  const res = createMockRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { message: "CSRF token missing or invalid." });
});
