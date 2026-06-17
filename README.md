# City Airport Taxis — Backend API

Node.js / Express / TypeScript API for **City Airport Taxis**. This service handles admin and user authentication, session management, email flows, and authenticated file uploads to Cloudinary.

## Features

- **Dual auth** — separate admin (`/api/admin/auth`) and user (`/api/auth`) flows with JWT access + refresh tokens
- **HttpOnly cookies** — refresh tokens stored in secure cookies; optional access token in response body
- **CSRF protection** — required on protected mutating routes after login
- **Session management** — list sessions, revoke one, or log out everywhere; refresh token rotation with reuse detection
- **Account security** — bcrypt hashing, login lockout, password strength via Joi validators, activity audit log
- **Email** — verification, forgot/reset password (user + admin templates)
- **Single user type** — all accounts use role `user` (multi-role support can be added later)
- **Upload** — authenticated image upload to Cloudinary (`POST /api/upload/upload`)

## Tech stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Runtime      | Node.js 20+                         |
| Framework    | Express 4                           |
| Language     | TypeScript 5                        |
| Database     | MongoDB (Mongoose 8)                |
| Validation   | Joi                                 |
| Auth         | jsonwebtoken, bcryptjs, cookies     |
| Email        | Nodemailer                          |
| Media        | Cloudinary, Multer                  |
| Logging      | Winston, Morgan                     |

## Project structure

```
src/
├── config/          # env, database
├── controllers/     # HTTP handlers
├── errors/          # AppError
├── middleware/      # auth, CSRF, rate limits, upload, validation
├── models/          # Mongoose schemas only (User, Admin, Session, Activity)
├── routes/          # admin-auth, user-auth, upload
├── services/        # auth, userAuth, sessions, email, lockout
├── templates/       # HTML email templates (user-auth)
├── types/           # IUser, IAdmin, auth, upload, etc.
├── utils/           # JWT, cookies, logger, responses
└── validators/      # Joi schemas (incl. password.schema)
```

## Prerequisites

