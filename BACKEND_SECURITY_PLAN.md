# FamVault: backend integration and security plan

Prepared 24 September 2026 from the current repository. Planning only: no application code, infrastructure, credentials, or user data changed during this review. This follows the frontend redesign and refines IMPROVEMENT_PLAN.md around the actual remaining work.

## Intended result

Keep the new frontend. Make its existing workflows persist reliably, complete the unfinished Places and Family Tree features, and enforce family privacy at every database, media, and worker boundary. Deliver in small, testable stages rather than replacing the application architecture.

The first milestone is one secure, complete journey: create family → invite member → upload photo → process preview → view → favorite → add to album → delete safely.

## Current state and confirmed gaps

| Area | Already implemented | Remaining work |
| --- | --- | --- |
| Accounts | Credential login, family creation, invitation signup, JWT sessions | Remove hardcoded login values; consistent validation, throttling, verified account recovery, session revocation |
| Media | Upload API, list/detail/delete endpoints, local/R2 adapter | Private delivery, enforced resource limits, recoverable queue dispatch, complete cleanup |
| Timeline/favorites | Real queries with server-side text/year/favorite filters | Integration tests, stable pagination under changes, consistent response types and cache invalidation |
| Albums | List/create, photo selection, family-scoped detail | Edit, add/remove existing album photos, paginated picker, cover management, delete |
| People | Face worker, list and scoped detail | Family-scoped matching, rename/hide/merge/correction APIs and UI, reliable counts |
| Memories | Read APIs, anniversary lookup, rule-based generation | Explicit write permissions, asynchronous/idempotent generation, edit/archive and refresh behavior |
| Family | Invitation create/list/revoke UI and APIs | Atomic redemption, safer tokens, member list, role changes, removal, ownership rules |
| Places/tree | Frontend placeholders; relevant schema fields/models | Real APIs, persisted editing and visualization, validation and privacy controls |
| Runtime | SQLite schema; Redis queue; separate worker | Docker/env defaults still describe PostgreSQL; incompatible Prisma declarations; working-directory-dependent paths and missing worker scripts |

Security findings are based on source inspection, not a deployed penetration test:

- storage.ts defaults to public/uploads and returns public media URLs. API authentication does not protect requests to those static files.
- Face matching in workers/src/jobs/processMedia.ts queries descriptors across all families.
- The login component contains nonempty hardcoded account and password defaults. Do not copy these values into reports or logs. Review the tracked seed script as well.
- Signup consumes an invitation after creating a user, outside a shared transaction. Concurrent requests can redeem the same token more than once.
- Signup methods apply different password validation; inputs generally lack runtime schemas and length/type bounds.
- Memory generation uses withFamilyAuth without a minimum write role, inheriting VIEWER access.
- Upload limits in the frontend and the Server Actions configuration do not enforce the multipart route's resource limits. The route trusts the supplied image MIME type.
- Original storage, media record creation, processing-record creation, and Redis submission are independent operations. Queue failure can leave inconsistent state.
- The worker marks media READY before face processing, suppresses face errors, and can duplicate records when retried.
- Photo deletion removes files before the database record and omits face-crop cleanup and person-count reconciliation.
- withFamilyAuth returns the handler promise without awaiting it inside the try block; standardize async error handling so rejected handlers receive the intended error response.

## Architecture decisions

- Retain Next.js route handlers and server components, Prisma, Redis/BullMQ, and a separate worker. Share validated contracts, database access, and storage helpers through real workspace packages.
- Target PostgreSQL for a deployed multi-user service, consistent with the existing Docker infrastructure. Preserve the current SQLite data until a backed-up, rehearsed migration has passed record-count and relationship checks. Never switch DATABASE_URL blindly or reset the database.
- Use an explicit, absolute private storage directory locally and a private R2 bucket in deployment. Local reads go through authorized media routes; R2 reads use short-lived URLs minted after authorization. For immediate revocation requirements, proxy reads instead of relying on an unexpired signed URL.
- Give media an explicit, indexed familyId. Backfill from uploader membership and validate all joins. Removing or moving a member must not move or orphan the family's photos.
- Keep face processing local by default. External AI, email delivery, geocoding, and map providers are deployment choices with explicit configuration; do not silently transmit photos, face descriptors, or coordinates to a new service.

