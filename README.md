# Immortality

## Install

Frontend:

```bash
npm install
cp .env.example .env
npm run dev
```

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Default frontend run `http://localhost:5173`, backend/API/Socket.IO run `http://localhost:3002`.

## Database

Create db and schema:

```bash
createdb immortality_db
psql -U postgres -d immortality_db -f backend/src/db/schema.sql
```

Update info connection `backend/.env`.

## Scripts

Frontend:

- `npm run dev`: dev server Vite
- `npm run build`: build production
- `npm run lint`: lint frontend va backend JS/JSX
- `npm run preview`: preview build

Backend:

- `npm run dev`: run Express with nodemon
- `npm start`: run Express with node

## API

- Health: `GET http://localhost:3002/api/health`
- Swagger: `http://localhost:3002/api-docs`

Frontend URL:

- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`

Backend config:

- `PORT`
- `CORS_ORIGINS`
- `DB_*`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
