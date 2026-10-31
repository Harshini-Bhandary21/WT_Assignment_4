// Events and streams capability.
// The logger is an EventEmitter. Other code emits events, and the listeners below
// write the messages to data/server.log using a write stream.
const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "..", "data", "server.log");
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });   // append mode

const logger = new EventEmitter();
let counts = { registered: 0, rejected: 0 };

function write(line) {
  logStream.write(`${new Date().toISOString()}  ${line}\n`);
}

logger.on("registered", (user) => { counts.registered++; write(`REGISTERED  ${user.email}`); });
logger.on("rejected", (info) => { counts.rejected++; write(`REJECTED    ${info.status}  ${JSON.stringify(info.errors)}`); });
logger.on("request", (req) => write(`${req.method} ${req.url}`));

logger.stats = () => ({ ...counts });
logger.close = () => logStream.end();
logger.LOG_FILE = LOG_FILE;

module.exports = logger;
