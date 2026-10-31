// Registration server built only with NodeJS core modules (http, fs, path, crypto, stream).
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { validateUser } = require("./lib/validator");
const store = require("./lib/store");
const logger = require("./lib/logger");

const PORT = process.env.PORT || 3000;
const MAX_BODY = 10 * 1024;            // 10 KB is more than enough for this form
const PUBLIC = path.join(__dirname, "public");

function sendJSON(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

// Reads the request body as a stream and stops if it becomes too big.
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject({ status: 413, message: "Request body is too large." }); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseBody(raw, contentType) {
  if (contentType.includes("application/json")) return JSON.parse(raw);
  if (contentType.includes("application/x-www-form-urlencoded")) return Object.fromEntries(new URLSearchParams(raw));
  throw { status: 415, message: "Content-Type must be application/json or application/x-www-form-urlencoded." };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

async function handleRegister(req, res) {
  let data;
  try {
    const raw = await readBody(req);
    data = parseBody(raw, req.headers["content-type"] || "");
  } catch (err) {
    const status = err.status || 400;
    const message = err.message && err.status ? err.message : "Body is not valid JSON.";
    logger.emit("rejected", { status, errors: { body: message } });
    return sendJSON(res, status, { success: false, message });
  }

  const errors = validateUser(data);
  if (Object.keys(errors).length > 0) {
    logger.emit("rejected", { status: 400, errors });
    return sendJSON(res, 400, { success: false, message: "Validation failed.", errors });
  }

  if (store.findByEmail(data.email.trim())) {
    const errs = { email: "This email is already registered." };
    logger.emit("rejected", { status: 409, errors: errs });
    return sendJSON(res, 409, { success: false, message: "Duplicate registration.", errors: errs });
  }

  const user = store.addUser({
    id: crypto.randomUUID(),
    name: data.name.trim(),
    email: data.email.trim(),
    phone: String(data.phone).trim(),
    age: Number(data.age),
    course: data.course,
    password: hashPassword(data.password),       // the plain password is never saved
    createdAt: new Date().toISOString(),
  });
  logger.emit("registered", user);
  const { password, ...publicUser } = user;
  sendJSON(res, 201, { success: true, message: "Registration successful.", user: publicUser });
}

// Stream the stored users as a CSV file.
function handleExport(res) {
  const { Readable } = require("stream");
  const users = store.readUsers();
  const rows = ["id,name,email,phone,age,course,createdAt",
    ...users.map((u) => [u.id, u.name, u.email, u.phone, u.age, u.course, u.createdAt].join(","))];
  res.writeHead(200, { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=users.csv" });
  Readable.from(rows.map((r) => r + "\n")).pipe(res);
}

function serveStatic(res, file, type) {
  const stream = fs.createReadStream(path.join(PUBLIC, file));
  stream.on("error", () => sendJSON(res, 404, { success: false, message: "File not found." }));
  res.writeHead(200, { "Content-Type": type });
  stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  logger.emit("request", req);

  const routes = {
    "GET /": () => serveStatic(res, "index.html", "text/html"),
    "GET /health": () => sendJSON(res, 200, { status: "ok", uptimeSeconds: Math.round(process.uptime()), ...logger.stats() }),
    "GET /users": () => sendJSON(res, 200, { count: store.readUsers().length,
      users: store.readUsers().map(({ password, ...u }) => u) }),
    "GET /export": () => handleExport(res),
    "POST /register": () => handleRegister(req, res),
  };

  const handler = routes[`${req.method} ${pathname}`];
  if (handler) {
    try { return await handler(); }
    catch (err) { console.error(err); return sendJSON(res, 500, { success: false, message: "Internal server error." }); }
  }

  const known = Object.keys(routes).some((k) => k.split(" ")[1] === pathname);
  if (known) return sendJSON(res, 405, { success: false, message: `Method ${req.method} not allowed on ${pathname}.` });
  sendJSON(res, 404, { success: false, message: `Route ${pathname} not found.` });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = server;
