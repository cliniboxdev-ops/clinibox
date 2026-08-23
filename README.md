# Clinibox

SaaS platform for Clinibox rural health deployments — first market: Peru.
Offline-first by design: clinic devices keep a full local copy of their data
and sync opportunistically. See [RESEARCH.md](RESEARCH.md) for the stack
rationale and Peru regulatory context.

## Structure

| Path | What | Stack |
|---|---|---|
| `apps/portal` | Doctor/admin web portal (online side) | Next.js + Tailwind |
| `apps/clinic` | Clinic/kiosk app running on Clinibox units (offline-first) | Expo / React Native |
| `packages/shared` | Shared FHIR R4 types and domain logic | TypeScript |
| `docs/` | Roadmap and planning artifacts | — |

## Development

```bash
pnpm install        # install everything
pnpm portal         # run the doctor portal (Next.js dev server)
pnpm clinic         # run the clinic app (Expo)
pnpm typecheck      # typecheck all workspaces
```

## Planned architecture (see RESEARCH.md)

- Postgres (Supabase) as the central database
- PowerSync for Postgres ⇄ on-device SQLite sync (fully offline capable)
- FHIR R4 data model per Peru MINSA "Dyaku" profiles (RENHICE interop, Law 30024)
- Store-and-forward consults first; Jitsi video when bandwidth allows
- Spanish-first UI, i18n from day one
- Compliance: Law 30421 / DL 1490 (telehealth), Law 29733 + DS 016-2024-JUS
  (consent, DPO, 48h breach notification)