- Node.js **20+**
- MongoDB (local or Atlas)
- SMTP credentials (e.g. Hostinger, SendGrid)
- [Cloudinary](https://cloudinary.com) account for uploads

## Getting started

### 1. Install dependencies

```bash
cd backend
pnpm install
# or: npm install
```

### 2. Environment variables

Create `backend/.env` for local development. Use `backend/.env.production` as a reference for Render, or set the same keys in **Render Dashboard → Environment**.

**Never commit `.env` or `.env.production`** — both are gitignored.

```env
# Server
NODE_ENV=development
PORT=5000
LOG_LEVEL=info
TRUST_PROXY_HOPS=1

# Public website (user app) — CORS + password/verify email links
FRONTEND_URL=http://localhost:3000
# Admin dashboard — CORS + admin password reset links
ADMIN_FRONTEND_URL=http://localhost:3001

# Database
MONGODB_URI=mongodb://localhost:27017/city-airport-taxis

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-smtp-user
EMAIL_PASS=your-smtp-password
EMAIL_FROM=noreply@cityairporttaxis.com
DEFAULT_ADMIN_EMAIL=admin@cityairporttaxis.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# JWT (use long random strings; min 32 chars in production)
JWT_SECRET=change_me_to_a_long_random_secret_32chars
JWT_REFRESH_SECRET=change_me_to_a_different_long_secret_32
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Auth behaviour
REQUIRE_EMAIL_VERIFICATION=true
MAX_SESSIONS_PER_USER=10
BCRYPT_ROUNDS=12

# Redis / Upstash (optional — REDIS_ENABLED=false to start on Render)
REDIS_URL=
REDIS_ENABLED=false
REDIS_CONNECT_TIMEOUT_MS=10000
REDIS_MAX_RETRIES=10

# Socket.IO
SOCKET_ENABLED=true
SOCKET_PATH=/socket.io
```

| Variable | Description |
| -------- | ----------- |
| `FRONTEND_URL` | Public website URL (CORS + user reset/verify email links) |
| `ADMIN_FRONTEND_URL` | Admin dashboard URL (CORS + admin reset email links) |
| `REDIS_ENABLED` | `false` by default — set `true` with Upstash `REDIS_URL` when scaling |
| `REDIS_URL` | Upstash Redis URL on Render (`rediss://default:...@....upstash.io:6379`) |
| `REQUIRE_EMAIL_VERIFICATION` | When `true`, users must verify email before login |
| `MAX_SESSIONS_PER_USER` | Oldest sessions dropped when limit exceeded |
| `TRUST_PROXY_HOPS` | Set to `1` on Render (app runs behind Render reverse proxy) |

In **production**, `JWT_SECRET` and `JWT_REFRESH_SECRET` must each be at least 32 characters and must differ.

### 3. Run

```bash
# Development (hot reload)
pnpm dev

# Production build
pnpm build
pnpm start
```

API base: `http://localhost:5000`

- Health: `GET /health/live` (process alive), `GET /health/ready` and `GET /health` (dependencies)
- Root: `GET /`

## Render deployment

This backend runs on **Render** as a persistent Node web service (API + Socket.IO).

### Option A — Blueprint (recommended)

1. Push the repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repo — Render reads `render.yaml` at repo root (`rootDir: backend`), or set Root directory to `backend` and use `backend/render.yaml`.
4. Add **secret** environment variables in the dashboard (see list below).
5. Deploy.

### Option B — Manual web service

| Setting | Value |
| ------- | ----- |
| **Root directory** | `backend` |
| **Runtime** | Node |
| **Build command** | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| **Start command** | `pnpm start` |
| **Health check path** | `/health/live` |

Render sets `PORT` automatically. Use `TRUST_PROXY_HOPS=1`.

### Required environment variables (Render Dashboard)

| Variable | Example / notes |
| -------- | ---------------- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Min 32 chars in production |
| `JWT_REFRESH_SECRET` | Different from JWT_SECRET, min 32 chars |
| `FRONTEND_URL` | `https://your-website.onrender.com` |
| `ADMIN_FRONTEND_URL` | `https://your-dashboard.onrender.com` |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | SMTP |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Uploads |

### Optional

| Variable | When |
| -------- | ---- |
| `REDIS_URL` | Upstash Redis URL on Render (`rediss://...`) |
| `REDIS_ENABLED=true` | Shared rate limits + multi-instance Socket.IO |
| `SOCKET_ENABLED=false` | REST-only API (no WebSockets) |

### Free tier notes

- Render **free** web services **sleep** after ~15 minutes idle (cold start on next request).
- Socket.IO may disconnect when the service sleeps — use a **Starter** plan ($7/mo) for always-on.
- Redis is **optional** — `REDIS_ENABLED=false` in `render.yaml` is enough to launch. Add [Upstash](https://upstash.com) later when scaling.

### After deploy

- API: `https://city-airport-taxis-api.onrender.com`
- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`
- Seed admin locally against production DB, or run seed once via Render shell with `SEED_ADMIN_PASSWORD`.

### Frontends

Deploy **website** and **dashboard** as separate Render Web Services (Next.js) or use **Vercel** for frontends and point `FRONTEND_URL` / `ADMIN_FRONTEND_URL` to those URLs.

## API overview

All JSON routes expect `Content-Type: application/json`. Protected routes require:

1. **Access token** — `Authorization: Bearer <accessToken>` (from login/refresh response or cookie flow your frontend uses)
2. **CSRF** — `X-CSRF-Token` header matching the `csrfToken` cookie (set on login/refresh)

### Admin auth — `/api/admin/auth`

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/login` | Public | Admin login |
| POST | `/refresh` | Cookie | Rotate refresh token |
| POST | `/forgot-password` | Public | Send reset email |
| POST | `/reset-password` | Public | Reset with token |
| GET | `/me` | Admin + CSRF | Current admin profile |
| POST | `/update-profile` | Admin + CSRF | Update admin profile fields |
| POST | `/logout` | Admin + CSRF | Logout current session |
| POST | `/change-password` | Admin + CSRF | Change password |
| POST | `/logout-all` | Admin + CSRF | Revoke all sessions |
| GET | `/sessions` | Admin + CSRF | List active sessions |
| DELETE | `/sessions/:sessionId` | Admin + CSRF | Revoke one session |
| GET | `/activities` | Admin + CSRF | Recent auth activity |

### User auth — `/api/auth`

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/register` | Public | Register a new user account |
| POST | `/login` | Public | User login |
| POST | `/refresh` | Cookie | Rotate refresh token |
| POST | `/forgot-password` | Public | Send reset email |
| POST | `/reset-password` | Public | Reset with token |
| POST | `/verify-email` | Public | Verify email with token |
| POST | `/resend-verification` | Public | Resend verification email |
| POST | `/logout` | User + CSRF | Logout current session |
| POST | `/change-password` | User + CSRF | Change password |
| POST | `/logout-all` | User + CSRF | Revoke all sessions |
| GET | `/me` | User + CSRF | Current user profile |
| POST | `/update-profile` | User + CSRF | Update allowed profile fields |
| GET | `/sessions` | User + CSRF | List active sessions |
| DELETE | `/sessions/:sessionId` | User + CSRF | Revoke one session |
| GET | `/activities` | User + CSRF | Recent auth activity |

### Upload — `/api/upload`

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/upload` | User + CSRF | Multipart field `file` → Cloudinary URL |

## Password rules

Enforced in Joi (`validators/password.schema.ts`), not duplicated in services:

- Minimum **8** characters
- At least one uppercase, lowercase, digit, and special character
- New password must differ from current password on change-password routes

## User registration behaviour

- New users are created with role `user` and status `active`.
- If `REQUIRE_EMAIL_VERIFICATION=true`, a verification email is sent and login tokens are issued only after verification (or when verification is disabled).

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Start dev server with `ts-node-dev` |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled `dist/server.js` |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm lint` | ESLint on `src/` |
| `pnpm lint:fix` | ESLint with auto-fix |
| `pnpm format` | Prettier write |
| `pnpm test` | Run Vitest test suite |
| `pnpm seed:admin` | Seed initial admin (`SEED_ADMIN_PASSWORD` required) |

## Security notes

- Use strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET` in production.
- Access and refresh tokens are sent in **httpOnly cookies**; refresh tokens in the JSON body are accepted **only in non-production** (for local API testing).
- Set `FRONTEND_URL` and `ADMIN_FRONTEND_URL` to your live website and admin dashboard; CORS allows only those two origins.
- Rate limiters apply to login, register, refresh, password reset, and email verification endpoints.
- Do not commit `.env` or real credentials to version control.

## License

ISC
