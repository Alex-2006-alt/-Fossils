# FamVault improvement plan

Reviewed 23 September 2026. Scope: source code, workspace configuration, database schema, API handlers, worker pipeline, and key UI flows. This is a source-based assessment, not a deployed penetration test or browser UX audit. Existing local changes were preserved.

## Assessment

FamVault is a promising prototype for a private family photo library. It has reusable family-aware API authentication, role checks, password hashing, audit logging, cursor-based photo retrieval, and a background processing foundation. The immediate goal should be a dependable private photo vault before expanding AI or family-history features.

The implementation currently spans a Next.js frontend/API, Prisma with SQLite, Redis/BullMQ, local or R2 storage, and a face-recognition worker. Docker provisions PostgreSQL while the active schema uses SQLite. The declared ai-service workspace has no package manifest in the inspected inventory. Several schema models describe future functionality rather than completed features.

## Phase 1 — Enforce privacy boundaries (release blocker)

1. Move local media out of public/uploads and serve it through a server-side authorized route. Keep R2 private and issue short-lived read URLs only after membership checks. Cover originals, derivatives, and face crops. Current storage.ts returns public URLs and API handlers use them despite the presence of a signed-download helper.
2. Authenticate and scope the database query in frontend/src/app/(main)/people/[id]/page.tsx. It currently fetches any person by ID without checking family membership. The parent layout's client-side redirect is not a server authorization boundary.
3. Validate all photoIds supplied to album creation against the caller's family before creating joins. Reject the entire request if any photo is outside that family.
4. Load the media's family before face matching and restrict candidate faces to that family. workers/src/jobs/processMedia.ts currently searches all stored descriptors and can attach a photo to another family's person.
5. Apply typed request validation, consistent password rules for both signup methods, email normalization, and bounded login/signup/invitation attempt rates. Consume one-use invitations atomically with user creation; the current read/create/update sequence permits concurrent reuse.

Acceptance: tests with two families and an unauthenticated client demonstrate that person pages, albums, originals, thumbnails, and face crops cannot cross the boundary. Concurrent redemption of one invitation succeeds once. Tests include VIEWER write restrictions and uploader/admin deletion permissions.

## Phase 2 — Make the runtime reproducible

1. Choose and document the supported database deployment. Keep SQLite for a deliberate single-instance MVP, or migrate to PostgreSQL before a multi-instance rollout. Do not maintain contradictory defaults.
2. Use one generated Prisma client and version across frontend and worker. The worker declares Prisma 7 while the frontend declares Prisma 5, and the worker imports directly from frontend/node_modules.
3. Resolve database, upload, and model paths from explicit validated configuration. The worker hardcodes a SQLite path relative to its working directory, while shared storage also uses a relative path; launches from different directories can address different files.
4. Move shared database/storage/image-processing code into a real workspace package. Declare bullmq and ioredis directly in the worker instead of relying on another workspace's dependencies.
5. Add root dev/build/lint/typecheck commands and worker start/build commands. Replace the boilerplate README with setup, environment variables, migration, model provisioning, and troubleshooting instructions. Document or remove unused workspace declarations.
6. Commit migration history and provide an intentional development seed process. Add CI for clean dependency installation, client generation, lint, frontend and worker type checks, and production build.

Acceptance: a clean checkout can start the app and worker using documented commands, and both access the same database and media storage. CI passes without depending on a developer's existing node_modules or database.

## Phase 3 — Make uploads and deletion recoverable

1. Enforce file count, byte-size, decoded image dimensions, and supported format limits on the server. Validate actual image contents rather than trusting image/* supplied by the browser. The UI advertises a 50 MB limit that the upload handler does not enforce.
2. Persist media and pending processing work atomically, then dispatch through a durable outbox or reconciler. Storage writes, database inserts, and queue submission currently happen separately; Redis failure can strand an upload.
3. Configure bounded retries/backoff and deterministic job IDs. Make each processing step idempotent: rerunning a job must not duplicate faces, people, or counters. Track thumbnail and face results separately; READY is currently written before face processing, whose errors are only logged.
4. Use try/finally for tensor disposal and a shared promise for model initialization. Bound image work and measure worker memory use.
5. Return per-file upload results and track files by unique client IDs, not filenames. Distinguish transferred, processing, ready, and failed; poll pending media and offer retry. UploadZone currently marks an HTTP success as done and closes after two seconds even when failures remain.
6. Make deletion a recoverable workflow that handles queued/in-progress jobs, related database records, face crops, derived files, and person counts. The present handler deletes original/thumbnail/medium files before the database row and does not remove face crops.

Acceptance: Redis outage, corrupt image, worker restart, duplicate delivery, repeated filename, and deletion during processing all have deterministic outcomes. No duplicate face records or permanently stranded uploads remain after recovery.

## Phase 4 — Complete core user flows

1. Filter favorites on the server before pagination. The current page filters loaded photo pages and does not fetch subsequent pages itself, so older favorites can be absent. Give filtered queries distinct cache keys.
2. Move timeline year/search filtering to the server, validate pagination inputs, and add a unique tie-breaker to ordering. Current filters only inspect loaded photos.
3. Finish album detail, add/remove photo, rename, and delete flows with authorization. Current album API provides listing and creation only.
4. Repair person detail interaction using a client wrapper around the grid/viewer. The server component currently passes an inline no-op callback to a client component. Add naming and correction workflows before treating recognition as authoritative.
5. Add visible error/retry states and check HTTP status consistently for mutations. Ensure dialog focus handling, Escape dismissal, keyboard-operable photo tiles, accessible labels, and reduced-motion behavior.
6. Hide or clearly label unfinished Places and Family Tree features. Family Tree's Start Building button currently has no action; Places is a static placeholder.

Acceptance: a user can create a family, invite a member, upload, wait for processing, browse, favorite an old photo, organize an album, and delete a photo on desktop and mobile. Validate keyboard navigation in a browser.

## Phase 5 — Improve scale and AI deliberately

1. Add query/queue timings, failed-job visibility, structured logs with request/job IDs, readiness checks, graceful shutdown, and a tested database-plus-media backup/restore procedure.
2. Measure large-library behavior before adding complexity. Paginate capped/unbounded lists, remove repeated per-memory lookups, and virtualize the grid only if profiling justifies it. Avoid sending full EXIF blobs with every timeline item.
3. Keep search and memory-generation descriptions aligned with implementation. Search currently uses metadata/string matching and memory stories are assembled from templates; an embedding schema alone does not provide semantic search.
4. After the core is stable, evaluate semantic search and richer stories against a small, consented sample. Provide family controls for face processing and location visibility, correction tools, and removal of derived data.

Acceptance: agreed performance targets are measured on a representative library, restoration is demonstrated, and any AI feature has quality criteria and user correction paths.

## Suggested delivery order

Deliver Phase 1 first, then Phase 2, then Phases 3 and 4 in small vertical slices. Each slice should include the relevant regression checks. Phase 5 follows once the basic family workflow is trustworthy. Avoid a framework rewrite or broad visual redesign during this work; the existing architecture can support these improvements.

First implementation slice: family-scoped person/album/face queries, protected media delivery, and two-family regression coverage. Next slice: reproducible worker setup and one fully recoverable upload-to-view workflow.

## Validation scope

Frontend TypeScript check passed using npm exec --workspace=frontend -- tsc --noEmit --incremental false. No tracked automated test suite or migration history was found in the inspected file inventory. Production build, worker execution, database migration, and browser workflows were not verified during this planning review. No application code was modified.
