# OpenLibrary Metadata Proxy for rreader-glassess (Unraid-ready)

A tiny HTTP proxy that lets **rreader-glassess** use **OpenLibrary** as its metadata provider.
Drop this in and point your rreader-glassess container's `UPSTREAM` at it.

## Endpoints (compatible)
- `GET /author?query=<name>` → author search
- `GET /author/:authorKey/works?limit=200` → list works by author (OLxxxxxA)
- `GET /work/:workKey` → work detail (OLxxxxxW)
- `GET /cover/:olid-L.jpg` → redirect to OpenLibrary cover

## Unraid Variables (env)
You can set all of these as **Environment Variables** in the Unraid Docker template:
- `PORT` (default `8080`) – host/container port
- `OL_PAGE_SIZE` (default `200`) – max works returned per author request (1–500)
- `LOG_LEVEL` (default `info`) – `debug | info | warn | error`
- `ENABLE_CACHE` (default `true`) – enable in-memory TTL cache
- `CACHE_TTL_MS` (default `600000`) – cache time-to-live in milliseconds (10 minutes)
- `CACHE_MAX` (default `500`) – max number of cached entries
- `CORS_ORIGIN` (default `*`) – allowed origin for CORS
- `BASE_PATH` (default empty) – serve API under a subpath (e.g., `/books`)

## Quick start (Docker Compose)
```bash
docker compose up -d
```

## Point rreader-glassess at the proxy
In your rreader-glassess container settings on Unraid, set:
```
UPSTREAM=http://openlibrary-proxy:8080
```
(or use your Unraid host IP + port if not on the same network).

## Notes
- Not affiliated with OpenLibrary. Please be respectful with request volume.
- You can add a reverse proxy (SWAG/Traefik/Caddy) in front if you need TLS or auth.
