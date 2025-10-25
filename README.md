# Readarr OpenLibrary Metadata Server

A lightweight HTTP server that **mimics Readarr-compatible metadata endpoints** but serves data from **OpenLibrary**.
Use this if you want to point Readarr (or tools expecting a Readarr-like metadata API) at a custom provider that doesn't rely on Goodreads/Hardcover.

## What it implements

- `GET /api/v1/author/lookup?term=<name>` → list matching authors
- `GET /api/v1/author/:olid/books?limit=<n>` → list works for an OpenLibrary author id (OLxxxxxA)
- `GET /api/v1/book/:olwid` → detail for an OpenLibrary work id (OLxxxxxW)
- Helpers (optional):
  - `GET /health` → health check
  - `GET /cover/:id-L.jpg` → redirects to OpenLibrary covers CDN

These endpoint shapes mirror common Readarr metadata lookups (used by community providers), making it easy to point Readarr at this server as a custom metadata source.

> Note: Readarr configuration UIs vary; if yours cannot set a custom metadata URL directly, you can route via a reverse proxy or use a fork that supports custom metadata providers.

## Environment variables

All are optional; sensible defaults provided.

- `PORT` (default `8080`) — server port.
- `LOG_LEVEL` (default `info`) — `debug|info|warn|error`.
- `OL_PAGE_SIZE` (default `200`) — max items returned on `/books` endpoint (caps at 500).
- `ENABLE_CACHE` (default `true`) — enable in-memory TTL cache.
- `CACHE_TTL_MS` (default `600000`) — cache TTL (10 minutes).
- `CACHE_MAX` (default `500`) — max cached entries.
- `CORS_ORIGIN` (default `*`) — allow CORS from this origin (useful for testing).
- `BASE_PATH` (default empty) — serve under a subpath, e.g. `/meta`.

## Run with Docker

```bash
docker run -d --name readarr-ol-meta -p 8080:8080   -e PORT=8080 -e ENABLE_CACHE=true   your-docker-user/readarr-openlibrary-meta:latest
```

Or with Compose (see below).

## Docker Compose

```yaml
version: "3.8"
services:
  readarr-ol-meta:
    build: .
    container_name: readarr-ol-meta
    ports:
      - "${PORT:-8080}:${PORT:-8080}"
    environment:
      PORT: "${PORT:-8080}"
      LOG_LEVEL: "${LOG_LEVEL:-info}"
      OL_PAGE_SIZE: "${OL_PAGE_SIZE:-200}"
      ENABLE_CACHE: "${ENABLE_CACHE:-true}"
      CACHE_TTL_MS: "${CACHE_TTL_MS:-600000}"
      CACHE_MAX: "${CACHE_MAX:-500}"
      CORS_ORIGIN: "${CORS_ORIGIN:-*}"
      BASE_PATH: "${BASE_PATH:-}"
    restart: unless-stopped
```

## Pointing Readarr at this server

- If your Readarr build allows setting a **custom metadata base URL**, set it to:
  - `http://<server-ip>:8080` (or your chosen port)
- Readarr should issue author lookups via `/api/v1/author/lookup?term=...`, then request `/api/v1/author/:id/books`, and `/api/v1/book/:id` for details.
- If your Readarr version does not expose a custom metadata URL, you can:
  - Use a fork that supports it, or
  - Put a reverse proxy that rewrites the default metadata hostname to this server.

## Test locally

```bash
curl -s http://localhost:8080/health | jq
curl -s "http://localhost:8080/api/v1/author/lookup?term=neil%20gaiman" | jq '.[0:3]'
curl -s "http://localhost:8080/api/v1/author/OL2162288A/books?limit=5" | jq
curl -s "http://localhost:8080/api/v1/book/OL82563W" | jq
```

## License

MIT