## Phase 1 — Close privacy and account-access gaps

1. Remove embedded login credentials and insecure seed defaults. Determine whether those credentials were distributed or reused; arrange rotation and revoke affected sessions where applicable. Remove secrets from current files first; handle history cleanup separately if needed.
2. Enforce a reusable family/role policy across APIs, server-rendered details, relation writes, exports, downloads, and workers. Preserve the album/person checks already added. Reject foreign-family IDs without revealing resource existence.
3. Move existing media into private storage using a backed-up manifest and key mapping. Update every original, preview, crop, download, and cover URL producer, then verify the old public paths no longer expose copies. Serve validated raster types with appropriate content and cache headers.
4. Scope face matching to the media's family. Audit existing face/person links for mixed-family references and repair through a reviewed migration.
5. Add shared request schemas, email normalization, password rules and limits, per-account/IP rate limits, and consistent non-sensitive error responses. Trust forwarded IP headers only behind the configured trusted proxy.
6. Make invitation validation, account creation, and one-use consumption atomic. Store hashes of high-entropy tokens; expiry and revocation must be enforced. Replace the reusable short family-code fallback with expiring invitations, with a compatibility transition for existing users. Reduce email disclosure in public invite validation.
7. Require write permissions for memory generation and every mutation. Check same-origin/CSRF defenses for custom cookie-authenticated mutation routes, in addition to the authentication library's own endpoints. Verify production cookie settings and introduce CSP/security headers compatible with the current UI.
8. Add a session version or equivalent server-checked revocation mechanism. Role removal, password changes, and member removal must affect existing sessions; clear user-specific query caches at account changes.

Gate: isolated tests with two families prove no cross-family media, people, album, search, memory, or download access. A viewer cannot perform shared-data mutations. Concurrent invitation redemption succeeds once. Anonymous media reads fail. Revoked accounts lose access.

## Phase 2 — Make the backend reproducible

1. Align Prisma versions and generated client ownership. Remove imports from frontend/node_modules and declare worker dependencies directly.
2. Load validated configuration before constructing database/storage/queue clients. Fail clearly on invalid production secrets or missing configuration without printing credentials or credential-bearing Redis URLs.
3. Add root and worker dev/build/start/typecheck scripts, readiness checks, model provisioning, and graceful shutdown. Keep public liveness checks minimal; restrict detailed diagnostics.
4. Prepare versioned migrations, development-only fixtures, and the SQLite-to-PostgreSQL rehearsal and rollback instructions.
5. Bind development PostgreSQL, Redis, and administration ports to localhost; use explicit deployment secrets and pin infrastructure versions. Infrastructure must not be publicly exposed by default.

Gate: a clean checkout starts the frontend and worker against the same database and storage with documented commands. The migration is demonstrated on a copy. Builds do not need live Redis.

## Phase 3 — Complete reliable media ingestion and deletion

1. Enforce request-body, per-file byte, file-count, decoded pixel, format, and per-family quota limits. Apply request limits before unbounded buffering. Reject spoofed or unsupported content; retain original bytes privately and generate safe raster previews.
2. Stage originals; commit media plus durable pending work together. Dispatch through an outbox/reconciler so a Redis outage cannot lose work. Use bounded request timeouts and an explicit queued response rather than hanging uploads.
3. Make thumbnail, metadata, and face steps separately observable and retryable. Use deterministic job IDs, bounded retries/backoff, and idempotent writes. Clean up tensors in finally blocks and load models once per process.
4. Add authenticated processing-status and retry operations. The UI must distinguish uploading, queued, processing, ready, and failed. Support cancellation and durable status after navigation/reload; refresh all affected collections after completion.
5. Implement recoverable deletion with a tombstone and cleanup job. Stop/reconcile in-flight processing, remove original/derivative/crop files, update counts/covers, and prevent deleted media from reappearing on retry. Decide trash retention explicitly rather than making hard deletion the only path.

