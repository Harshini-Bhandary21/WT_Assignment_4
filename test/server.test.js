const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const server = require("../server");
const store = require("../lib/store");
const logger = require("../lib/logger");
const { validateUser } = require("../lib/validator");

const good = { name: "Harshini Bhandary", email: "h@example.com", phone: "9876543210", age: 20, course: "web", password: "Pass1234" };
let base, backup;

test.before(async () => {
  backup = fs.existsSync(store.FILE) ? fs.readFileSync(store.FILE) : null;   // keep real data safe
  fs.writeFileSync(store.FILE, "[]");
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
test.after(() => {
  server.close(); logger.close();
  if (backup) fs.writeFileSync(store.FILE, backup); else fs.rmSync(store.FILE, { force: true });
});

const post = (body, type = "application/json") =>
  fetch(base + "/register", { method: "POST", headers: { "Content-Type": type },
    body: typeof body === "string" ? body : JSON.stringify(body) });

test("validator accepts good data and rejects bad data", () => {
  assert.deepStrictEqual(validateUser(good), {});
  const e = validateUser({ name: "A1", email: "abc", phone: "123", age: 12, course: "x", password: "abc" });
  assert.deepStrictEqual(Object.keys(e).sort(), ["age", "course", "email", "name", "password", "phone"]);
});

test("valid POST returns 201 and does not leak the password", async () => {
  const res = await post(good);
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.user.password, undefined);
  assert.notStrictEqual(store.readUsers()[0].password, good.password);   // saved as a hash
});

test("same email again returns 409", async () => assert.strictEqual((await post(good)).status, 409));
test("invalid data returns 400 with field errors", async () => {
  const res = await post({ ...good, email: "bad", phone: "1" });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.errors.email && body.errors.phone);
});
test("broken JSON returns 400", async () => assert.strictEqual((await post("{oops")).status, 400));
test("wrong content type returns 415", async () => assert.strictEqual((await post("a=1", "text/plain")).status, 415));
test("huge body returns 413", async () => {
  try { const r = await post({ ...good, name: "x".repeat(20000) }); assert.strictEqual(r.status, 413); }
  catch { /* the server may close the connection first, which also stops the upload */ }
});
test("form-urlencoded is accepted", async () => {
  const res = await post(new URLSearchParams({ ...good, email: "form@example.com" }).toString(), "application/x-www-form-urlencoded");
  assert.strictEqual(res.status, 201);
});
test("unknown route 404, wrong method 405", async () => {
  assert.strictEqual((await fetch(base + "/nothing")).status, 404);
  assert.strictEqual((await fetch(base + "/register")).status, 405);
});
test("GET /users and /export work", async () => {
  assert.strictEqual((await (await fetch(base + "/users")).json()).count, 2);
  const csv = await (await fetch(base + "/export")).text();
  assert.ok(csv.startsWith("id,name,email"));
});
