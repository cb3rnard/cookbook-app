# Cookbook PWA (frontend) – AI instructions

## Scope & location

- Frontend app lives in public/app (React 19 + Vite + PWA).
- Base path for builds is /app/dist (see public/app/vite.config.ts).

## Architecture overview (key files)

- Observable state pattern: stores in src/services/stores/\*.ts extend BaseStore and are consumed via useObservableState (src/hooks/useObservableState.js).
- Data layer is three-tier: Dexie tables (src/models/tables) → repositories (src/services/data/repositories) → stores/contexts (src/services/stores, src/contexts).
- Sync orchestration is centralized in SyncService (src/services/sync/SyncService.ts), which uses SyncImporter/SyncExporter and SyncConflictsService.
- Event-driven updates use EventBus (src/services/utils/EventBus.ts); SyncStore emits sync:started/sync:completed.

## Project-specific patterns

- Repositories encapsulate business rules and relations. Example: RecipeRepository prepares image UUIDs and saves relations + image in \_saveRelations/\_saveRecipeImage (src/services/data/repositories/RecipeRepository.ts).
- Sync is bidirectional and endpoint-driven. SyncService loops through config.ENDPOINTS_SYNCABLE, resolving conflicts before import/export.
- Contexts are thin facades over services/stores. Example: SyncContext (src/contexts/SyncContext.tsx) delegates to SyncService and exposes derived state.

## API integration conventions

- REST endpoints follow /api/{endpoint} plus recipe-specific endpoints (see public/app/README.md “API Integration”).
- Images are uploaded separately after entity sync; expect image binary fetches via /api/images/{uuid}/binary.

## Dev workflows

- Install: npm install (run in public/app).
- Dev server (HTTPS): npm run dev → https://localhost:5173/app/dist.
- Build: npm run build; Preview: npm run preview.
- Lint: npm run lint; Format: npx prettier --write .

## When changing sync or data flows

- Update SyncService + SyncImporter/SyncExporter together.
- Keep store state updates inside stores; components should only subscribe and render.
