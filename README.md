# 🍳 Cookbook PWA

A Progressive Web Application for managing your recipes with offline-first capabilities and API synchronization.

## 🚀 Features

### Core Functionality

- **Recipe Management**: Create, edit, and organize recipes with ingredients, types, and notes
- **Offline-First**: Full offline support with IndexedDB (Dexie) local storage
- **PWA Support**: Install as a native app on any device
- **Bi-directional Sync**: Automatic synchronization with remote API server
- **Image Handling**: Upload, resize, and manage recipe images
- **URL Import**: Import recipes directly from URLs
- **Advanced Filtering**: Filter recipes by difficulty, types, ingredients

### Technical Highlights

- **Observable State Pattern**: Reactive state management with custom observable stores
- **Conflict Resolution**: Smart sync conflict detection and resolution strategies
- **Repository Pattern**: Clean separation between data access (tables), business logic (repositories), and reactive state (stores)
- **Event-Driven Architecture**: EventBus for decoupled component communication
- **Type Safety**: Entity classes with validation and API serialization
- **Batch Operations**: Optimized bulk sync with individual retry on failures

## 🛠️ Tech Stack

### Frontend

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Radix UI** - Accessible component primitives
- **CSS Modules** - Scoped styling with PostCSS

### Data & Storage

- **Dexie.js** - IndexedDB wrapper for local storage
- **dexie-observable** - Observable changes tracking
- **dexie-syncable** - Sync protocol support

### PWA

- **vite-plugin-pwa** - PWA manifest and service worker generation
- **Workbox** - Service worker strategies

### Code Quality

- **ESLint** - Linting with React plugins
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Commitlint** - Conventional commits enforcement

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── forms/          # Form components (Recipe, Ingredient, Type, UrlImport)
│   ├── interfaces/     # Main interfaces (Importer, Recipe, Settings)
│   ├── layout/         # Layout components (Header, Sidebar, Overlay)
│   ├── recipe/         # Recipe-specific components (Card, Grid, View)
│   ├── settings/       # Settings panels (API, Sync, Import/Export)
│   ├── sync/           # Sync UI components (Progress, CountBoxes)
│   └── ui/             # Reusable UI components (Modal, Select, Table)
├── contexts/           # React contexts
│   ├── ApiContext.jsx       # API service and connection state
│   ├── DataContext.jsx      # Data repositories and counts
│   ├── RecipesContext.jsx   # Recipe list management
│   ├── SettingsContext.jsx  # App settings
│   ├── SyncContext.jsx      # Sync operations
│   └── ViewContext.jsx      # View state management
├── hooks/              # Custom React hooks
│   ├── useObservableState.js  # Subscribe to observable stores
│   ├── usePwaInstall.js       # PWA installation
├── models/             # Data models
│   ├── entities/       # Entity classes (Recipe, Ingredient, Type, Image)
│   └── tables/         # Dexie table wrappers (RecipeTable, etc.)
├── services/           # Business logic
│   ├── api/           # API client (ApiService, operations)
│   ├── data/          # Data access layer
│   │   └── repositories/  # Entity repositories (RecipeRepository, etc.)
│   ├── stores/        # Observable state stores
│   │   ├── BaseStore.js      # Base observable singleton
│   │   ├── SessionStore.js   # User session state
│   │   ├── ConnectionStore.js # API connection status
│   │   ├── DataStore.js      # Local/remote counts
│   │   └── SyncStore.js      # Sync operation state
│   ├── sync/          # Synchronization logic
│   │   ├── SyncService.js         # Main sync orchestrator
│   │   ├── SyncExporter.js        # Export operations
│   │   ├── SyncImporter.js        # Import operations
│   │   └── SyncConflictsService.js # Conflict detection/resolution
│   ├── utils/         # Utility services
│   ├── DebugService.js     # Debug logging
│   ├── SettingsService.js  # Settings persistence
│   └── StorageService.js   # LocalStorage wrapper
└── styles/            # Global styles

