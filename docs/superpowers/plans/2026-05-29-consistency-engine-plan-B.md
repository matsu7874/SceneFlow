# 整合性エンジン 計画B（因果ビュー来歴グラフ化＋関係性凍結＋E2E）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 偽の因果エンジンに依存する `CausalityView` を、整合性エンジン `analyzeStory` の来歴グラフ（nodes/edges/breakages）を描画し破綻箇所の上流・下流を辿れるビューに作り直す。関係性ページをナビ/ルートから凍結する。E2E で価値ループを確認する。

**Architecture:** `CausalityView` を `storyData` から `analyzeStory` を呼ぶ自己完結コンポーネントに作り直し（時刻×人物のSVGレイアウト、破綻ノード強調、ノード選択で上流/下流ハイライト）。偽 `modules/core/causalityEngine.ts` への live 経路の依存を除去（ファイル自体の削除は別途の死蔵掃除パス）。関係性は App.tsx のルートと Navigation のリンクを外して凍結。

**Tech Stack:** TypeScript, React 18 (SVG), Vitest + @testing-library/react, Playwright, CSS Modules。

参照仕様: `docs/superpowers/specs/2026-05-29-consistency-engine-design.md`（フェーズ4・5・E2E）。フェーズ6（広範な死蔵コード・二重型削除）は本計画の対象外。理由: 偽エンジンと旧モジュール群（`modules/ui/*`, `modules/causality/*`, `modules/simulation/core`, `modules/validation/reporter`）は相互に依存し、対応テスト（`tests/ui/*`, `tests/causality/*`, `tests/simulation/*`, `tests/performance/largeDataset.test.ts`, `tests/state/*`, `tests/validation/*`）と、セッション開始時点で未コミットの変更があるテストファイルとも絡むため、独立した慎重なパスで扱う。

---

## ファイル構成

| ファイル                                                  | 責務                                                                  | 種別         |
| --------------------------------------------------------- | --------------------------------------------------------------------- | ------------ |
| `src/components/CausalityView/CausalityView.tsx`          | `analyzeStory` の来歴グラフを SVG 描画。破綻強調・上流/下流ハイライト | 全面書き換え |
| `src/components/CausalityView/CausalityView.module.css`   | グラフのスタイル                                                      | 全面書き換え |
| `src/components/CausalityView/CausalityView.tsx.bak`      | 残骸                                                                  | 削除         |
| `src/components/CausalityView/CausalityView.tsx.original` | 残骸                                                                  | 削除         |
| `src/pages/CausalityPage.tsx`                             | 変更なし（`storyData` を渡す既存実装のまま）                          | 変更なし     |
| `src/App.tsx`                                             | `/relationships` ルートを削除                                         | 修正         |
| `src/components/Navigation/Navigation.tsx`                | 「関係性」リンクを削除                                                | 修正         |
| `tests/components/CausalityView.test.tsx`                 | 因果ビューの描画テスト                                                | 新規         |
| `e2e/consistency.spec.ts`                                 | 因果ビューの破綻表示・関係性凍結のE2E                                 | 新規         |

注: `CausalityPage.tsx` は現状 `<CausalityView storyData={storyData} />` を `ErrorBoundary` で包んで呼ぶだけなので変更不要。新 `CausalityView` は `storyData: StoryData` のみを props に取る。

---

## Task B1: 因果ビューを来歴グラフに作り直す

**Files:**

- Modify (全面書き換え): `src/components/CausalityView/CausalityView.tsx`
- Modify (全面書き換え): `src/components/CausalityView/CausalityView.module.css`
- Delete: `src/components/CausalityView/CausalityView.tsx.bak`, `src/components/CausalityView/CausalityView.tsx.original`
- Test: `tests/components/CausalityView.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`tests/components/CausalityView.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { CausalityView } from '../../src/components/CausalityView/CausalityView'
import type { StoryData } from '../../src/types/StoryData'

