# Immortality

Web game tu tien gom React/Vite frontend va Express/PostgreSQL backend.

## Chay nhanh

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

Mac dinh frontend chay o `http://localhost:5173`, backend/API/Socket.IO o `http://localhost:3002`.

## Database

Tao database PostgreSQL va chay schema:

```bash
createdb immortality_db
psql -U postgres -d immortality_db -f backend/src/db/schema.sql
```

Cap nhat thong tin ket noi trong `backend/.env`.

## Scripts

Frontend:

- `npm run dev`: dev server Vite
- `npm run build`: build production
- `npm run lint`: lint frontend va backend JS/JSX
- `npm run preview`: preview build

Backend:

- `npm run dev`: chay Express bang nodemon
- `npm start`: chay Express bang node

## API

- Health: `GET http://localhost:3002/api/health`
- Swagger: `http://localhost:3002/api-docs`

Frontend lay URL tu:

- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`

Backend lay config tu:

- `PORT`
- `CORS_ORIGINS`
- `DB_*`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
