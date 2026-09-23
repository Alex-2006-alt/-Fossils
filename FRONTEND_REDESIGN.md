# FamVault frontend redesign

The frontend now uses a warm editorial design: ivory paper, terracotta accents, olive details, serif headings, custom line icons, and layered photo objects.

## Implemented

- Responsive app shell, mobile exploration drawer, bottom navigation, breadcrumbs, and persistent light/dark themes.
- CSS perspective photo sculpture with pointer tilt, tactile gallery and album cards, page entrance transitions, and reduced-motion support. No additional 3D engine or runtime dependency.
- Redesigned home, timeline, favorites, albums, people, memories, search, places, family, login, signup, invitation, and detail pages.
- Native modal dialogs with focus containment, Escape dismissal, focus restoration, and body scroll locking.
- Photo viewer with keyboard arrows, favorites, details, download, and slideshow.
- Upload validation feedback, unique per-file progress records, retry actions, explicit queued status, and polling while previews are processing.
- Album photo selection and a family-scoped album detail page. Photo selection is validated against family membership.
- Family invitation creation, copy, listing, and revocation using existing APIs. Links are generated for the current browser origin.
- Server-side favorites, year, and text filtering before timeline pagination, plus bounded page size and stable sort tie-breaking.
- Family-scoped person detail queries and a working client-side photo viewer.
- Clear error, loading, empty, and not-found states. Places mapping and family-tree editing are explicitly marked as future features.
- Redis queue creation is deferred until an upload, so browsing and builds do not require Redis.

## Verification

- Frontend TypeScript: passed.
- Production build: passed. Existing storage tracing warnings remain.
- Lint for changed UI and supporting files: zero errors; eight existing-style plain-image optimization warnings. The app already serves preprocessed images with Next image optimization disabled.
- Full source lint still reports pre-existing explicit-any errors in untouched backend routes.
- Browser: sign-in, light/dark appearance, dashboard, mobile drawer, search, family, favorites, people, memories, places, album dialog, and upload dialog checked.
- Desktop (1280/1440 px) and mobile (390 px) layout checks showed no horizontal overflow on checked pages.
- Upload modal Escape dismissal and navigation drawer close-on-navigation verified.

## Limits of this check

The available account has an empty collection. Populated-media rendering, photo processing, upload retries against a running worker, invitation redemption, and persistent album creation were not tested end to end. Redis was unavailable locally. No test photos, families, invitations, or albums were added to the user's database. The broader storage/face-recognition privacy and worker reliability work in IMPROVEMENT_PLAN.md remains separate.

## Run

From the repository root: npm run dev --workspace=frontend

The frontend preview is available at http://localhost:3000. Background photo processing also requires the configured Redis service and worker.
