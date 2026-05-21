# Codex Project Notes

Tài liệu này tóm tắt nhanh dự án `immortality` để đánh giá hiện trạng và làm mốc tham chiếu khi code tiếp.

## Tổng quan

`immortality` là game tu tiên dạng web app, gồm:

- Frontend: React 19 + Vite, chạy mặc định qua `npm run dev`.
- Backend: Node.js + Express + PostgreSQL + Socket.IO, nằm trong `backend/`.
- Realtime: Socket.IO dùng JWT để xác thực, hiện chủ yếu phục vụ subscribe leaderboard/notification.
- Persistence: dữ liệu nhân vật, inventory, equipment, skills, event log nằm trong PostgreSQL; frontend vẫn giữ phần lớn game logic trong `GameContext`.

## Lệnh thường dùng

Frontend:

```bash
npm install
npm run dev
npm run build
npm run lint
```

Backend:

```bash
cd backend
npm install
npm run dev
npm start
```

Database:

```bash
createdb immortality_db
psql -U postgres -d immortality_db -f backend/src/db/schema.sql
```

Backend cần `.env` trong `backend/`:

```env
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=immortality_db
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
```

## Cấu trúc chính

- `src/App.jsx`: router chính, route `/login` public, các route game được bọc `ProtectedRoute`, `AuthProvider`, `GameProvider`.
- `src/context/AuthContext.jsx`: quản lý token, login/register/logout, gọi `/auth/me`, kết nối socket sau khi xác thực.
- `src/context/GameContext.jsx`: lõi game client-side: state, load/save server, tu luyện, đột phá, thiền, inventory, equipment, explore, reputation, alchemy.
- `src/context/gameStateMappers.js`: mapper giữa dữ liệu backend và state frontend, gồm character/inventory/equipment payload.
- `src/context/useGameServerSync.js`: hook riêng cho load server, debounce save, và beacon-save khi unload.
- `src/context/useGameProgression.js`: resource, EXP/level, độ kiếp, thiền định.
- `src/context/useGameInventoryEquipment.js`: inventory, dùng item, equipment, cường hóa, shop helper.
- `src/context/useGameWorldSystems.js`: event, exploration, quest, foundation/inner demon, reputation, alchemy.
- `shared/shopCatalog.js`: catalog item shop dùng chung cho frontend/backend để thống nhất itemId, category, tier và price.
- `src/services/api.js`: wrapper API dùng `VITE_API_BASE_URL`, fallback `http://localhost:3002/api`.
- `src/services/socket.js`: Socket.IO client dùng `VITE_SOCKET_URL`, fallback `http://localhost:3002`.
- `src/data/*.js`: dữ liệu tĩnh cho items, realms, recipes, zones.
- `src/pages/*.jsx`: UI từng màn hình: Home, Cultivation, World, Inventory, Shop, Leaderboard, Login.
- `backend/src/index.js`: Express app, middleware, Swagger, route registration, init Socket.IO.
- `backend/src/db/schema.sql`: schema PostgreSQL.
- `backend/src/routes/*.js`: API theo domain.
- `backend/src/middleware/*.js`: auth JWT, Joi validation, rate limit.

## Luồng frontend

1. `main.jsx` render `<App />`.
2. `AuthProvider` kiểm tra `localStorage.auth_token`.
3. Nếu token hợp lệ, gọi `api.auth.me()`, map `character_id` thành `characterId`, rồi `connectSocket(token)`.
4. Route game được bọc bởi `ProtectedRoute`; chưa login thì redirect `/login`.
5. `GameProviderWithAuth` truyền `user.characterId` vào `GameProvider`.
6. `GameProvider` load song song character, inventory, equipment, skills rồi map dữ liệu DB sang game state.
7. Các action trong game cập nhật state local; một số action gọi `saveToServer()` hoặc page gọi explicit save.
8. Khi unload, frontend dùng `navigator.sendBeacon()` tới `/api/characters/:id/beacon-save`.

## GameContext cần biết

Các nhóm hàm quan trọng:

- Mapping server/client: `mapServerToGameState`, `mapGameStateToServer`, `mapInventoryToServer`, `mapEquipmentToServer`.
- Save/load: `saveToServer`, `resetGame`, `exportSave`, `importSave`.
- Progression: `addExp`, `canBreakthrough`, `attemptBreakthrough`, `meditate`.
- Inventory/equipment: `addItem`, `removeItem`, `useItem`, `unequipItem`, `upgradeEquipment`, `getInventoryWithDetails`, `getEquippedItems`.
- World/quest: `exploreLocation`, `claimQuestReward`, `addEvent`.
- Systems: foundation, inner demon, reputation, alchemy.

