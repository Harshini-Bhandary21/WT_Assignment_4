# User Registration Server (NodeJS)

HTTP server written with NodeJS core modules only (no Express, no npm packages).
It registers users, validates the data on the server and answers with proper status codes.

## Run
Needs NodeJS 18 or newer.
```
npm start            # http://localhost:3000
npm test             # runs the automated tests
```
The port comes from the `PORT` environment variable (used by Render/Railway).

## Routes
| Method | Path | What it does |
|---|---|---|
| GET | `/` | registration page |
| POST | `/register` | validates and saves a user (JSON or form data) |
| GET | `/users` | list of users (without passwords) |
| GET | `/export` | users as a CSV file (streamed) |
| GET | `/health` | status and counters |

Status codes: 201 created, 400 validation error or bad JSON, 404 route not found,
405 wrong method, 409 duplicate email, 413 body too large, 415 wrong content type.

Example:
```
curl -X POST http://localhost:3000/register -H "Content-Type: application/json" \
  -d '{"name":"Anita Sharma","email":"anita@example.com","phone":"9876543210","age":21,"course":"web","password":"Pass1234"}'
```

## NodeJS capabilities used
- **Modules:** custom modules in `lib/` (`validator.js`, `store.js`, `logger.js`), loaded with `require`
- **File system:** `store.js` reads and writes `data/users.json`
- **Events:** `logger.js` is an EventEmitter; the server emits `request`, `registered` and `rejected`
- **Streams:** request body is read as a stream, the page is sent with `createReadStream().pipe(res)`,
  the log uses a write stream and the CSV export uses `Readable.from().pipe(res)`
- **Crypto:** passwords are stored as salted scrypt hashes

## Deploy on Render
New Web Service, connect the GitHub repo, Build command: leave empty (or `npm install`), Start command: `npm start`.
Note: the free tier file system is temporary, so saved users reset when the service restarts.
