# Agent Memory Store operations

Startup is read-only and refuses unsafe JWT or memory-encryption configuration. It does not install packages, create databases, migrate, seed, or terminate unrelated processes.

## Explicit bootstrap

1. Copy `.env.example` to an untracked `.env`. Generate a 32-byte random encryption key and store its base64 encoding in `MEMORY_ENCRYPTION_KEY_BASE64`; use a managed secret store outside local development.
2. Create an empty PostgreSQL database and least-privilege role externally.
3. Run `npm run migrate`, then explicitly provision an administrator with `npm run create-admin` and the `SEED_ADMIN_*` variables.
4. Run `npm test`, then `npm start`.

Demo records require `ENABLE_DEMO_SEED=true` and are never loaded during startup.

## Supported hardened workflow

- `POST /api/memory-workflow/memories`: encrypted, idempotent tenant-scoped ingestion with injection quarantine.
- `POST /api/memory-workflow/retrieve`: tenant-scoped lexical reference retrieval with latency evidence.
- `POST /api/memory-workflow/consolidation/preview`: non-mutating human-review proposal.
- `POST /api/memory-workflow/memories/:id/delete`: commander-approved ciphertext destruction with immutable evidence.
- `POST /api/memory-workflow/evaluations`: reproducible recall and contamination checks.

Legacy global routes are disabled by default. Production key rotation, backup erasure, vector indexing, and model/provider integrations require external infrastructure and validation.
