# Durable CardFlow storage

CardFlow uses PostgreSQL when `DATABASE_URL` is set and keeps local JSON storage as a development fallback. At startup it creates the required tables and makes a one-time import of `server/data/cardflow_db.json` when that file is available. Check `GET /api/health`; `storage` should say `postgresql` after deployment.

## Configure production

1. Create a durable PostgreSQL database with your hosting provider. Do not use Render's expiring Free Postgres for long-term CardFlow data.
2. In the CardFlow web service's environment settings, set `DATABASE_URL` to the database's private/internal connection string when hosted on Render. Keep the URL secret; do not commit it.
3. Redeploy CardFlow. On startup, schema setup and any available legacy JSON import run automatically.
4. Sign in and verify that cards are present on both devices. If the server database had already lost the cards, export them from the laptop and import that backup while signed in after the database is connected.

If your provider does not require TLS for its private connection string, set `DATABASE_SSL=disable`. Otherwise the server uses TLS.

Local development without `DATABASE_URL` continues to use `server/data/cardflow_db.json`. That local file is ignored by Git so user data and credentials are not committed.
