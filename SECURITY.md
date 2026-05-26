# Security Policy

## Supported Version

Security fixes target the `main` branch.

## Reporting A Vulnerability

Please open a private security advisory or contact the maintainer before publishing exploit details. Include:

- affected route/tool;
- reproduction steps;
- expected impact;
- relevant logs with secrets removed.

## Operational Checklist

- Use HTTPS for the public domain.
- Keep `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `POSTGRES_PASSWORD` unique per deployment.
- Rotate FamilySearch credentials if a deployment host or database is exposed.
- Keep `MCP_ALLOWED_ORIGINS` restricted to ChatGPT and your public app origin.
- Run `npm audit --omit=dev`, `npm run typecheck`, and `npm run build` before deploy.
- Back up the Postgres volume and the app data volume.
