# Database Migrations

Migrations are ordered by filename and should use a unique numeric prefix.

- Use `000_`, `001_`, `002_`... in chronological order.
- Prefer idempotent statements such as `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `DROP VIEW IF EXISTS` before `CREATE VIEW`.
- Keep catalog data out of migrations; use `npm run db:seed:catalog`.
- For a new local database, run `npm run db:setup`.

