# Tu Tiên Backend API

Backend API cho game Tu Tiên, được xây dựng với Node.js, Express và PostgreSQL.

## Cài đặt

### 1. Cài đặt dependencies

```bash
cd backend
npm install
```

### 2. Cấu hình Database

1. Tạo file `.env` từ template:

```bash
cp .env.example .env
```

2. Cập nhật thông tin database trong `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=immortality_db
```

3. Tạo database và chạy schema:

```sql
CREATE DATABASE immortality_db;
```

4. Chạy file schema để tạo các bảng:

```bash
psql -U postgres -d immortality_db -f src/db/schema.sql
```

### 3. Chạy server

**Development mode (với hot-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3001`

## API Endpoints

### Health Check

- `GET /api/health` - Kiểm tra trạng thái server

### Characters

- `GET /api/characters/:userId` - Lấy thông tin nhân vật
- `POST /api/characters` - Tạo nhân vật mới
- `PUT /api/characters/:id` - Cập nhật nhân vật (save game)

### Leaderboard

- `GET /api/leaderboard` - Bảng xếp hạng tu luyện
- `GET /api/leaderboard/power` - Xếp hạng lực chiến
- `GET /api/leaderboard/reputation` - Xếp hạng danh vọng

### Inventory

- `GET /api/inventory/:characterId` - Lấy inventory
- `POST /api/inventory/:characterId/add` - Thêm vật phẩm
- `POST /api/inventory/:characterId/remove` - Xóa/giảm vật phẩm
- `PUT /api/inventory/:characterId/sync` - Đồng bộ toàn bộ inventory

## Cấu trúc thư mục

```
backend/
├── src/
│   ├── db/
│   │   ├── index.js      # Database connection pool
│   │   └── schema.sql    # Database schema
│   ├── routes/
│   │   ├── character.routes.js
│   │   ├── leaderboard.routes.js
│   │   └── inventory.routes.js
│   └── index.js          # Entry point
├── .env.example
├── .gitignore
├── package.json
└── README.md
```