Gate: worker crash, duplicate job delivery, Redis outage, corrupt image, oversized upload, and deletion during processing all recover predictably. No duplicate faces or permanently stranded records; cleanup removes all associated objects.

## Phase 4 — Finish existing product workflows

Implement each row as API + permissions + frontend feedback + regression checks.

| Workflow | Backend and UI deliverable |
| --- | --- |
| Photos | Metadata update and deletion controls, consistent EXIF shape, protected downloads, stable pagination and pending-item presentation |
| Albums | PATCH/DELETE album, add/remove media, cover selection, paginated photo picker; scoped references throughout |
| People | Rename/hide, merge and correct matches, verified assignments, counts of distinct photos rather than face detections |
| Memories | Background generation, deduplication on repeated/concurrent runs, edit/archive, READY-media filtering, timezone-aware anniversaries |
| Family | Member listing, role changes, removal and explicit ownership transfer; protect the last owner and preserve family-owned media |
| Accounts | Verified-email and single-use reset-token flows, session invalidation, settings and export/deletion policies; requires configured mail delivery |
| Shared UI | Permission-aware actions, consistent loading/errors/retries, rollback on failed optimistic updates, cache invalidation for every affected collection |

Suggested role policy: OWNER manages ownership and settings; ADMIN manages members below its role and shared content; MEMBER uploads and edits its own content; VIEWER reads and may maintain personal favorites but cannot change shared content. Guest links, if enabled later, receive narrowly scoped upload-only access, never general family access.

Gate: the first complete journey passes with real images in an isolated test environment and remains correct after reload, sign-out/sign-in, permission changes, and worker restart. Confirm member permissions with the existing family sharing model before encoding fine-grained content-edit rules.

## Phase 5 — Connect Places and Family Tree

- Places: a paginated family-scoped location API, grouped coordinates, map/photo selection, and explicit location visibility settings. Never invent missing GPS metadata. Decide whether to use third-party tiles/geocoding before sending coordinates.
- Family Tree: family-scoped node and relationship APIs, persistent create/edit/remove, links to people/photos, and a responsive tree view. Reject cross-family references and parent cycles; preserve links to media when editing relationships.
- Keep optional semantic search, generated prose, videos, voice memories, capsules, and social features outside this core integration milestone. Their schema presence is not evidence of an implemented service.

Gate: both pages display and edit real family data, persist on reload, and pass cross-family authorization tests. Remove coming-soon labels only after those gates pass.

## Phase 6 — Release verification and operations

- Test API contracts and authorization for every role, using a separate test database, bucket/directory, and queue namespace.
- Add browser tests for populated libraries, mobile workflows, modal keyboard behavior, and recovery/error states.
- Run frontend/worker type checks, full lint, production builds, dependency/secret scans, and migration validation in CI. Resolve existing backend lint errors without suppressing them broadly.
- Add structured redacted logs, request/job IDs, queue age/failure metrics, storage usage, and actionable health reporting.
- Back up the database plus originals and prove restoration into a fresh environment. Rebuild derivatives where possible; document retention and deletion behavior.
- Stage the deployment, verify private media access and production session behavior, then enable real family use. Never use private family photos as disposable test fixtures.

## Delivery sequence and first batch

Order: privacy hotfixes → reproducible runtime/data migration → recoverable media pipeline → existing feature completion → Places/tree → release verification. Tests accompany each stage; the final phase is integration and operational validation, not the first time testing occurs.

First implementation batch: remove embedded credentials, protect all media reads, restrict face matching, correct mutation permissions and async error handling, make invitation consumption atomic, and establish two-family regression fixtures. Then make the upload-to-preview journey reliable before adding more features.

Decisions to settle before deployment: hosting topology, R2 versus private persistent disk, outbound email provider, map provider, and deletion-retention policy. These do not block the initial local security fixes or contract/test setup. Public deployment, live-data migration, and credential rotation are separate concrete steps, not actions performed by this planning document.
