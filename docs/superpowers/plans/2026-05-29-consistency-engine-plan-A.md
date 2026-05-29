# 整合性エンジン 計画A（エンジン＋QuickLog統合＋検証ページ）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `initialStates`＋時刻順の`acts`からWorldStateを再生し、位置・分身・所持・知識の4種の破綻と来歴グラフを返す純粋エンジン `analyzeStory` を作り、QuickLogタイムライン（受け身バッジ）と検証ページに統合する。

**Architecture:** 純粋関数エンジンを `src/modules/consistency/` に新設（型・WorldState・checker を分離）。QuickLog の hook がエンジンを呼び、各 Act の破綻を `Map<actId, Breakage[]>` で配り、タイムライン行は行末に小さなアイコンで受け身表示。詳細パネルの「タイプ」自由入力を `ACT_KINDS` のセレクトに置換。検証ページはエンジンの破綻をカテゴリ別一覧で表示。来歴グラフ(nodes/edges)はエンジンが生成するが描画は計画B。

**Tech Stack:** TypeScript, Vitest + @testing-library/react + userEvent, React 18, CSS Modules。

参照仕様: `docs/superpowers/specs/2026-05-29-consistency-engine-design.md`

---

## ファイル構成

| ファイル                                                               | 責務                                                                                                | 種別 |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---- |
| `src/modules/consistency/types.ts`                                     | `FactRef`/`DiagnosticCategory`/`GraphNode`/`DependencyEdge`/`Breakage`/`ConsistencyReport`/`NodeId` | 新規 |
| `src/modules/consistency/actKinds.ts`                                  | `ACT_KINDS` 語彙と `getActKind`                                                                     | 新規 |
| `src/modules/consistency/worldState.ts`                                | `WorldState` クラスと `initWorldState`                                                              | 新規 |
| `src/modules/consistency/checker.ts`                                   | `analyzeStory(storyData): ConsistencyReport`                                                        | 新規 |
| `src/modules/consistency/index.ts`                                     | re-export                                                                                           | 新規 |
| `src/components/QuickLog/useQuickLog.ts`                               | `analyzeStory` を呼び `breakagesByActId` を返す                                                     | 修正 |
| `src/components/QuickLog/ActTimelineRow.tsx`                           | `Breakage[]` を受け取り行末に小アイコン                                                             | 修正 |
| `src/components/QuickLog/ActTimeline.tsx`                              | `breakagesByActId` を配る                                                                           | 修正 |
| `src/components/QuickLog/ActDetailPanel.tsx`                           | タイプを `ACT_KINDS` セレクトに置換                                                                 | 修正 |
| `src/components/QuickLog/QuickLogPage`（`src/pages/QuickLogPage.tsx`） | props 受け渡し更新                                                                                  | 修正 |
| `src/components/QuickLog/quickLogLogic.ts`                             | `detectMovementInconsistencies`/`isMoveAct` を削除                                                  | 修正 |
| `src/components/QuickLog/QuickLog.module.css`                          | 小アイコン用スタイル                                                                                | 修正 |
| `src/components/ValidationReporter/ValidationReporter.tsx`             | エンジンの破綻一覧に作り直し                                                                        | 修正 |
| `tests/modules/consistency/*.test.ts`                                  | エンジン単体テスト                                                                                  | 新規 |

注: 仕様の `facts.ts` は本計画では `types.ts` に統合する（`FactRef` を含む全エンジン型を 1 ファイルに）。

---

## Task 1: actKinds（語彙と判定）

**Files:**

- Create: `src/modules/consistency/actKinds.ts`
- Test: `tests/modules/consistency/actKinds.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/modules/consistency/actKinds.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ACT_KINDS, getActKind } from '../../../src/modules/consistency/actKinds'

describe('ACT_KINDS', () => {
  it('その他(空)を含み先頭にある', () => {
    expect(ACT_KINDS[0]).toEqual({ value: '', label: 'その他' })
  })
  it('主要な種類を持つ', () => {
    const values = ACT_KINDS.map(k => k.value)
    expect(values).toEqual(['', 'MOVE', 'TAKE', 'GIVE', 'DROP', 'USE', 'LEARN', 'SPEAK'])
  })
})

describe('getActKind', () => {
  it('大文字小文字を無視して既知種別を返す', () => {
    expect(getActKind({ type: 'move' })).toBe('MOVE')
    expect(getActKind({ type: 'GIVE' })).toBe('GIVE')
  })
  it('未設定・語彙外は空(その他)', () => {
    expect(getActKind({})).toBe('')
    expect(getActKind({ type: '殴る' })).toBe('')
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/modules/consistency/actKinds.test.ts`
Expected: FAIL（モジュール未作成）

- [ ] **Step 3: 実装**

`src/modules/consistency/actKinds.ts`:

```typescript
export type ActKindValue = '' | 'MOVE' | 'TAKE' | 'GIVE' | 'DROP' | 'USE' | 'LEARN' | 'SPEAK'

export interface ActKindDef {
  value: ActKindValue
  label: string
}

export const ACT_KINDS: ActKindDef[] = [
  { value: '', label: 'その他' },
  { value: 'MOVE', label: '移動' },
  { value: 'TAKE', label: '取得（物）' },
  { value: 'GIVE', label: '受け渡し' },
  { value: 'DROP', label: '設置' },
  { value: 'USE', label: '使用' },
  { value: 'LEARN', label: '取得（情報）' },
  { value: 'SPEAK', label: '会話/共有' },
]

const KNOWN = new Set<string>(['MOVE', 'TAKE', 'GIVE', 'DROP', 'USE', 'LEARN', 'SPEAK'])

export function getActKind(act: { type?: string }): ActKindValue {
  const t = (act.type ?? '').toUpperCase()
  return (KNOWN.has(t) ? t : '') as ActKindValue
}
```

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/modules/consistency/actKinds.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/modules/consistency/actKinds.ts tests/modules/consistency/actKinds.test.ts
git commit -m "feat(consistency): Act種類の語彙と判定を追加"
```

---

## Task 2: エンジンの型定義

**Files:**

- Create: `src/modules/consistency/types.ts`

型のみのため単体テストは作らず、`npx tsc --noEmit` で型が通ることを確認する（後続タスクの利用で実証）。

- [ ] **Step 1: 実装**

`src/modules/consistency/types.ts`:

```typescript
export type DiagnosticCategory = 'position' | 'colocation' | 'item' | 'info'

