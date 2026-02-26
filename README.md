# Calendar Event Automation System

Upload a timetable PDF and automatically generate recurring calendar events exported as an `.ics` file compatible with Google Calendar and Outlook.

## Architecture

```
client/  (React + Vite)  ──POST /api/generate-events──>  server/  (Node.js + Express)
                                                          ├── PDF parsing   (pdf-parse)
                                                          ├── Event engine  (weekly recurrence)
                                                          └── ICS output    (ics library)
```

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9

## Quick Start

```bash
# 1. Install all dependencies
npm install
npm install --prefix server
npm install --prefix client

# 2. Start the backend (port 3001)
npm run dev:server

# 3. In a second terminal, start the frontend (port 5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Environment Variables

### Server (`server/.env`)

| Variable        | Default                 | Description                    |
| --------------- | ----------------------- | ------------------------------ |
| `PORT`          | `3001`                  | Port the API listens on        |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin            |

### Client

| Variable       | Default                  | Description       |
| -------------- | ------------------------ | ----------------- |
| `VITE_API_URL` | `http://localhost:3001`  | Backend API base  |

## API

### `POST /api/generate-events`

**Content-Type:** `multipart/form-data`

| Field       | Type   | Required | Description                          |
| ----------- | ------ | -------- | ------------------------------------ |
| `file`      | PDF    | Yes      | Timetable PDF                        |
| `startDate` | string | No       | ISO date – term start (default: now) |
| `endDate`   | string | No       | ISO date – last event (default: 31 March 2026) |

**Success (200):** Returns `text/calendar` `.ics` file download.
**Error (400/500):** JSON `{ "error": "..." }`.

### `GET /health`

Returns `{ "status": "ok", "timestamp": "..." }`.

## Expected PDF Format

The parser looks for lines containing:

- A **course code** (e.g. `CS 101`, `MATH2001`)
- A **day name** (Monday–Sunday or Mon–Sun)
- A **time range** (e.g. `09:00-10:00`, `9.00–10.30`)
- An optional **location** after the time

Example line the parser handles well:

```
CS101 | Monday 09:00-10:00 | Room 101
```

## Deployment

- **Frontend → Vercel:** Import the `client/` directory; config is in `vercel.json`.
- **Backend → Render:** Import the `server/` directory; config is in `render.yaml`. Set `CLIENT_ORIGIN` to your Vercel URL.

## Scripts

| Script            | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev:server`  | Start backend in watch mode  |
| `npm run dev:client`  | Start frontend dev server    |
| `npm run build:client`| Production build of client   |
| `npm run lint`        | Run ESLint                   |
| `npm run format`      | Run Prettier                 |

## License

MIT
