# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SceneFlow is an immersive theater performance simulator that visualizes and simulates stories with multiple characters progressing simultaneously in different locations. It's a React TypeScript application with a focus on consistency checking and visual story editing.

## Development Commands

```bash
# Start development server
pnpm run dev

# Run tests
pnpm test                    # Run all tests
pnpm test <file-path>        # Run specific test file
pnpm run test:ui             # Open Vitest UI
pnpm run coverage            # Generate coverage report

# Playwright E2E tests
pnpm run test:e2e            # Run E2E tests
pnpm run test:e2e:ui         # Open Playwright UI

# Code quality
pnpm run lint                # Run ESLint
pnpm run lint:fix            # Fix ESLint issues
pnpm run typecheck           # Type check (tsc --noEmit)
pnpm run format              # Format code with Prettier
pnpm run format:check        # Check formatting

# Build
pnpm run build               # Production build
pnpm run preview             # Preview production build
```

`pnpm run dev` / `pnpm run build` automatically run `copy-dict` (copies the kuromoji dictionary into `public/`, via the `copy-kuromoji-dict` bin from `@matsu7874/kuromoji-web`) via pre-hooks.

## Architecture Overview

### Core Concepts

1. **Entities**: Person, Location, Prop (ExtendedProp), Information
2. **Acts**: Timestamped actions (`act.type`: MOVE/TAKE/GIVE/DROP/USE/LEARN/SPEAK/ATTACK/INCAPACITATE/KILL/WAKE)
3. **Consistency Checker**: `analyzeStory` in `src/modules/consistency/checker.ts` is the single authority for story validation. It replays acts chronologically and detects breakages (movement, possession, knowledge, life/death)
4. **WorldState**: Tracks entity positions, item ownership, and knowledge at any point in time (`src/modules/consistency/worldState.ts`)

### Key Directories

- `src/types/`: Core type definitions (StoryData, extended entity types)
- `src/modules/consistency/`: Story validation engine (checker, worldState, actKinds, misinformation, opportunity)
- `src/modules/nlp/`: Morphological analysis (kuromoji) for entity extraction from act descriptions
- `src/components/`: React components for different views
- `src/pages/`: Main application pages (9 pages, route-based code splitting in App.tsx)
- `src/contexts/`: React contexts (AppContext = story data + undo/redo + persistence)
- `src/hooks/`, `src/utils/`: Shared hooks and utilities (normalizeStoryData, eventGeneration)
- `tests/`: Vitest unit tests, `e2e/`: Playwright tests (helpers in `e2e/helpers.ts`)

### Pages (navigation phases)

- **① 書く**: QuickLogPage (/log), DataPage (/data)
- **② 組む**: EntitiesPage (/entities), SpaceWorkspacePage (/space), RelationshipsPage (/relationships, view-only)
- **③ 検証・分析**: ValidationPage (/validation), SimulationPage (/simulation), OpportunityPage (/opportunity), CausalityPage (/causality)

### State Management

1. **AppContext**: Single source of truth for story data. `setStoryData` normalizes all input via `normalizeStoryData` and persists to localStorage (`storyPersistence.ts`). Global undo/redo history
2. **WorldState**: Runtime state tracking during simulation/validation (rebuilt from acts, not persisted)

### Visual Components

1. **MapEditor** (`src/components/MapEditor/`): Node-based location editor with pathfinding, auto-layout (grid/circle/force-directed), and overlay extension points (`renderOverlay`, `onMapDataChange`)
2. **EntityEditor**: CRUD interface for all entity types
3. **CausalityView**: Fact/testimony dependency graph
4. **SimulationControls**: Timeline playback with speed control
5. **ValidationReporter**: Renders analyzeStory results by category

## Testing Strategy

- Unit tests for core logic (consistency checker, contexts, utils) in `tests/`
- Component tests for UI behavior (`tests/components/`)
- E2E tests for critical user workflows (`e2e/`, runs in CI). Use `loadStoryData`/`navTo` helpers
- All pages are wrapped in ErrorBoundary (page-level, see App.tsx `withBoundary`)

## Current Implementation Status

### Completed ✅

- Entity system with extended properties
- Consistency checking (movement, possession, knowledge, life/death, lock/key, alibi timing, contradiction)
- Space workspace (/space): map editing + flow lines + breakage overlay
- Quick log input → story data, NLP entity extraction
- Opportunity analysis (who could have done it)
- Real-time simulation with timeline controls
- JSON import/export, localStorage auto-save, global undo/redo
- Route-based code splitting (custom lazyPage helper — do NOT replace with React.lazy; see App.tsx comment)

### In Development 🔲

- Travel time between locations (validation exists; editing UI is partial)
- Character-centric timeline view (not started; OpportunityPage covers reverse lookup only)
- Scene grouping (multiple acts as scenes; not started)
- Item lifecycle tracking (flags exist; no CREATE/DESTROY acts)

## Important Patterns

1. **Validation authority**: All story validation goes through `analyzeStory`. Do not create parallel validation engines
2. **Normalization**: StoryData entering AppContext is always normalized (referential integrity). Keep `normalizeStoryData` idempotent
3. **Immutability**: State updates use immutable patterns
4. **Type Safety**: Entities use discriminated unions with entityType field

## Performance Considerations

- Initial bundle is code-split per route; keep heavy deps (e.g., kuromoji) out of the entry chunk