// グラフのノード ID: Act の id（number）または初期シードの文字列キー
export type NodeId = number | string

export type FactRef =
  | { kind: 'at'; personId: number; locationId: number }
  | { kind: 'owns'; personId: number; propId: number }
  | { kind: 'propAt'; propId: number; locationId: number }
  | { kind: 'knows'; personId: number; informationId: number }

export interface GraphNode {
  id: NodeId
  actId: number | null // 初期シードは null
  personId: number
  locationId: number | null
  startTime: number // 初期シードは -1
  label: string
}

export interface DependencyEdge {
  from: NodeId // 事実の産出元（上流）
  to: number // 事実を要求する Act
  fact: FactRef
}

export interface Breakage {
  actId: number
  category: DiagnosticCategory
  fact: FactRef | null
  message: string
}

export interface ConsistencyReport {
  nodes: GraphNode[]
  edges: DependencyEdge[]
  breakages: Breakage[]
  byActId: Map<number, Breakage[]>
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/modules/consistency/types.ts
git commit -m "feat(consistency): エンジンの型定義を追加"
```

---

## Task 3: WorldState（状態と初期化）

**Files:**

- Create: `src/modules/consistency/worldState.ts`
- Test: `tests/modules/consistency/worldState.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/modules/consistency/worldState.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { initWorldState } from '../../../src/modules/consistency/worldState'
import type { StoryData } from '../../../src/types/StoryData'

function story(over: Partial<StoryData> = {}): StoryData {
  return {
    persons: [],
    locations: [],
    props: [],
    informations: [],
    initialStates: [],
    acts: [],
    ...over,
  }
}

describe('initWorldState', () => {
  it('initialStatesから人物位置を初期化し産出元はinitial:<personId>', () => {
    const ws = initWorldState(
      story({ initialStates: [{ personId: 1, locationId: 10, time: '00:00' }] }),
    )
    expect(ws.positionOf(1)).toEqual({ locationId: 10, producer: 'initial:1' })
  })
  it('Prop.ownerを初期所持に反映する（文字列IDを数値化）', () => {
    const ws = initWorldState(story({ props: [{ id: 5, name: '鍵', owner: '1' }] }))
    expect(ws.ownerOf(5)?.ownerId).toBe(1)
  })
  it('Prop.currentLocationを初期所在に反映する', () => {
    const ws = initWorldState(story({ props: [{ id: 6, name: '箱', currentLocation: '10' }] }))
    expect(ws.propLocationOf(6)?.locationId).toBe(10)
  })
})

describe('WorldState mutators', () => {
  it('setPositionで位置と産出元を更新する', () => {
    const ws = initWorldState(story())
    ws.setPosition(1, 20, 99)
    expect(ws.positionOf(1)).toEqual({ locationId: 20, producer: 99 })
  })
  it('setOwnerは所在を解除し、setPropLocationは所有を解除する', () => {
    const ws = initWorldState(story())
    ws.setOwner(5, 1, 99)
    expect(ws.ownerOf(5)?.ownerId).toBe(1)
    ws.setPropLocation(5, 10, 100)
    expect(ws.ownerOf(5)).toBeUndefined()
    expect(ws.propLocationOf(5)?.locationId).toBe(10)
  })
  it('consumeで以後その物は所持も所在も無い', () => {
    const ws = initWorldState(story())
    ws.setOwner(5, 1, 99)
    ws.consume(5)
    expect(ws.ownerOf(5)).toBeUndefined()
    expect(ws.propLocationOf(5)).toBeUndefined()
  })
  it('setKnowsは最初の産出元を保持する', () => {
    const ws = initWorldState(story())
    ws.setKnows(1, 7, 99)
    ws.setKnows(1, 7, 100)
    expect(ws.knowerProducer(1, 7)).toBe(99)
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/modules/consistency/worldState.test.ts`
Expected: FAIL（モジュール未作成）

- [ ] **Step 3: 実装**

`src/modules/consistency/worldState.ts`:

```typescript
import type { StoryData } from '../../types/StoryData'
import type { NodeId } from './types'

interface PositionEntry {
  locationId: number
  producer: NodeId
}
interface OwnerEntry {
  ownerId: number
  producer: NodeId
}
interface PropLocationEntry {
  locationId: number
  producer: NodeId
}

export class WorldState {
  private positions = new Map<number, PositionEntry>()
  private propOwners = new Map<number, OwnerEntry>()
  private propLocations = new Map<number, PropLocationEntry>()
  private knowledge = new Map<number, Map<number, NodeId>>()
  private consumed = new Set<number>()

  positionOf(personId: number): PositionEntry | undefined {
    return this.positions.get(personId)
  }
  setPosition(personId: number, locationId: number, producer: NodeId): void {
    this.positions.set(personId, { locationId, producer })
  }
  ownerOf(propId: number): OwnerEntry | undefined {
    return this.consumed.has(propId) ? undefined : this.propOwners.get(propId)
  }
  setOwner(propId: number, ownerId: number, producer: NodeId): void {
    this.propOwners.set(propId, { ownerId, producer })
    this.propLocations.delete(propId)
  }
  propLocationOf(propId: number): PropLocationEntry | undefined {
    return this.consumed.has(propId) ? undefined : this.propLocations.get(propId)
  }
  setPropLocation(propId: number, locationId: number, producer: NodeId): void {
    this.propLocations.set(propId, { locationId, producer })
    this.propOwners.delete(propId)
  }
  consume(propId: number): void {
    this.consumed.add(propId)
    this.propOwners.delete(propId)
    this.propLocations.delete(propId)
  }
  knowerProducer(personId: number, informationId: number): NodeId | undefined {
    return this.knowledge.get(personId)?.get(informationId)
  }
  setKnows(personId: number, informationId: number, producer: NodeId): void {
    let m = this.knowledge.get(personId)
    if (!m) {
      m = new Map<number, NodeId>()
      this.knowledge.set(personId, m)
    }
    if (!m.has(informationId)) m.set(informationId, producer)
  }
}

export function initWorldState(story: StoryData): WorldState {
  const ws = new WorldState()
  for (const s of story.initialStates) {
    ws.setPosition(s.personId, s.locationId, `initial:${s.personId}`)
  }
  for (const p of story.props) {
    if (p.owner != null && p.owner !== '') {
      ws.setOwner(p.id, Number(p.owner), `initial:prop:${p.id}`)
    } else if (p.currentLocation != null && p.currentLocation !== '') {
      ws.setPropLocation(p.id, Number(p.currentLocation), `initial:prop:${p.id}`)
    }
  }
  return ws
}
```

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/modules/consistency/worldState.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/modules/consistency/worldState.ts tests/modules/consistency/worldState.test.ts
git commit -m "feat(consistency): WorldStateと初期化を追加"
```

---

## Task 4: checker（位置・分身・隣接・対人共在・来歴の骨格）

**Files:**

- Create: `src/modules/consistency/checker.ts`
- Test: `tests/modules/consistency/checker.test.ts`

このタスクで `analyzeStory` の骨格（再生ループ・位置 require・分身・隣接・対人共在・nodes・`at` エッジ・`byActId`）を実装する。item/info は Task 5 で追加する。

- [ ] **Step 1: 失敗するテストを書く**

`tests/modules/consistency/checker.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { analyzeStory } from '../../../src/modules/consistency/checker'
import type { StoryData, Act } from '../../../src/types/StoryData'

function story(over: Partial<StoryData> = {}): StoryData {
  return {
    persons: [
      { id: 1, name: '太郎', color: '#000' },
      { id: 2, name: '花子', color: '#111' },
    ],
    locations: [
      { id: 10, name: '広場', connections: [11] },
      { id: 11, name: '図書館', connections: [10] },
      { id: 12, name: '塔', connections: [] },
    ],
    props: [],
    informations: [],
    initialStates: [
      { personId: 1, locationId: 10, time: '00:00' },
      { personId: 2, locationId: 10, time: '00:00' },
    ],
    acts: [],
    ...over,
  }
}

function act(p: Partial<Act> & { id: number }): Act {
  return { personId: 1, locationId: 10, time: '00:00', description: '', startTime: 0, ...p }
}

const cat = (r: ReturnType<typeof analyzeStory>, actId: number) =>
  (r.byActId.get(actId) ?? []).map(b => b.category).sort()

describe('analyzeStory: position', () => {
  it('移動なしで現在地と違う場所のActを破綻にする', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 11, startTime: 10 })] }),
    )
    expect(cat(r, 1)).toContain('position')
  })
  it('MOVEを挟めば破綻しない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, locationId: 11, startTime: 10, type: 'MOVE' }),
          act({ id: 2, personId: 1, locationId: 11, startTime: 20 }),
        ],
      }),
    )
    expect(cat(r, 2)).not.toContain('position')
  })
  it('隣接していない場所へのMOVEを破綻にする', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 12, startTime: 10, type: 'MOVE' })] }),
    )
    expect(cat(r, 1)).toContain('position')
  })
  it('隣接するMOVEは破綻しない', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 11, startTime: 10, type: 'MOVE' })] }),
    )
    expect(cat(r, 1)).not.toContain('position')
  })
})

describe('analyzeStory: colocation', () => {
  it('同時刻に別の場所のActを分身として破綻にする', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 10 }),
          act({ id: 2, personId: 1, locationId: 11, startTime: 10 }),
        ],
      }),
    )
    expect(cat(r, 1)).toContain('colocation')
    expect(cat(r, 2)).toContain('colocation')
  })
  it('同時刻同場所は分身ではない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 10 }),
          act({ id: 2, personId: 1, locationId: 10, startTime: 10 }),
        ],
      }),
    )
    expect(cat(r, 1)).not.toContain('colocation')
  })
  it('別人物は分身に混同しない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 10 }),
          act({ id: 2, personId: 2, locationId: 10, startTime: 10 }),
        ],
      }),
    )
    expect(cat(r, 1)).not.toContain('colocation')
  })
})

describe('analyzeStory: 対人共在', () => {
  it('その場にいない相手への対人行動を破綻にする', () => {
    const r = analyzeStory(
      story({
        // 花子は MOVE で図書館へ。太郎は広場で花子を「拘束した」→ 花子不在
        acts: [
          act({ id: 1, personId: 2, locationId: 11, startTime: 5, type: 'MOVE' }),
          act({
            id: 2,
            personId: 1,
            locationId: 10,
            startTime: 10,
            description: '拘束した',
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(cat(r, 2)).toContain('colocation')
  })
  it('共在していれば対人行動は破綻しない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({
            id: 1,
            personId: 1,
            locationId: 10,
            startTime: 10,
            description: '拘束した',
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(cat(r, 1)).not.toContain('colocation')
  })
})

describe('analyzeStory: nodes/edges/byActId', () => {
  it('初期シードと各Actのノードを持つ', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 10, startTime: 10 })] }),
    )
    expect(r.nodes.some(n => n.id === 'initial:1')).toBe(true)
    expect(r.nodes.some(n => n.id === 1)).toBe(true)
  })
  it('満たされた位置requireに来歴エッジが張られる', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 10, startTime: 10 })] }),
    )
    expect(r.edges.some(e => e.to === 1 && e.fact.kind === 'at')).toBe(true)
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/modules/consistency/checker.test.ts`
Expected: FAIL（`analyzeStory` 未定義）

- [ ] **Step 3: 実装（骨格）**

`src/modules/consistency/checker.ts`:

```typescript
import type { StoryData, Act } from '../../types/StoryData'
import { getActKind } from './actKinds'
import { initWorldState } from './worldState'
import type {
  Breakage,
  ConsistencyReport,
  DependencyEdge,
  DiagnosticCategory,
  FactRef,
  GraphNode,
} from './types'

function sortForReplay(acts: Act[]): Act[] {
  return [...acts].sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0) || a.id - b.id)
}

export function analyzeStory(story: StoryData): ConsistencyReport {
  const ws = initWorldState(story)
  const personName = (id: number): string => story.persons.find(p => p.id === id)?.name ?? `#${id}`
  const locName = (id: number): string => story.locations.find(l => l.id === id)?.name ?? `#${id}`

  const nodes: GraphNode[] = []
  const edges: DependencyEdge[] = []
  const breakages: Breakage[] = []

  for (const s of story.initialStates) {
    nodes.push({
      id: `initial:${s.personId}`,
      actId: null,
      personId: s.personId,
      locationId: s.locationId,
      startTime: -1,
      label: `${personName(s.personId)} 初期位置: ${locName(s.locationId)}`,
    })
  }

  const adjacency = new Map<number, Set<number>>()
  for (const l of story.locations) adjacency.set(l.id, new Set(l.connections ?? []))
  const isAdjacent = (from: number, to: number): boolean =>
    from === to ||
    (adjacency.get(from)?.has(to) ?? false) ||
    (adjacency.get(to)?.has(from) ?? false)

  const sorted = sortForReplay(story.acts)

  // 分身: person@startTime で異なる locationId が複数
  const groups = new Map<string, Act[]>()
  for (const a of sorted) {
    const key = `${a.personId}@${a.startTime ?? 0}`
    const arr = groups.get(key) ?? []
    arr.push(a)
    groups.set(key, arr)
  }
  const colocated = new Set<number>()
  for (const arr of groups.values()) {
    if (new Set(arr.map(a => a.locationId)).size > 1) arr.forEach(a => colocated.add(a.id))
  }

  for (const act of sorted) {
    const kind = getActKind(act)
    nodes.push({
      id: act.id,
      actId: act.id,
      personId: act.personId,
      locationId: act.locationId,
      startTime: act.startTime ?? 0,
      label: act.description || `Act ${act.id}`,
    })

    const brek = (category: DiagnosticCategory, fact: FactRef | null, message: string): void => {
      breakages.push({ actId: act.id, category, fact, message })
    }

    if (colocated.has(act.id)) {
      brek('colocation', null, `${personName(act.personId)} が同時刻に複数の場所に存在しています`)
    }

    const cur = ws.positionOf(act.personId)
    if (kind === 'MOVE') {
      if (cur) {
        edges.push({
          from: cur.producer,
          to: act.id,
          fact: { kind: 'at', personId: act.personId, locationId: cur.locationId },
        })
        if (!isAdjacent(cur.locationId, act.locationId)) {
          brek(
            'position',
            null,
            `${personName(act.personId)} は ${locName(cur.locationId)} から ${locName(act.locationId)} へ直接移動できません（隣接していません）`,
          )
        }
      }
      ws.setPosition(act.personId, act.locationId, act.id)
    } else {
      if (!cur) {
        ws.setPosition(act.personId, act.locationId, act.id)
      } else if (cur.locationId !== act.locationId) {
        brek(
          'position',
          { kind: 'at', personId: act.personId, locationId: act.locationId },
          `${personName(act.personId)} は ${locName(cur.locationId)} におり ${locName(act.locationId)} にいないため「${act.description}」ができません`,
        )
        ws.setPosition(act.personId, act.locationId, act.id)
      } else {
        edges.push({
          from: cur.producer,
          to: act.id,
          fact: { kind: 'at', personId: act.personId, locationId: act.locationId },
        })
      }
    }

    if (act.interactedPersonId != null) {
      const tgt = ws.positionOf(act.interactedPersonId)
      if (!tgt || tgt.locationId !== act.locationId) {
        brek(
          'colocation',
          { kind: 'at', personId: act.interactedPersonId, locationId: act.locationId },
          `相手 ${personName(act.interactedPersonId)} が ${locName(act.locationId)} にいないため「${act.description}」ができません`,
        )
      } else {
        edges.push({
          from: tgt.producer,
          to: act.id,
          fact: { kind: 'at', personId: act.interactedPersonId, locationId: act.locationId },
        })
      }
    }

    // item / info は Task 5 で追加
  }

  const byActId = new Map<number, Breakage[]>()
  for (const b of breakages) {
    const arr = byActId.get(b.actId) ?? []
    arr.push(b)
    byActId.set(b.actId, arr)
  }

  return { nodes, edges, breakages, byActId }
}
```

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/modules/consistency/checker.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/modules/consistency/checker.ts tests/modules/consistency/checker.test.ts
git commit -m "feat(consistency): 位置・分身・隣接・対人共在の検査と来歴骨格を追加"
```

---

## Task 5: checker（アイテム所持と情報知識）

**Files:**

- Modify: `src/modules/consistency/checker.ts`
- Test: `tests/modules/consistency/checker.test.ts`

- [ ] **Step 1: 失敗するテストを追記**

`tests/modules/consistency/checker.test.ts` に describe を追記:

```typescript
describe('analyzeStory: item', () => {
  it('未所持のGIVEを破綻にする', () => {
    const r = analyzeStory(
      story({
        props: [{ id: 100, name: '鍵' }],
        acts: [
          act({
            id: 1,
            personId: 1,
            locationId: 10,
            startTime: 10,
            type: 'GIVE',
            propId: 100,
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(cat(r, 1)).toContain('item')
  })
  it('TAKEで所持してからのGIVEは破綻しない', () => {
    const r = analyzeStory(
      story({
        props: [{ id: 100, name: '鍵', currentLocation: '10' }],
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 5, type: 'TAKE', propId: 100 }),
          act({
            id: 2,
            personId: 1,
            locationId: 10,
            startTime: 10,
            type: 'GIVE',
            propId: 100,
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(cat(r, 2)).not.toContain('item')
  })
  it('その場にない物のTAKEを破綻にする', () => {
    const r = analyzeStory(
      story({
        props: [{ id: 100, name: '鍵', currentLocation: '11' }],
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 10, type: 'TAKE', propId: 100 }),
        ],
      }),
    )
    expect(cat(r, 1)).toContain('item')
  })
  it('TAKE→GIVEでownsの来歴エッジが張られる', () => {
    const r = analyzeStory(
      story({
        props: [{ id: 100, name: '鍵', currentLocation: '10' }],
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 5, type: 'TAKE', propId: 100 }),
          act({
            id: 2,
            personId: 1,
            locationId: 10,
            startTime: 10,
            type: 'GIVE',
            propId: 100,
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(r.edges.some(e => e.to === 2 && e.fact.kind === 'owns')).toBe(true)
  })
})

describe('analyzeStory: info', () => {
  it('知らない情報のSPEAKを破綻にする', () => {
    const r = analyzeStory(
      story({
        informations: [{ id: 200, content: '秘密' }],
        acts: [
          act({
            id: 1,
            personId: 1,
            locationId: 10,
            startTime: 10,
            type: 'SPEAK',
            informationId: 200,
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(cat(r, 1)).toContain('info')
  })
  it('LEARN後のSPEAKは破綻しない', () => {
    const r = analyzeStory(
      story({
        informations: [{ id: 200, content: '秘密' }],
        acts: [
          act({
            id: 1,
            personId: 1,
            locationId: 10,
            startTime: 5,
            type: 'LEARN',
            informationId: 200,
          }),
          act({
            id: 2,
            personId: 1,
            locationId: 10,
            startTime: 10,
            type: 'SPEAK',
            informationId: 200,
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(cat(r, 2)).not.toContain('info')
  })
  it('LEARN→SPEAKでknowsの来歴エッジが張られる', () => {
    const r = analyzeStory(
      story({
        informations: [{ id: 200, content: '秘密' }],
        acts: [
          act({
            id: 1,
            personId: 1,
            locationId: 10,
            startTime: 5,
            type: 'LEARN',
            informationId: 200,
          }),
          act({
            id: 2,
            personId: 1,
            locationId: 10,
            startTime: 10,
            type: 'SPEAK',
            informationId: 200,
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(r.edges.some(e => e.to === 2 && e.fact.kind === 'knows')).toBe(true)
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/modules/consistency/checker.test.ts`
Expected: FAIL（item/info 未実装で新規ケースが落ちる）

- [ ] **Step 3: 実装を追記**

`src/modules/consistency/checker.ts` の `// item / info は Task 5 で追加` の行を、以下のブロックに置き換える:

```typescript
if (
  act.propId != null &&
  (kind === 'TAKE' || kind === 'GIVE' || kind === 'DROP' || kind === 'USE')
) {
  const propName = (id: number): string => story.props.find(p => p.id === id)?.name ?? `#${id}`
  const owner = ws.ownerOf(act.propId)
  const ploc = ws.propLocationOf(act.propId)
  if (kind === 'TAKE') {
    if (!ploc || ploc.locationId !== act.locationId) {
      brek(
        'item',
        { kind: 'propAt', propId: act.propId, locationId: act.locationId },
        `${propName(act.propId)} は ${locName(act.locationId)} に無いため取得できません`,
      )
    } else {
      edges.push({
        from: ploc.producer,
        to: act.id,
        fact: { kind: 'propAt', propId: act.propId, locationId: act.locationId },
      })
    }
    ws.setOwner(act.propId, act.personId, act.id)
  } else if (kind === 'GIVE') {
    if (!owner || owner.ownerId !== act.personId) {
      brek(
        'item',
        { kind: 'owns', personId: act.personId, propId: act.propId },
        `${personName(act.personId)} は ${propName(act.propId)} を所持していないため渡せません`,
      )
    } else {
      edges.push({
        from: owner.producer,
        to: act.id,
        fact: { kind: 'owns', personId: act.personId, propId: act.propId },
      })
    }
    if (act.interactedPersonId != null) ws.setOwner(act.propId, act.interactedPersonId, act.id)
  } else if (kind === 'DROP') {
    if (!owner || owner.ownerId !== act.personId) {
      brek(
        'item',
        { kind: 'owns', personId: act.personId, propId: act.propId },
        `${personName(act.personId)} は ${propName(act.propId)} を所持していないため置けません`,
      )
    } else {
      edges.push({
        from: owner.producer,
        to: act.id,
        fact: { kind: 'owns', personId: act.personId, propId: act.propId },
      })
    }
    ws.setPropLocation(act.propId, act.locationId, act.id)
  } else {
    // USE
    if (!owner || owner.ownerId !== act.personId) {
      brek(
        'item',
        { kind: 'owns', personId: act.personId, propId: act.propId },
        `${personName(act.personId)} は ${propName(act.propId)} を所持していないため使えません`,
      )
    } else {
      edges.push({
        from: owner.producer,
        to: act.id,
        fact: { kind: 'owns', personId: act.personId, propId: act.propId },
      })
    }
    if (story.props.find(p => p.id === act.propId)?.isConsumable) ws.consume(act.propId)
  }
}

if (act.informationId != null && (kind === 'LEARN' || kind === 'SPEAK')) {
  const infoName = (id: number): string => {
    const i = story.informations.find(x => x.id === id)
    return i?.name ?? i?.content ?? `#${id}`
  }
  if (kind === 'LEARN') {
    ws.setKnows(act.personId, act.informationId, act.id)
  } else {
    // SPEAK
    const kp = ws.knowerProducer(act.personId, act.informationId)
    if (!kp) {
      brek(
        'info',
        { kind: 'knows', personId: act.personId, informationId: act.informationId },
        `${personName(act.personId)} は「${infoName(act.informationId)}」を知らないため話せません`,
      )
    } else {
      edges.push({
        from: kp,
        to: act.id,
        fact: { kind: 'knows', personId: act.personId, informationId: act.informationId },
      })
    }
    if (act.interactedPersonId != null)
      ws.setKnows(act.interactedPersonId, act.informationId, act.id)
  }
}
```

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/modules/consistency/checker.test.ts`
Expected: PASS（item/info 含む全ケース緑）

- [ ] **Step 5: コミット**

```bash
git add src/modules/consistency/checker.ts tests/modules/consistency/checker.test.ts
git commit -m "feat(consistency): アイテム所持と情報知識の検査・来歴を追加"
```

---

## Task 6: index re-export

**Files:**

- Create: `src/modules/consistency/index.ts`

- [ ] **Step 1: 実装**

`src/modules/consistency/index.ts`:

```typescript
export { analyzeStory } from './checker'
export { ACT_KINDS, getActKind } from './actKinds'
export type { ActKindValue, ActKindDef } from './actKinds'
export type {
  Breakage,
  ConsistencyReport,
  DependencyEdge,
  DiagnosticCategory,
  FactRef,
  GraphNode,
  NodeId,
} from './types'
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/modules/consistency/index.ts
git commit -m "feat(consistency): エンジンのindexを追加"
```

---

## Task 7: ActDetailPanel のタイプをセレクト化

**Files:**

- Modify: `src/components/QuickLog/ActDetailPanel.tsx`
- Test: `tests/components/ActDetailPanel.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`tests/components/ActDetailPanel.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ActDetailPanel } from '../../src/components/QuickLog/ActDetailPanel'
import type { Act } from '../../src/types/StoryData'

const act: Act = { id: 1, personId: 1, locationId: 10, time: '00:00', startTime: 0, description: '渡す' }

describe('ActDetailPanel 種類セレクト', () => {
  it('種類を選ぶとonChangeにtypeが渡る', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ActDetailPanel
        act={act}
        persons={[{ id: 1, name: '太郎', color: '#000' }]}
        locations={[{ id: 10, name: '広場', connections: [] }]}
        props={[]}
        informations={[]}
        onChange={onChange}
      />,
    )
    await user.selectOptions(screen.getByLabelText('種類'), 'GIVE')
    expect(onChange).toHaveBeenCalledWith({ type: 'GIVE' })
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/components/ActDetailPanel.test.tsx`
Expected: FAIL（種類セレクト未実装、getByLabelText('種類') が見つからない）

- [ ] **Step 3: 実装**

`src/components/QuickLog/ActDetailPanel.tsx` の import に追加:

```typescript
import { ACT_KINDS, getActKind } from '../../modules/consistency'
```

そして「タイプ」の `<label>` ブロック:

```typescript
      <label>
        タイプ
        <input value={act.type ?? ''} onChange={event => onChange({ type: event.target.value })} />
      </label>
```

を以下に置換:

```typescript
      <label>
        種類
        <select value={getActKind(act)} onChange={event => onChange({ type: event.target.value })}>
          {ACT_KINDS.map(kind => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
      </label>
```

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/components/ActDetailPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/components/QuickLog/ActDetailPanel.tsx tests/components/ActDetailPanel.test.tsx
git commit -m "feat(quick-log): 詳細パネルのタイプを種類セレクトに置換"
```

---

## Task 8: QuickLog をエンジンに接続（受け身バッジ）

**Files:**

- Modify: `src/components/QuickLog/useQuickLog.ts`
- Modify: `src/components/QuickLog/ActTimeline.tsx`
- Modify: `src/components/QuickLog/ActTimelineRow.tsx`
- Modify: `src/pages/QuickLogPage.tsx`
- Modify: `src/components/QuickLog/quickLogLogic.ts`
- Modify: `tests/components/quickLogLogic.test.ts`
- Modify: `src/components/QuickLog/QuickLog.module.css`
- Test: `tests/components/ActTimelineRow.test.tsx`

このタスクはデータ経路を一括で切り替え、リポジトリを緑に保つ。

- [ ] **Step 1: useQuickLog をエンジンに切替**

`src/components/QuickLog/useQuickLog.ts` を編集:

import 群から `detectMovementInconsistencies` を除き、`sortActs` のみ残す。エンジン import を追加:

```typescript
import { analyzeStory } from '../../modules/consistency'
import type { Breakage } from '../../modules/consistency'
```

`UseQuickLogReturn` の `inconsistentActIds: Set<number>` を以下に変更:

```typescript
breakagesByActId: Map<number, Breakage[]>
```

`inconsistentActIds` を計算している箇所:

```typescript
const inconsistentActIds = useMemo(
  () => (storyData ? detectMovementInconsistencies(storyData.acts) : new Set<number>()),
  [storyData],
)
```

を以下に置換:

```typescript
const breakagesByActId = useMemo(
  () => (storyData ? analyzeStory(storyData).byActId : new Map<number, Breakage[]>()),
  [storyData],
)
```

`return` の `inconsistentActIds,` を `breakagesByActId,` に変更。

- [ ] **Step 2: quickLogLogic から旧検出を削除**

`src/components/QuickLog/quickLogLogic.ts` から `export function isMoveAct(...)` と `export function detectMovementInconsistencies(...)` の 2 関数を丸ごと削除する（`sortActs`・`appendAct` 等は残す）。`tests/components/quickLogLogic.test.ts` から、import の `isMoveAct`・`detectMovementInconsistencies` を外し、`describe('isMoveAct', ...)` と `describe('detectMovementInconsistencies', ...)` の 2 ブロックを削除する（`describe('sortActs', ...)` とその `act()` ヘルパー、他の describe は残す）。

- [ ] **Step 3: ActTimelineRow を Breakage 表示に変更**

`src/components/QuickLog/ActTimelineRow.tsx` を編集。import に追加:

```typescript
import type { Breakage, DiagnosticCategory } from '../../modules/consistency'
```

props の `inconsistent: boolean` を `breakages: Breakage[]` に変更。`personName`/`locationName` 計算の下に追加:

```typescript
const CATEGORY_ICON: Record<DiagnosticCategory, string> = {
  position: '📍',
  colocation: '👥',
  item: '📦',
  info: '💬',
}
const categories = Array.from(new Set(breakages.map(b => b.category)))
const tooltip = breakages.map(b => b.message).join('\n')
```

JSX の動線バッジ:

```typescript
          {inconsistent && (
            <span className={styles.warningBadge} title="移動Actなしで場所が変化しています">
              ⚠ 動線
            </span>
          )}
```

を以下に置換（行末の控えめなアイコン群、修正 UI なし）:

```typescript
          {categories.length > 0 && (
            <span className={styles.breakIcons} title={tooltip}>
              {categories.map(c => (
                <span key={c} className={styles.breakIcon} aria-label={`整合性の警告: ${c}`}>
                  {CATEGORY_ICON[c]}
                </span>
              ))}
            </span>
          )}
```

- [ ] **Step 4: ActTimeline で breakages を配る**

`src/components/QuickLog/ActTimeline.tsx` を編集。import に追加:

```typescript
import type { Breakage } from '../../modules/consistency'
```

props の `inconsistentActIds: Set<number>` を `breakagesByActId: Map<number, Breakage[]>` に変更。`ActTimelineRow` 呼び出しの `inconsistent={inconsistentActIds.has(act.id)}` を以下に変更:

```typescript
          breakages={breakagesByActId.get(act.id) ?? []}
```

- [ ] **Step 5: QuickLogPage の受け渡しを更新**

`src/pages/QuickLogPage.tsx` で `useQuickLog()` の分割代入の `inconsistentActIds` を `breakagesByActId` に変更し、`<ActTimeline>` の `inconsistentActIds={inconsistentActIds}` を `breakagesByActId={breakagesByActId}` に変更。

- [ ] **Step 6: CSS に小アイコンスタイルを追加**

`src/components/QuickLog/QuickLog.module.css` の末尾に追加:

```css
.breakIcons {
  display: inline-flex;
  gap: 0.15rem;
  margin-left: 0.4rem;
  opacity: 0.7;
  font-size: 0.85rem;
  cursor: help;
}
.breakIcon {
  line-height: 1;
}
```

`.warningBadge` のルールは残してよい（未使用になるだけ。削除しても可）。

- [ ] **Step 7: ActTimelineRow のテスト**

`tests/components/ActTimelineRow.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ActTimelineRow } from '../../src/components/QuickLog/ActTimelineRow'
import type { Act } from '../../src/types/StoryData'
import type { Breakage } from '../../src/modules/consistency'

const act: Act = { id: 1, personId: 1, locationId: 10, time: '00:00', startTime: 0, description: 'する' }
const persons = [{ id: 1, name: '太郎', color: '#000' }]
const locations = [{ id: 10, name: '広場', connections: [] }]
const noop = (): void => {}

describe('ActTimelineRow', () => {
  it('破綻がなければアイコンを出さない', () => {
    render(
      <ActTimelineRow
        act={act}
        persons={persons}
        locations={locations}
        props={[]}
        informations={[]}
        breakages={[]}
        onUpdate={noop}
        onDelete={noop}
      />,
    )
    expect(screen.queryByLabelText(/整合性の警告/)).toBeNull()
  })
  it('破綻があれば対応カテゴリの控えめなアイコンを出す', () => {
    const breakages: Breakage[] = [{ actId: 1, category: 'position', fact: null, message: 'いない' }]
    render(
      <ActTimelineRow
        act={act}
        persons={persons}
        locations={locations}
        props={[]}
        informations={[]}
        breakages={breakages}
        onUpdate={noop}
        onDelete={noop}
      />,
    )
    expect(screen.getByLabelText('整合性の警告: position')).toBeInTheDocument()
  })
})
```

- [ ] **Step 8: 型・lint・全テスト**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: いずれもエラーなし、全テスト PASS（既存 QuickActInput/quickLogLogic テストも緑）

- [ ] **Step 9: コミット**

```bash
git add src/components/QuickLog src/pages/QuickLogPage.tsx tests/components/ActTimelineRow.test.tsx tests/components/quickLogLogic.test.ts
git commit -m "feat(quick-log): 整合性エンジンに接続し破綻を受け身アイコンで表示"
```

---

## Task 9: 検証ページを整合性レポートに作り直し

**Files:**

- Modify: `src/components/ValidationReporter/ValidationReporter.tsx`
- Test: `tests/components/ValidationReporter.test.tsx`

偽 `CausalityEngine` 依存を除き、`analyzeStory` の破綻をカテゴリ別に一覧表示する小さなコンポーネントに作り直す。既存の `ValidationReporter.module.css` のクラスは流用してよいが、無ければプレーン要素で可。

- [ ] **Step 1: 失敗するテストを書く**

`tests/components/ValidationReporter.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ValidationReporter } from '../../src/components/ValidationReporter/ValidationReporter'
import type { StoryData } from '../../src/types/StoryData'

vi.mock('../../src/contexts/VisualFeedbackContext', () => ({
  useVisualFeedback: vi.fn(() => ({ showNotification: vi.fn(), showError: vi.fn() })),
}))

const base: StoryData = {
  persons: [
    { id: 1, name: '太郎', color: '#000' },
    { id: 2, name: '花子', color: '#111' },
  ],
  locations: [
    { id: 10, name: '広場', connections: [11] },
    { id: 11, name: '図書館', connections: [10] },
  ],
  props: [],
  informations: [],
  initialStates: [{ personId: 1, locationId: 10, time: '00:00' }],
  acts: [],
}

describe('ValidationReporter（整合性レポート）', () => {
  it('破綻が無ければ「破綻なし」を表示', () => {
    render(<ValidationReporter storyData={base} />)
    expect(screen.getByText(/破綻は見つかりません/)).toBeInTheDocument()
  })
  it('破綻があればメッセージを表示する', () => {
    const data: StoryData = {
      ...base,
      acts: [{ id: 1, personId: 1, locationId: 11, time: '00:10', startTime: 10, description: '本を読む' }],
    }
    render(<ValidationReporter storyData={data} />)
    expect(screen.getByText(/いないため/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/components/ValidationReporter.test.tsx`
Expected: FAIL（現行 ValidationReporter は別出力／偽エンジン依存）

- [ ] **Step 3: 実装（作り直し）**

`src/components/ValidationReporter/ValidationReporter.tsx` を以下で全置換:

```typescript
import React, { useMemo } from 'react'
import type { StoryData } from '../../types/StoryData'
import { analyzeStory } from '../../modules/consistency'
import type { Breakage, DiagnosticCategory } from '../../modules/consistency'
import styles from './ValidationReporter.module.css'

interface ValidationReporterProps {
  storyData: StoryData
  className?: string
}

const CATEGORY_LABEL: Record<DiagnosticCategory, string> = {
  position: '位置・動線',
  colocation: '同時刻・共在',
  item: 'アイテム所持',
  info: '情報の知識',
}

export const ValidationReporter: React.FC<ValidationReporterProps> = ({ storyData, className }) => {
  const breakages = useMemo(() => analyzeStory(storyData).breakages, [storyData])

  const describe = (actId: number): string => {
    const act = storyData.acts.find(a => a.id === actId)
    if (!act) return `Act ${actId}`
    const person = storyData.persons.find(p => p.id === act.personId)?.name ?? `#${act.personId}`
    return `${act.time} ${person}「${act.description}」`
  }

  if (breakages.length === 0) {
    return (
      <div className={className}>
        <p>破綻は見つかりませんでした。</p>
      </div>
    )
  }

  const grouped = new Map<DiagnosticCategory, Breakage[]>()
  for (const b of breakages) {
    const arr = grouped.get(b.category) ?? []
    arr.push(b)
    grouped.set(b.category, arr)
  }

  return (
    <div className={className}>
      {(Object.keys(CATEGORY_LABEL) as DiagnosticCategory[])
        .filter(c => grouped.has(c))
        .map(category => (
          <section key={category} className={styles.category ?? undefined}>
            <h3>
              {CATEGORY_LABEL[category]}（{grouped.get(category)?.length}）
            </h3>
            <ul>
              {grouped.get(category)?.map((b, i) => (
                <li key={`${b.actId}-${i}`}>
                  <strong>{describe(b.actId)}</strong>: {b.message}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
```

注: `styles.category` が存在しない場合 `undefined` になるよう `?? undefined` で安全化している。`ValidationReporter.module.css` に `.category { margin-bottom: 1rem; }` を追加してよい（任意）。

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/components/ValidationReporter.test.tsx`
Expected: PASS

- [ ] **Step 5: 型・lint・全テスト**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: いずれもエラーなし、全テスト PASS

注: 旧 `ValidationReporter` が export していた型（`ValidationFix` 等）を他から import している箇所があればビルドが落ちる。`grep -rn "ValidationFix\|from '.*ValidationReporter'" src` で確認し、参照が `ValidationPage` からの `ValidationReporter` コンポーネント import のみであることを確かめる（型 import があれば本タスクで除去）。

- [ ] **Step 6: コミット**

```bash
git add src/components/ValidationReporter/ValidationReporter.tsx tests/components/ValidationReporter.test.tsx src/components/ValidationReporter/ValidationReporter.module.css
git commit -m "feat(validation): 検証ページを整合性エンジンの破綻一覧に作り直し"
```

---

## Self-Review チェック結果

**Spec coverage（計画Aの範囲＝フェーズ1〜3）:**

- 事実モデル・Act 種類語彙 → Task 1（actKinds）, Task 2（FactRef）
- WorldState 再生・初期化 → Task 3
- 4 種破綻＋対人共在＋来歴グラフ → Task 4（位置/分身/隣接/対人共在/nodes/at エッジ/byActId）, Task 5（item/info）
- QuickLog 受け身バッジ・種類セレクト・旧検出削除 → Task 7, 8
- 検証ページ作り直し → Task 9
- 受け入れ基準 1〜4 を満たす（5〜7 の因果ビュー・凍結・死蔵削除は計画B）

**Placeholder scan:** なし。各ステップに完全なコード・コマンド・期待値。

**Type consistency:** `analyzeStory(story): ConsistencyReport`（Task 4/5）、`ConsistencyReport.byActId: Map<number, Breakage[]>`（Task 2 → useQuickLog Task 8 で利用）、`Breakage`/`DiagnosticCategory`（Task 2 → Task 8/9 で利用）、`ACT_KINDS`/`getActKind`（Task 1 → Task 7 で利用）、`WorldState` の `positionOf/ownerOf/propLocationOf/knowerProducer/setPosition/setOwner/setPropLocation/setKnows/consume`（Task 3 → Task 4/5 で利用）整合。`useQuickLog` の返り値は `inconsistentActIds`→`breakagesByActId` に統一して全消費側（ActTimeline/QuickLogPage）を同時更新（Task 8）。

## 計画B（後続・別計画）に回す範囲

- フェーズ4: 因果ビューを `analyzeStory` の nodes/edges/breakages を描画するグラフに作り直し、偽 `modules/core/causalityEngine.ts` を削除
- フェーズ5: 関係性をナビ/ルートから凍結
- フェーズ6: 死蔵コード・二重型の削除（テスト削除はユーザー確認）
- E2E（Playwright）通し確認