```

## 🏗️ Architecture Patterns

### Observable State Management

Custom reactive state pattern using singleton stores:

- **BaseStore**: Base class with subscribe/notify pattern
- **SessionStore**: User session and sync preferences
- **ConnectionStore**: API connection status
- **DataStore**: Local/remote entity counts
- **SyncStore**: Sync operation progress

### Repository Pattern

Three-layer data architecture:

- **Tables** (`models/tables/`): Direct IndexedDB access via Dexie
- **Repositories** (`services/data/repositories/`): Business logic and data operations
- **Stores** (`services/stores/`): Observable reactive state

### Sync Architecture

Bidirectional synchronization with conflict resolution:

- **Full Sync**: Complete dataset synchronization
- **Incremental Sync**: Only modified entities since last sync
- **Conflict Strategies**:
  - `LAST_WRITE_WINS`: Most recent modification wins
  - `LOCAL_WINS`: Keep local changes
  - `REMOTE_WINS`: Accept remote changes
- **Batch Processing**: Entities synced in batches with individual retry
- **Image Handling**: Separate image upload after entity sync

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server (with HTTPS)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

The app runs on HTTPS by default for PWA features. Access at:

```
https://localhost:5173/app/dist
```

### Environment Setup

Configure API endpoint in the app settings or via:

```javascript
// Default API base URL
const API_URL = 'https://your-api-server.com';
```

## 🔧 Configuration

### PWA Configuration

Edit `vite.config.js` for PWA settings:

- Manifest configuration
- Service worker strategies
- Offline resources
- Icon generation

### Build Configuration

- **Base Path**: `/app/dist`
- **CSS Modules**: Scoped with SHA256 hash
- **Aliases**: `@src`, `@components`

### Commit Conventions

Using Conventional Commits with Commitlint:

```bash
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes
refactor: Code refactoring
test: Test changes
chore: Build/tooling changes
```

## 📊 State Management Flow

```
User Action
    ↓
Component
    ↓
Context (ApiContext, DataContext, etc.)
    ↓
Service (ApiService, DataService, SyncService)
    ↓
Repository (RecipeRepository, etc.)
    ↓
Table (RecipeTable via Dexie)
    ↓
IndexedDB
    ↓
Observable Store (notify subscribers)
    ↓
useObservableState Hook
    ↓
Component Re-render
```

## 🔄 Sync Flow

```
SyncService.sync()
    ↓
For each endpoint (types → ingredients → recipes):
    1. Fetch local entities (all or dirty)
    2. Fetch remote entities (all or since last sync)
    3. SyncConflictsService.detectConflicts()
        ↓
        - Compare timestamps
        - Detect modifications
        - Apply resolution strategy
    4. SyncImporter.import()
        ↓
        - Import remote entities to local
        - Handle name conflicts
        - Import missing dependencies
    5. SyncExporter.export()
        ↓
        - Export local entities in batches
        - Retry failures individually
        - Upload recipe images
        - Update sync dates
    ↓
Update lastSyncDate in SessionStore
Emit sync:completed event
```

## 🧪 Testing

```bash
# Lint code
npm run lint

# Format code
npx prettier --write .
```

## 📝 API Integration

The app syncs with a REST API following these conventions:

### Entity Endpoints

- `GET /api/{endpoint}` - Get all entities
- `GET /api/{endpoint}/{uuid}` - Get single entity
- `POST /api/{endpoint}` - Create/update entity
- `PUT /api/{endpoint}/bulk` - Bulk create/update
- `DELETE /api/{endpoint}/{uuid}` - Delete entity

### Special Endpoints

- `GET /api/recipes/{uuid}/dependencies` - Recipe with ingredients/types/image
- `POST /api/recipes/{uuid}/image` - Upload recipe image
- `GET /api/images/{uuid}/binary` - Download image binary

### Response Format

```json
{
  "@context": "/api/contexts/Recipe",
  "@id": "/api/recipes/{uuid}",
  "@type": "Recipe",
  "uuid": "...",
  "name": "...",
  "dateAdd": "...",
  "dateEdit": "..."
  // ... entity fields
}
```

## 🐛 Debug Mode

Enable debug logging in settings:

```javascript
DebugService.log(['message', data], 'category');
```

Categories: `sync`, `api`, `data`, `storage`

## 📄 License

Private project - All rights reserved

## 🤝 Contributing

This is a private project. Contributions are not currently accepted.

---

Built with ❤️ using React, Vite, and Dexie
