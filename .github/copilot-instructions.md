# Cookbook PWA - AI Agent Instructions

## Project Overview

Cookbook is an offline-first React/TypeScript PWA for recipe management with bidirectional API synchronization. The architecture prioritizes offline resilience, conflict resolution, and real-time data consistency.

## Core Architecture

### Three-Layer Data Pattern

1. **Tables** (`src/models/tables/`): Direct Dexie/IndexedDB access
2. **Repositories** (`src/services/data/repositories/`): Business logic, hydration, sync orchestration
3. **Stores** (`src/services/stores/`): Observable reactive state (singleton pattern)

Example: Recipes flow through `RecipeTable` → `RecipeRepository` → `SyncStore` (observable).

### Offline-First Strategy

- **Always local first**: `repository.get()` reads from IndexedDB immediately
- **Background sync**: Dirty entities (isDirty=1) auto-sync via `_requestEntitySync()` EventBus
- **Never block on sync**: UI never waits for remote operations
- **Sync states**: `isDirty` (0=clean, 1=dirty), `lastSyncDate`, `version` for conflict detection

### Hydration System

**HydrateOptions** control what data is retrieved:

- `complete: true` → routes to `hydrateDependencies: "full"` (activates all hydration options)
- `hydrateDependencies: ""` → skip all dependent entity relations (used in bulk sync for performance)
- `hydrateDependencies: "name"` → fetch relations with names only (default, used for display)
- `hydrateDependencies: "full"` → include full entity objects for all relations (used in single entity sync)
- `withRecipeIngredients: true` → fetch RecipeIngredient relations
- `withNotes: true` → include recipe notes
- `withImage: true` → include recipe images

**Bulk sync context**: Dependencies synced first (ingredients/types) with `hydrateDependencies: ""`, then recipes with `hydrateDependencies: ""` to avoid redundant DB calls.

**Single entity sync**: Use `{ complete: true }` to include full dependent entities for export (routes to `hydrateDependencies: "full"`).

**Dependency sync in single entity**: Batched per endpoint type via `_syncResolution()` with `bulkSync: true` flag, avoiding N individual API calls.

## Entity Lifecycle

### Sync Fields (in BaseSyncEntity)

```
uuid             // Unique identifier
version          // Incremented on each modification
dateAdd          // Creation timestamp
dateModify       // Last modification timestamp (updated by touch())
dateDeleted      // Soft delete timestamp (null if not deleted)
isDirty          // 0=synced, 1=unsaved changes
lastSyncDate     // ISO timestamp of last successful sync
```

### State Transitions

1. **New entity**: `save(entity, synced='')` → isDirty=1, dateAdd/dateModify set, no sync
2. **Modified**: `touch()` → isDirty=1, dateModify updated
3. **Synced**: `synced(dateSync)` → isDirty=0, lastSyncDate updated
4. **Delete**: `delete()` → marks dateDeleted, stays isDirty=1 until synced
5. **Import**: `save(entity, synced='dateReceived')` → isDirty=0 immediately

## Synchronization Flow

### Bulk Sync (Full/Incremental)

1. Fetch dependencies (types, ingredients) with `hydrateDependencies: ""`
2. Sync dependencies in batch per endpoint type → mark synced
3. Fetch recipes with `hydrateDependencies: ""`
4. Export recipes with `entity.toApi()`
5. Conflict detection for any conflicts
6. Import remote changes, mark synced

### Single Entity Sync

1. EventBus emits `sync:request:entity` from `repository._requestEntitySync()`
2. `SyncService._syncEntity()` intercepts, fetches full entity with `{ complete: true }` (→ `hydrateDependencies: "full"`)
3. Sync dependencies if dirty (batch per endpoint via `_syncResolution()` with `bulkSync: true`)
   - Collect all dirty ingredients → single export batch
   - Collect all dirty types → single export batch
