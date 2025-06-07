# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SceneFlow is an immersive theater performance simulator that visualizes and simulates stories with multiple characters progressing simultaneously in different locations. It's a React TypeScript application with a focus on causality tracking and visual story editing.

## Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test                    # Run all tests
npm test <file-path>       # Run specific test file
npm run test:ui            # Open Vitest UI
npm run coverage           # Generate coverage report

# Playwright E2E tests
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Open Playwright UI

# Code quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run format             # Format code with Prettier
npm run format:check       # Check formatting

# Build
npm run build              # Production build
npm run preview           # Preview production build
```

## Architecture Overview

### Core Concepts

1. **Entities**: Person, Location, Prop (ExtendedProp), Information
2. **Acts**: Actions with preconditions and postconditions for causality tracking
3. **WorldState**: Tracks entity positions and item ownership at any point in time
4. **Causality Engine**: Validates act sequences and tracks dependencies

### Key Directories

- `src/types/`: Core type definitions (StoryData, Entity types, Acts)
- `src/modules/causality/`: Causality engine and act implementations
- `src/components/`: React components for different views
- `src/pages/`: Main application pages
- `src/contexts/`: React contexts for global state

### Act System

Acts are the fundamental unit of action with:
- Preconditions that must be satisfied
- Postconditions that modify the world state
- Automatic validation through the causality engine

Example acts:
- MoveAct: Character movement between locations
- GiveItemAct/TakeItemAct: Item transfers
- UseItemAct/CombineItemsAct: Item transformations
- SpeakAct: Dialog and information sharing

### State Management

1. **AppContext**: Main application state (story data, simulation state)
2. **ExtendedState**: Persistent storage with LocalStorage
3. **WorldState**: Runtime state tracking during simulation

### Visual Components

1. **MapEditor**: Node-based location editor with pathfinding
2. **EntityEditor**: CRUD interface for all entity types
3. **CausalityView**: Dependency tracking visualization
4. **SimulationControls**: Timeline playback with speed control
5. **ValidationReporter**: Real-time constraint checking

## Testing Strategy

- Unit tests for core logic (acts, causality engine, state management)
- Component tests for UI behavior
- E2E tests for critical user workflows
- Performance tests for large datasets (500+ entities)

## Current Implementation Status

### Completed ✅
- Basic entity system with extended properties
- Act-based action system with causality tracking
- Map editor with node-based location editing
- Real-time simulation with timeline controls
- JSON import/export functionality
- React migration with TypeScript

### In Development 🔲
- Travel time between locations
- Character-centric timeline view
- Scene grouping (multiple acts as scenes)
- Item lifecycle tracking (creation/destruction)
- Advanced layout algorithms for map visualization

## Important Patterns

1. **Type Safety**: All entities use discriminated unions with entityType field
2. **Immutability**: State updates use immutable patterns
3. **Validation**: Acts validate preconditions before execution
4. **Extensibility**: New act types can be added by extending BaseAct

## Performance Considerations

- Maximum 500 concurrent entities
- 10MB data limit for import
- Efficient indexing for entity lookups
- Optimized rendering for map visualization