# Immortality Backend

## Install

```bash
npm install
cp .env.example .env
```

Update `backend/.env`:

```env
PORT=3002
CORS_ORIGINS=http://localhost:5173,http://localhost:3002
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=immortality_db
JWT_SECRET=change_me_in_local_env
JWT_EXPIRES_IN=7d
```

## Database

```bash
createdb immortality_db
psql -U postgres -d immortality_db -f src/db/schema.sql
```

If `psql` configured user/database local:

```bash
npm run db:schema
```

## Run server

```bash
npm run dev
```

Production/local simple:

```bash
npm start
```

Server default: `http://localhost:3002`

## Main endpoint

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/characters/:id`
- `PUT /api/characters/:id`
- `GET /api/inventory/:characterId`
- `PUT /api/inventory/:characterId/sync`
- `GET /api/equipment/:characterId`
- `PUT /api/equipment/:characterId/sync`
- `GET /api/leaderboard`
- `GET /api/shop/items`
- `POST /api/shop/buy`
- `POST /api/shop/sell`

Swagger UI: `/api-docs`
