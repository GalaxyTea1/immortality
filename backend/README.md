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
npm run db:migrate
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
- `POST /api/inventory/:characterId/use`
- `GET /api/equipment/:characterId`
- `POST /api/equipment/:characterId/equip`
- `POST /api/equipment/:characterId/unequip`
- `POST /api/equipment/:characterId/upgrade`
- `POST /api/cultivation/:characterId/cultivate`
- `POST /api/cultivation/:characterId/cultivate/batch`
- `POST /api/cultivation/:characterId/breakthrough`
- `POST /api/cultivation/:characterId/meditation/start`
- `POST /api/cultivation/:characterId/meditation/finish`
- `POST /api/world/:characterId/explore`
- `POST /api/world/:characterId/refresh-exploration`
- `POST /api/alchemy/:characterId/craft`
- `GET /api/quests/:characterId/active`
- `POST /api/quests/:characterId/claim`
- `GET /api/leaderboard`
- `GET /api/shop/items`
- `POST /api/shop/buy`
- `POST /api/shop/sell`

Gameplay mutation routes are rate-limited at 600 requests/minute per authenticated user + character.

Swagger UI: `/api-docs`

## Tests

Frontend/root tests:

```bash
npm test
```

Backend integration tests use a real PostgreSQL database and are skipped unless explicitly enabled:

```bash
cd backend
set RUN_DB_INTEGRATION=true
set TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/immortality_test
npm test
```
