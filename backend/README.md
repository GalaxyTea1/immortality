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

Recommended setup for a new local database:

```bash
createdb immortality_db
npm run db:setup
```

`db:setup` runs all migrations in order and seeds item/shop/reputation catalogs.

If you only need to rebuild from the full schema snapshot:

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
- `GET /api/sects`
- `GET /api/sects/character/:characterId`
- `POST /api/sects`
- `POST /api/sects/:sectId/join`
- `POST /api/sects/:sectId/bosses/spawn`
- `POST /api/sects/:sectId/bosses/:instanceId/attack`
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