4. For recipes: hydrates with `hydrateDependencies: "full"` → exports with full entities
5. Conflict resolution
6. Mark synced

**Key differences**:

- **Bulk sync**: `hydrateDependencies: ""` (skip all relations for performance)
- **Single entity sync**: `hydrateDependencies: "full"` (complete context for export)
- **Dependency sync**: Batched per endpoint instead of individual entity syncs (2 exports for all dependencies vs N)

### Conflict Strategies

- `LAST_WRITE_WINS`: Compare `dateModify` timestamps
- `LOCAL_WINS`: Keep local version
- `REMOTE_WINS`: Accept remote version

Detected in `SyncConflictsService.detectConflicts()`, resolved in `SyncImporter`/`SyncExporter`.

## Critical Workflows

### Adding a New Syncable Entity Type

1. Create entity class extending `BaseSyncEntity` in `src/models/entities/`
2. Create table extending `BaseSyncTable` in `src/models/tables/`
3. Create repository extending `BaseSyncRepository<TData, TStorage, TEntity, TTable>` in `src/services/data/repositories/`
4. Register in `DataService` repositories map
5. Add to `ENDPOINTS_SYNCABLE` in `config.ts`
6. Implement `_hydrate()` if entity has relations

### Modifying Hydration

- Change `HydrateOptions` in `src/types/repositories.ts`
- Update `repository._hydrate()` to handle new options
- In `BaseSyncRepository.get()`: pass hydrate options through
- In sync: `skipDependenciesRelation: true` for bulk, `{ complete: true }` for single

### Image Handling in Recipes

Images are NOT part of batch sync:

1. Recipe synced first (imageUuid only)
2. `_saveRecipeImage()` uploads blob separately after relations saved
3. Image entities stored in separate table via `ImageRepository`
4. `_hydrateImage()` lazy-loads via sync if blob missing

## Code Patterns

### Entity Serialization

- `toStorage()` → full data for IndexedDB
- `toData()` → entity + relations for internal use
- `toApi()` → clean data for API (no isDirty, no lastSyncDate)

### Event Emission

Repository methods emit events via EventBus:

- `entity:saved` / `entity:updated` → generic save/update
- `recipe:savedWithRelations` / `recipe:updatedWithRelations` → after relations saved
- `sync:request:entity` → trigger sync via SyncService listener

### Error Handling

- Batch failures retry individually in `SyncExporter._processBatchResults()`
- Entity-level import errors log but continue (don't block entire sync)
- Image upload failures don't fail recipe export (logged as warning)
- Network errors caught as `ApiPlatformError` with violation messages

## Config & Types

- **`src/config/config.ts`**: Endpoints, dependency chains, conflict strategies
- **`src/types/repositories.ts`**: HydrateOptions, Repository interfaces
- **`src/types/entities.ts`**: Entity data types, API types, validation rules
- **`src/types/sync.ts`**: Sync operation state, conflict types

## Development Commands

```bash
npm run dev          # Dev server with HTTPS (localhost:5173/app/dist)
npm run build        # Build for production
npm run lint         # ESLint check
npm run format       # Prettier formatting
npm run type-check   # TypeScript validation
```

## Anti-Patterns to Avoid

- ❌ Calling `repository.get()` in tight loops without hydrate control (causes N+1 DB calls)
- ❌ Syncing without checking `isDirty` first (wastes API calls)
- ❌ Modifying entities without calling `touch()` (sync state becomes inconsistent)
- ❌ Hardcoding endpoint names instead of using `config.ENDPOINTS_SYNCABLE`
- ❌ Hydrating full entities in bulk sync (defeats performance optimization)

## Testing Sync

1. Open DevTools Storage → IndexedDB to inspect local state
2. Modify recipes locally, watch `isDirty=1` set
3. Trigger sync → watch EventBus `sync:request:entity` events
4. Check `lastSyncDate` updated after successful sync
5. Simulate conflicts by editing same recipe offline + online