Lưu ý: `GameContext.jsx` đang rất lớn và chứa cả domain logic, mapping, save sync, UI-facing helpers. Khi thêm feature lớn, nên cân nhắc tách theo module nhỏ: `stateMappers`, `inventoryActions`, `cultivationActions`, `serverSync`.

## Backend API

Base URL frontend đang dùng: `http://localhost:3002/api`.

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

Characters:

- `GET /api/characters/:userId`
- `POST /api/characters`
- `PUT /api/characters/:id`
- `POST /api/characters/:id/beacon-save`

Inventory:

- `GET /api/inventory/:characterId`
- `POST /api/inventory/:characterId/remove`
- `POST /api/inventory/:characterId/use`

Equipment:

- `GET /api/equipment/:characterId`
- `POST /api/equipment/:characterId/equip`
- `POST /api/equipment/:characterId/unequip`
- `POST /api/equipment/:characterId/upgrade`

Other:

- `GET /api/leaderboard`
- `GET /api/leaderboard/power`
- `GET /api/leaderboard/reputation`
- `GET /api/events/:characterId`
- `POST /api/events/:characterId`
- `DELETE /api/events/:characterId/clear`
- `GET /api/skills/:characterId`
- `POST /api/skills/:characterId/learn`
- `GET /api/shop/items`
- `POST /api/shop/buy`
- `POST /api/shop/sell`
- `GET /api/health`
- `GET /api-docs`

## Database

Schema nằm ở `backend/src/db/schema.sql`.

Bảng chính:

- `users`: account, email, password hash, active flag.
- `characters`: nhân vật và toàn bộ chỉ số/progression chính.
- `inventory`: item theo character, có `enhance_level`, unique `(character_id, item_id, enhance_level)`.
- `equipment`: item đang mặc theo slot.
- `learned_skills`: skill đã học.
- `event_logs`: log sự kiện.

View:

- `leaderboard_cultivation`: xếp hạng theo `realm_index`, `level`, `exp`.

## Realtime

Server khởi tạo Socket.IO trong `backend/src/socket.js`.

- Auth qua `socket.handshake.auth.token`.
- User tự join room `user:{userId}`.
- Client có thể join/leave `leaderboard_viewers`.
- Helper server: `broadcastLeaderboardUpdate`, `broadcastWorldAnnouncement`, `notifyUser`.

Điểm cần kiểm tra: JWT secret fallback đang không thống nhất giữa file:

- `auth.middleware.js`: `tu_tien_secret_key_2024`
- `auth.routes.js`: `tu_tien_secret_key_2024`
- `socket.js`: `tu_tien_secret_key`
- `character.routes.js` beacon-save: `tu_tien_secret_key_2025`

Nên luôn cấu hình `JWT_SECRET` trong `.env`, và tốt nhất sửa fallback cho thống nhất để tránh lỗi khó tìm khi dev local.

## Rủi ro và việc nên xử lý sớm

Đã xử lý một phần:

