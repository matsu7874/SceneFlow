# Advanced Components Analysis for React Conversion

This document provides a comprehensive analysis of the advanced TypeScript components that need to be converted to React.

## Component Overview

### 1. CausalityView (`src/modules/ui/causalityView.ts`)

**Purpose**: Provides visual representation of causal relationships in the timeline

**Key Features**:
- Dual rendering approach: Canvas for performance + SVG for interactivity
- Node-based visualization of Acts with connections showing causal relationships
- Interactive features: pan, zoom, node selection, drag & drop
- Automatic layout algorithms (topological ordering)
- Real-time validation feedback with error indicators
- Path highlighting for causal chains
- Minimap support (placeholder)

**State Management**:
- Nodes map (id -> CausalNode)
- Edges map (id -> CausalEdge)
- Selected node/edge tracking
- View state (zoom, pan)
- Layout options

**Dependencies**:
- CausalityEngine
- VisualFeedbackManager
- Act, WorldState, EntityId types

**Rendering Methods**:
- `render()`: Main render orchestrator
- `renderNodes()`, `renderEdges()`: Core visualization
- `renderValidationErrors()`: Error indicators
- Uses both Canvas 2D context and SVG elements

**Event Handlers**:
- Mouse events for selection, dragging, panning
- Wheel events for zooming
- Window resize handling

### 2. EntityEditor (`src/modules/ui/entityEditor/EntityEditor.ts`)

**Purpose**: Form-based UI for editing entities with validation and relationship management

**Key Features**:
- Dynamic form generation based on entity type
- Field grouping with collapsible sections
- Real-time validation with error display
- Support for complex fields (arrays, objects, relationships)
- Entity type-specific attribute editors
- Tag and metadata editing
- Multi-entity relationship management

**State Management**:
- Current entity being edited
- Form elements map
- Available entities for relationships
- Validators map

**Dependencies**:
- VisualFeedbackManager
- Entity types (PersonEntity, LocationEntity, ItemEntity, InformationEntity)

**Rendering Methods**:
- `render()`: Main form renderer
- `renderEntityForm()`: Dynamic form generation
- `renderField()`: Field-specific rendering logic
- Type-specific attribute renderers

**Event Handlers**:
- Form field change handlers
- Entity type selection
- Save/Delete actions
- Tag and array item management

### 3. MapEditor (`src/modules/ui/mapEditor/MapEditor.ts`)

**Purpose**: Node-based visual editor for location connections and spatial relationships

**Key Features**:
- Interactive map visualization of locations
- Connection creation and management
- Multiple layout algorithms (force-directed, circular, grid, hierarchical)
- Pathfinding with A* algorithm
- Node dragging with grid snapping
- Selection and multi-selection support
- Minimap (placeholder)
- Sidebar with node properties and path analysis

**State Management**:
- Nodes map (location entities)
- Connections map
- Selected nodes set
- Path finding state
- View state (zoom, pan)

**Dependencies**:
- VisualFeedbackManager
- EditableEntity
- Connection types
- PathfindingManager (internal)
- LayoutManager (internal)

**Rendering Methods**:
- Canvas-based rendering with SVG overlay
- Grid background
- Node and connection rendering
- Path visualization

**Event Handlers**:
- Mouse events for node interaction
- Keyboard shortcuts
- Toolbar controls
- Mode toggles (grid, 3D, minimap)

### 4. RelationshipEditor (`src/modules/ui/entityEditor/RelationshipEditor.ts`)

**Purpose**: Advanced editor for managing relationships and connections between entities

**Key Features**:
- Dual mode: relationships (people) and connections (locations)
- Visual graph representation
- Relationship strength visualization
- Connection type indicators
- Interactive node positioning
- Entity list sidebar
- Detailed relationship/connection properties
- Export functionality

**State Management**:
- Entities map
- Relationships map
- Connections map
- Nodes with positions
- Selection state
- Mode (relationships/connections/both)

**Dependencies**:
- VisualFeedbackManager
- EditableEntity
- RelationshipType and ConnectionType enums

**Rendering Methods**:
- Canvas + SVG dual rendering
- Curved paths for relationships
- Straight lines for connections
- Node rendering with type indicators

**Event Handlers**:
- Node dragging
- Selection handling
- Mode switching
- Export action

### 5. ValidationReporter (`src/modules/validation/reporter.ts`)

**Purpose**: Automatic validation system for temporal conflicts and logical inconsistencies

**Key Features**:
- Comprehensive validation report generation
- Multiple validation types (temporal paradox, deadlock, redundancy, state consistency)
- Suggestion generation for fixing issues
- Confidence scoring for suggestions
- Issue categorization by severity and type
- Async validation with timeout support

**State Management**:
- Validation configuration
- Issue and suggestion counters
- No UI state (pure logic component)

**Dependencies**:
- CausalityEngine
- Act, WorldState types
- No UI dependencies (can be used headlessly)

**Key Methods**:
- `generateReport()`: Main validation entry point
- Various detection methods (temporal paradoxes, deadlocks, etc.)
- Suggestion generation per issue type
- Helper methods for graph analysis

## Shared Dependencies and Utilities

### VisualFeedbackManager (`src/modules/ui/visualFeedback.ts`)

**Purpose**: Provides visual indicators for action validity and execution feedback

**Key Features**:
- Entity feedback (outline colors, tooltips)
- Action validation feedback
- Notification system
- Animation support
- Auto-removal with duration

**Used by**: All UI components for feedback

## React Conversion Strategy

### Component Architecture
1. Each component should be converted to a React functional component with hooks
2. Canvas/SVG rendering should use refs and useEffect for lifecycle management
3. State management should use useState/useReducer as appropriate
4. Event handlers should be memoized with useCallback

### State Management
1. Local component state for UI-specific state
2. Consider context or external state management for shared data
3. Maintain separation between business logic and UI state

### Rendering Approach
1. For canvas-based components: Use refs and imperative rendering in useEffect
2. For SVG elements: Use React's declarative SVG rendering where possible
3. Consider React.memo for performance optimization

### Key Considerations
1. Preserve the dual Canvas/SVG rendering approach where used
2. Maintain event handling patterns but adapt to React's synthetic events
3. Convert class-based lifecycle to hooks
4. Ensure proper cleanup in useEffect returns
5. Consider extracting business logic into custom hooks

### Shared Utilities
1. VisualFeedbackManager could become a React context provider
2. Layout algorithms and pathfinding can remain as pure functions
3. Validation logic should remain separate from UI components

## Priority Order for Conversion
1. VisualFeedbackManager (dependency for others)
2. EntityEditor (most self-contained)
3. RelationshipEditor (builds on EntityEditor patterns)
4. MapEditor (complex but independent)
5. CausalityView (most complex, benefits from lessons learned)
6. ValidationReporter (can be used as-is, just needs React wrapper)