# Production deployment

The hosted half of JobPilot: the web app and API run as containers behind
nginx; PostgreSQL is external. Users run the agent and terminal companion on
their own machines, so nothing agent-related is deployed here.

## Pieces

- [docker-compose.yml](docker-compose.yml) pulls `api` and `web` images from
  GHCR (tagged `latest` by the release workflow). The API keeps uploaded files
  in the `api-storage` volume and both services expose health checks, bound to
  localhost only.
- [jobpilot.conf](jobpilot.conf) is the nginx site config: one origin, web at
  `/`, API proxied at `/api` with SSE buffering off. Install steps are in the
  file's header comment; TLS comes from `certbot --nginx`.
- `.env` (not committed) holds `DATABASE_URL` for the external PostgreSQL,
  `GITHUB_REPOSITORY` (lowercased `owner/repo`, written by the deploy
  workflow), and optional `API_PORT` / `WEB_PORT` overrides.

## Deploy or update

```bash
docker compose pull
docker compose up -d
```

Health checks gate the web container on a healthy API, so a broken API image
stops the rollout by itself. Check status with `docker compose ps`; the API
answers on `/api/health`.