- Frontend/backend URL đã có env mẫu: `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, `PORT`, `CORS_ORIGINS`.
- Backend có `backend/src/config.js` để gom `PORT`, CORS và JWT config.
- JWT fallback đã dùng chung `JWT_SECRET` từ config cho HTTP, Socket.IO và beacon-save.
- Leaderboard backend đã trả `leaderboard` để khớp client wrapper.
- Các route character/inventory/equipment/events/skills/shop đã có auth ownership check theo character.
- Một số mutation nhiều query đã được bọc transaction: inventory remove/use, equipment equip/unequip/upgrade, shop buy/sell, skill learn, beacon-save.
- Shop frontend/backend đã dùng chung `shared/shopCatalog.js` cho danh sách item bán, category, tier và giá.
- Shop purchase trên frontend đã gọi backend `POST /api/shop/buy` khi có `characterId`, sau đó reload state từ server thay vì tự tính local.
- Inventory equipment actions đã gọi backend `equip`, `unequip`, `upgrade` khi có `characterId`, sau đó reload state từ server.
- Backend đã validate item/equipment bằng item definitions chung; inventory use pill/book đã chạy qua backend transaction khi có `characterId`.
- Server sync có `cancelPendingSave()` để tránh autosave cũ đè lên mutation backend vừa thực hiện.
- Manual cultivation và breakthrough đã có backend route `POST /api/cultivation/:characterId/cultivate|breakthrough`; frontend dùng route này khi có `characterId`.
- Meditation session, world exploration và alchemy craft đã có backend action route, frontend gọi backend khi có `characterId` rồi reload state.
- Đã thêm `npm test` với test tối thiểu cho mapper state và shop catalog contract.
- Đã thêm `.env.example`, `backend/.env.example`, README root/backend mới.

1. Text tiếng Việt bị lỗi encoding ở nhiều file.
   Nhiều chuỗi hiển thị đang ở dạng mojibake như `Tu TiÃªn`, `KhÃ´ng`, ký tự lạ. Khi sửa UI, nên chuẩn hóa file về UTF-8 và sửa text theo từng màn hình.

2. Security defaults.
   JWT fallback secret không nên dùng production. Cần fail fast nếu thiếu `JWT_SECRET` ở production.

3. `GameContext.jsx` vẫn quá lớn.
   Đã export `gameStateTestUtils` để dễ viết test cho mapper, nhưng chưa tách hẳn thành module domain nhỏ.

4. API response chưa thống nhất toàn bộ.
   Các response chính đã khớp client wrapper hơn, nhưng toàn backend vẫn chưa dùng một response envelope thống nhất.

## Gợi ý hướng refactor

Ưu tiên ngắn hạn:

- Chuẩn hóa port/env cho frontend và backend.
- Sửa fallback JWT secret cho thống nhất.
- Dọn text mojibake ở các màn hình chính.
- Đồng bộ contract leaderboard API.
- Thêm auth middleware và ownership check cho character/inventory/equipment/events/skills/shop.

Ưu tiên trung hạn:

- Tách `GameContext.jsx` thành module domain nhỏ.
- Đưa game calculations quan trọng về backend nếu cần chống gian lận.

## Quy ước khi code tiếp

- Đọc `GameContext.jsx` trước khi sửa gameplay vì nhiều hành vi nằm ở client.
- Khi thêm item/realm/zone/recipe, kiểm tra cả `src/data/*`, shop backend nếu item mua bán được, và schema nếu cần persistence mới.
- Khi thêm API mới, cập nhật `src/services/api.js`, route backend, validation, và Swagger nếu dùng.
- Khi sửa save/load, test cả reload trang và unload beacon.
- Tránh sửa đồng thời nhiều hệ thống trong `GameContext.jsx` nếu không cần, vì file dễ sinh regression.

## Security note: server authority

- Autosave from `useGameServerSync` is metadata-only: it saves character name and no longer syncs progression, inventory, or equipment.
- `beacon-save` is metadata-only and ignores inventory/equipment/progression payloads.
- Direct client bulk mutation routes have been removed from the production API surface. Use server-authoritative gameplay endpoints instead.

## Update 2026-05-20

- Backend success responses now use a common envelope `{ success: true, data }`; errors use `{ success: false, error: { message, details? } }`. The frontend API wrapper unwraps `data` for existing callers.
- `JWT_SECRET` now fails fast in production when missing. Database startup also fails fast in production if the connection check fails.
- Canonical game data for items, realms, recipes, and zones has moved to `shared/data/*`; `src/data/*` now re-exports those shared modules.
- Added server-side quest endpoints:
  - `GET /api/quests/:characterId/active`
  - `POST /api/quests/:characterId/claim`
- Added server-side gameplay endpoints:
  - `POST /api/cultivation/:characterId/meditation/start`
  - `POST /api/cultivation/:characterId/meditation/finish`
  - `POST /api/cultivation/:characterId/meditate`
  - `POST /api/world/:characterId/refresh-exploration`
- Frontend now uses backend routes for quest reward claim, exploration refresh, world meditation HP recovery, and cultivation meditation start/finish when `characterId` exists.
- Local save import/export/reset is now offline/dev-only; server-backed characters return an error instead of mutating local authoritative state.
- Manual cultivation no longer reloads the full server state after every click; it applies the mutation response locally to avoid exhausting API quota during fast clicking.
- Gameplay mutation routes now have a separate `gameplayLimiter` scoped by authenticated user + character (`600/minute`) instead of relying only on the shared IP limiter.
- Daily quests rotate deterministically by character and date, old active quests expire, and manual cultivation can be batched through `POST /api/cultivation/:characterId/cultivate/batch`.
- Legacy client state sync routes (`inventory add/sync`, `equipment sync`, `meditation-session`) were removed from backend routes, API client, and Swagger.
- Added normalized migrations for the new quest table and meditation session column:
  - `backend/src/db/migrations/001_character_quests.sql`
  - `backend/src/db/migrations/002_meditation_sessions.sql`
- Added real-DB backend integration test scaffold at `backend/tests/integration/authOwnershipGameplay.integration.test.js`. It is skipped unless both `RUN_DB_INTEGRATION=true` and `TEST_DATABASE_URL` are set.
- Swagger was refreshed for metadata-only character save, gameplay routes, quest routes, and the response envelope.