const data: StoryData = {
  persons: [
    { id: 1, name: '太郎', color: '#000' },
    { id: 2, name: '花子', color: '#111' },
  ],
  locations: [
    { id: 10, name: '広場', connections: [11] },
    { id: 11, name: '図書館', connections: [10] },
  ],
  props: [{ id: 100, name: '鍵', currentLocation: '11' }],
  informations: [],
  initialStates: [
    { personId: 1, locationId: 10, time: '00:00' },
    { personId: 2, locationId: 10, time: '00:00' },
  ],
  // 太郎は鍵(図書館)を所持していないのに渡す → item 破綻
  acts: [
    { id: 1, personId: 1, locationId: 10, time: '00:10', startTime: 10, description: '鍵を渡す', type: 'GIVE', propId: 100, interactedPersonId: 2 },
  ],
}

describe('CausalityView（来歴グラフ）', () => {
  it('各Actのノードを描画する', () => {
    render(<CausalityView storyData={data} />)
    expect(screen.getByTestId('node-act-1')).toBeInTheDocument()
  })
  it('破綻ノードを data-breakage=true で示す', () => {
    render(<CausalityView storyData={data} />)
    expect(screen.getByTestId('node-act-1')).toHaveAttribute('data-breakage', 'true')
  })
  it('破綻なしの初期シードノードは data-breakage=false', () => {
    render(<CausalityView storyData={data} />)
    expect(screen.getByTestId('node-initial-1')).toHaveAttribute('data-breakage', 'false')
  })
  it('ノードをクリックすると選択状態になる', async () => {
    const user = userEvent.setup()
    render(<CausalityView storyData={data} />)
    await user.click(screen.getByTestId('node-act-1'))
    expect(screen.getByTestId('node-act-1')).toHaveAttribute('data-selected', 'true')
  })
}）
```

注: 最後の閉じ括弧は半角 `)` です（上の全角は誤記。実装時は `})` とすること）。

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/components/CausalityView.test.tsx`
Expected: FAIL（新コンポーネント未実装、testid が無い）

- [ ] **Step 3: 実装（CausalityView 全面書き換え）**

`src/components/CausalityView/CausalityView.tsx` を以下で全置換:

