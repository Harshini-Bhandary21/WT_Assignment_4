// File system capability: users are saved in data/users.json (read and write with the fs module).
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "users.json");

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];      // file not created yet
    throw err;
  }
}

function addUser(user) {
  const users = readUsers();
  users.push(user);
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2));
  return user;
}

function findByEmail(email) {
  return readUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

module.exports = { readUsers, addUser, findByEmail, FILE };
