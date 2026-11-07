---
name: Bug report
about: Report something that is broken or behaves unexpectedly
title: "fix: <short description>"
labels: ["bug"]
assignees: []
---

<!--
Thanks for reporting a bug. Please do NOT paste secrets, tokens, real connection
strings or customer data. Redact them.
-->

## Describe the bug

<!-- A clear description of what is wrong. -->

## Expected behaviour

<!-- What you expected to happen instead. -->

## Steps to reproduce

1.
2.
3.

## Actual behaviour / error output

```
paste the error here — redact any secret values
```

## Environment

- Waslu backend version / commit:
- Node.js version (`node -v`):
- npm version (`npm -v`):
- OS:
- Running via: `npm run dev` / `docker compose up` / deployed
- Medusa version (`npm ls @medusajs/medusa`):
- PostgreSQL version:
- Redis version:

## Configuration

- Relevant `.env` variable **names** (never values):
- Did `npm run db:migrate` complete successfully? yes / no
- Does `/health` report healthy? yes / no / not checked

## Additional context

<!-- Logs, screenshots, related issues, or when this started happening. -->

## Checklist

- [ ] I searched existing issues and this is not a duplicate
- [ ] I removed all secrets and personal data from this report
- [ ] I can reproduce this on the latest `main`