```typescript
import React, { useMemo, useState } from 'react'
import type { StoryData } from '../../types/StoryData'
import { analyzeStory } from '../../modules/consistency'
import type { GraphNode, NodeId } from '../../modules/consistency'
import styles from './CausalityView.module.css'

interface CausalityViewProps {
  storyData: StoryData
}

const GUTTER = 96
const MARGIN_X = 16
const MARGIN_Y = 16
const COL_W = 200
const ROW_H = 84
const NODE_W = 168
const NODE_H = 48

const key = (id: NodeId): string => String(id)

export const CausalityView: React.FC<CausalityViewProps> = ({ storyData }) => {
  const report = useMemo(() => analyzeStory(storyData), [storyData])
  const [selected, setSelected] = useState<string | null>(null)

  const personName = (id: number): string =>
    storyData.persons.find(p => p.id === id)?.name ?? `#${id}`

  // 行=人物（id昇順）、列=startTime（昇順、初期シードの-1を先頭に）
  const personIds = useMemo(() => {
    const ids = Array.from(new Set(report.nodes.map(n => n.personId)))
    return ids.sort((a, b) => a - b)
  }, [report])
  const times = useMemo(() => {
    const ts = Array.from(new Set(report.nodes.map(n => n.startTime)))
    return ts.sort((a, b) => a - b)
  }, [report])

  const rowOf = (personId: number): number => Math.max(0, personIds.indexOf(personId))
  const colOf = (startTime: number): number => Math.max(0, times.indexOf(startTime))

  const xOf = (n: GraphNode): number => GUTTER + MARGIN_X + colOf(n.startTime) * COL_W
  const yOf = (n: GraphNode): number => MARGIN_Y + rowOf(n.personId) * ROW_H

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>()
    for (const n of report.nodes) m.set(key(n.id), n)
    return m
  }, [report])

  // 上流/下流ハイライト用の隣接
  const { outMap, inMap } = useMemo(() => {
    const out = new Map<string, string[]>()
    const inc = new Map<string, string[]>()
    for (const e of report.edges) {
      const f = key(e.from)
      const t = key(e.to)
      ;(out.get(f) ?? out.set(f, []).get(f)!).push(t)
      ;(inc.get(t) ?? inc.set(t, []).get(t)!).push(f)
    }
    return { outMap: out, inMap: inc }
  }, [report])

  const highlighted = useMemo(() => {
    if (!selected) return null
    const hi = new Set<string>([selected])
    const up = [selected]
    while (up.length) {
      const n = up.pop() as string
      for (const f of inMap.get(n) ?? []) if (!hi.has(f)) (hi.add(f), up.push(f))
    }
    const dn = [selected]
    while (dn.length) {
      const n = dn.pop() as string
      for (const t of outMap.get(n) ?? []) if (!hi.has(t)) (hi.add(t), dn.push(t))
    }
    return hi
  }, [selected, inMap, outMap])

  const breakageActIds = report.byActId

  const width = GUTTER + MARGIN_X + Math.max(1, times.length) * COL_W + NODE_W
  const height = MARGIN_Y + Math.max(1, personIds.length) * ROW_H + NODE_H

  const isDimNode = (id: string): boolean => highlighted !== null && !highlighted.has(id)
  const isDimEdge = (from: string, to: string): boolean =>
    highlighted !== null && !(highlighted.has(from) && highlighted.has(to))

  if (report.nodes.length === 0) {
    return <p className={styles.empty}>表示するイベントがありません。</p>
  }

  return (
    <div className={styles.container}>
      <p className={styles.hint}>
        ノードをクリックすると、その事実の上流（供給元）と下流（依存先）が強調されます。赤いノードは破綻（前提が満たされていない箇所）です。
      </p>
      <div className={styles.scroll}>
        <svg width={width} height={height} className={styles.svg}>
          {/* 人物行ラベル */}
          {personIds.map((pid, i) => (
            <text key={`row-${pid}`} x={MARGIN_X} y={MARGIN_Y + i * ROW_H + NODE_H / 2} className={styles.rowLabel}>
              {personName(pid)}
            </text>
          ))}
          {/* エッジ */}
          {report.edges.map((e, i) => {
            const from = nodeById.get(key(e.from))
            const to = nodeById.get(key(e.to))
            if (!from || !to) return null
            const x1 = xOf(from) + NODE_W
            const y1 = yOf(from) + NODE_H / 2
            const x2 = xOf(to)
            const y2 = yOf(to) + NODE_H / 2
            return (
              <line
                key={`edge-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={`${styles.edge} ${isDimEdge(key(e.from), key(e.to)) ? styles.dim : ''}`}
              />
            )
          })}
          {/* ノード */}
          {report.nodes.map(n => {
            const id = key(n.id)
            const isSeed = n.actId === null
            const hasBreak = n.actId !== null && breakageActIds.has(n.actId)
            const selectedNow = selected === id
            const breakMsgs =
              n.actId !== null ? (breakageActIds.get(n.actId) ?? []).map(b => b.message).join('\n') : ''
            const testid = isSeed ? `node-initial-${n.personId}` : `node-act-${n.actId}`
            return (
              <g
                key={id}
                data-testid={testid}
                data-breakage={hasBreak ? 'true' : 'false'}
                data-selected={selectedNow ? 'true' : 'false'}
                transform={`translate(${xOf(n)}, ${yOf(n)})`}
                className={`${styles.node} ${isDimNode(id) ? styles.dim : ''}`}
                onClick={() => setSelected(prev => (prev === id ? null : id))}
              >
                <title>{hasBreak ? breakMsgs : n.label}</title>
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  className={`${isSeed ? styles.seedRect : hasBreak ? styles.breakRect : styles.actRect} ${selectedNow ? styles.selectedRect : ''}`}
                />
                <text x={8} y={NODE_H / 2 + 4} className={styles.nodeLabel}>
                  {n.label.length > 18 ? `${n.label.slice(0, 17)}…` : n.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
```

注: `(out.get(f) ?? out.set(f, []).get(f)!)` のイディオムが lint/prettier で扱いにくい場合は、明示的に

```typescript
for (const e of report.edges) {
  const f = key(e.from)
  const t = key(e.to)
  if (!out.has(f)) out.set(f, [])
  out.get(f)!.push(t)
  if (!inc.has(t)) inc.set(t, [])
  inc.get(t)!.push(f)
}
```

の形に書き換えてよい（こちらを推奨）。同様に `highlighted` の `(hi.add(f), up.push(f))` カンマ式は、

```typescript
for (const f of inMap.get(n) ?? []) {
  if (!hi.has(f)) {
    hi.add(f)
    up.push(f)
  }
}
```

に展開してよい（ESLint 準拠のため推奨）。

`src/components/CausalityView/CausalityView.module.css` を以下で全置換:

```css
.container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hint {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  margin: 0;
}
.scroll {
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  max-height: 70vh;
}
.svg {
  display: block;
}
.rowLabel {
  font-size: 12px;
  fill: var(--color-text-secondary);
  dominant-baseline: middle;
}
.node {
  cursor: pointer;
}
.nodeLabel {
  font-size: 12px;
  fill: var(--color-text-primary);
  pointer-events: none;
}
.actRect {
  fill: var(--color-surface-hover);
  stroke: var(--color-border-hover);
  stroke-width: 1;
}
.seedRect {
  fill: var(--color-background);
  stroke: var(--color-border);
  stroke-width: 1;
  stroke-dasharray: 4 3;
}
.breakRect {
  fill: color-mix(in srgb, var(--color-error) 16%, transparent);
  stroke: var(--color-error);
  stroke-width: 2;
}
.selectedRect {
  stroke: var(--color-primary);
  stroke-width: 3;
}
.edge {
  stroke: var(--color-border-hover);
  stroke-width: 1.5;
}
.dim {
  opacity: 0.2;
}
.empty {
  color: var(--color-text-disabled);
  padding: 1rem;
}
```

`.bak`/`.original` を削除:

```bash
git rm src/components/CausalityView/CausalityView.tsx.bak src/components/CausalityView/CausalityView.tsx.original
```

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/components/CausalityView.test.tsx`
Expected: PASS（4ケース）

- [ ] **Step 5: 型・lint・全テスト**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: いずれもエラーなし、全テスト PASS。
注: 旧 `CausalityView` が import していた `CausalityEngine`/`generateEventsFromActs`/`useVisualFeedback`/`timeToMinutes`/`types`(index) への依存が消える。`CausalityPage.tsx` は `<CausalityView storyData={storyData} />` のみなので影響なし。`grep -rn "core/causalityEngine" src` で、live 経路（components/pages）から偽エンジン参照が消え、残るのは死蔵モジュール（modules/\*）のみになることを確認。

- [ ] **Step 6: コミット**

```bash
git add src/components/CausalityView/CausalityView.tsx src/components/CausalityView/CausalityView.module.css tests/components/CausalityView.test.tsx
git commit -m "feat(causality): 因果ビューを整合性エンジンの来歴グラフに作り直し"
```

（`.bak`/`.original` の `git rm` も同じコミットに含める）

---

## Task B2: 関係性をナビ/ルートから凍結

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/components/Navigation/Navigation.tsx`

コンポーネント（`RelationshipEditor`/`CharacterRelationshipDiagram`/`RelationshipsPage`）のファイルは削除せず据え置く（将来再開余地）。到達経路だけ断つ。

- [ ] **Step 1: App.tsx からルート削除**

`src/App.tsx` の以下の行を削除:

```tsx
<Route path="/relationships" element={<RelationshipsPage />} />
```

併せて未使用になる import `import { RelationshipsPage } from './pages/RelationshipsPage'` を削除する（`npx tsc --noEmit` で未使用 import が lint エラーになるため必ず除去）。

- [ ] **Step 2: Navigation からリンク削除**

`src/components/Navigation/Navigation.tsx` の「関係性」NavLink ブロック:

```tsx
<NavLink
  to="/relationships"
  className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
>
  関係性
</NavLink>
```

を削除する。

- [ ] **Step 3: 型・lint・全テスト**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: エラーなし、全テスト PASS。
注: `RelationshipsPage` 等のファイルは残るが import されないだけ。既存の `tests/components/useRelationshipEditor.test.ts` や `RelationshipEditor.test.tsx` はコンポーネント単体テストなので引き続き緑（到達経路の削除はテストに影響しない）。

- [ ] **Step 4: コミット**

```bash
git add src/App.tsx src/components/Navigation/Navigation.tsx
git commit -m "chore(relationships): 関係性ページをナビ/ルートから凍結"
```

---

## Task B3: E2E（因果ビューの破綻表示・関係性凍結）

**Files:**

- Create: `e2e/consistency.spec.ts`

- [ ] **Step 1: E2E を書く**

`e2e/consistency.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

const seed = {
  persons: [
    { id: 1, name: '太郎', color: '#3b82f6' },
    { id: 2, name: '花子', color: '#ef4444' },
  ],
  locations: [
    { id: 1, name: '広場', connections: [2] },
    { id: 2, name: '図書館', connections: [1] },
  ],
  props: [{ id: 1, name: '鍵', currentLocation: '2' }],
  informations: [],
  initialStates: [
    { personId: 1, locationId: 1, time: '09:00' },
    { personId: 2, locationId: 1, time: '09:00' },
  ],
  // 太郎は鍵(図書館)を所持していないのに広場で花子に渡す → item 破綻
  acts: [
    {
      id: 1,
      personId: 1,
      locationId: 1,
      time: '09:10',
      startTime: 10,
      description: '鍵を渡す',
      type: 'GIVE',
      propId: 1,
      interactedPersonId: 2,
    },
  ],
}

test.describe('整合性: 因果ビューと凍結', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/simulation')
    await page.locator('textarea').fill(JSON.stringify(seed))
    await page.getByRole('button', { name: '物語データをロード' }).click()
  })

  test('因果ビューで破綻ノードが赤く表示される', async ({ page }) => {
    await page.getByRole('link', { name: '因果関係ビュー' }).click()
    await expect(page).toHaveURL(/\/causality/)
    const node = page.getByTestId('node-act-1')
    await expect(node).toBeVisible()
    await expect(node).toHaveAttribute('data-breakage', 'true')
  })

  test('ノードクリックで選択状態になる', async ({ page }) => {
    await page.getByRole('link', { name: '因果関係ビュー' }).click()
    await page.getByTestId('node-act-1').click()
    await expect(page.getByTestId('node-act-1')).toHaveAttribute('data-selected', 'true')
  })

  test('関係性リンクがナビから消えている', async ({ page }) => {
    await expect(page.getByRole('link', { name: '関係性' })).toHaveCount(0)
  })
})
```

- [ ] **Step 2: 実行**

別ターミナルで `npm run dev`（port 3000）を起動した状態で（または Playwright の webServer 設定が自動起動する）:
Run: `npx playwright test e2e/consistency.spec.ts`
Expected: 3 テスト PASS。
注: 落ちた場合、実装バグなら実装を直す。セレクタ/待機の問題ならテスト側を調整（意図＝破綻ノードが見える/選択できる/関係性リンクが無い、は変えない）。

- [ ] **Step 3: コミット**

```bash
git add e2e/consistency.spec.ts
git commit -m "test(consistency): 因果ビュー破綻表示と関係性凍結のE2E"
```

---

## Self-Review チェック結果

**Spec coverage（計画B範囲＝フェーズ4・5・E2E）:**

- フェーズ4 因果ビュー来歴グラフ化（nodes/edges/breakages描画・上流下流ハイライト・破綻強調・偽エンジンのlive経路除去）→ Task B1
- フェーズ5 関係性凍結（ナビ/ルート除外）→ Task B2
- E2E → Task B3
- フェーズ6（広範な死蔵コード・二重型削除）→ 本計画対象外（冒頭に理由明記。別パスで慎重に）

**Placeholder scan:** なし。各ステップに完全なコード・コマンド・期待値。Step 1 テストの全角 `)` 誤記は注記で半角 `})` と明示。Map 構築/カンマ式は ESLint 準拠の展開形を推奨として併記。

**Type consistency:** `analyzeStory(storyData): ConsistencyReport`（計画A）→ `report.nodes/edges/byActId` を CausalityView が消費。`GraphNode`（id:NodeId, actId:number|null, personId, startTime, label）・`NodeId`（number|string）・`report.byActId: Map<number, Breakage[]>` を計画Aの型定義どおり使用。`CausalityView` props は `{ storyData: StoryData }` で `CausalityPage` の既存呼び出しと一致。

## 別パス（本計画外）に回す範囲

- 偽 `modules/core/causalityEngine.ts` のファイル削除（死蔵モジュール群と同時に）
- 旧モジュール（`modules/ui/*`, `modules/causality/*`, `modules/simulation/core`, `modules/validation/reporter`, `modules/state/extendedState`）と対応テストの削除
- 二重型（`types/causality.ts`, `types/index.ts` の重複 StoryData/Act）の整理
- 上記は性能テスト・未コミット変更と絡むため、影響範囲を確定してから独立実施
