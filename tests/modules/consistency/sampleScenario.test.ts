import { describe, it, expect } from 'vitest'
import { analyzeStory } from '../../../src/modules/consistency'
import type { StoryData } from '../../../src/types/StoryData'
import sample from '../../../src/data/sample-academy-mystery.json'

// オリジナルの学院ミステリ・サンプル。
// 「ほぼ整合の取れた台本に、検出されるべき破綻が3つだけ仕込まれている」ことを保証する。
// 仕込んだ破綻:
//   - id 9  : item     … ニコが先に持ち出した古い鍵を、ユーリが図書室で取ろうとする
//   - id 12 : position … レオが移動なしで中庭の Act を行う（廊下にいたはず）
//   - id 14 : info     … ニコが知らないはずの「礼拝堂の隠し扉」をレオに話す
describe('学院ミステリ サンプルシナリオ', () => {
  const report = analyzeStory(sample as StoryData)

  const categoriesOf = (actId: number): string[] =>
    (report.byActId.get(actId) ?? []).map(b => b.category).sort()

  it('破綻は仕込んだ3件のみ（過検出・未検出がない）', () => {
    const flaggedActIds = Array.from(report.byActId.keys()).sort((a, b) => a - b)
    expect(flaggedActIds).toEqual([9, 12, 14])
  })

  it('id9 はアイテム所持の破綻', () => {
    expect(categoriesOf(9)).toContain('item')
  })

  it('id12 は位置（動線）の破綻', () => {
    expect(categoriesOf(12)).toContain('position')
  })

  it('id14 は情報の知識の破綻', () => {
    expect(categoriesOf(14)).toContain('info')
  })

  it('正しく整合している Act（移動・受け渡し・LEARN後のUSE等）は破綻しない', () => {
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 15, 16]) {
      expect(report.byActId.get(id) ?? []).toHaveLength(0)
    }
  })

  it('来歴グラフのノードとエッジが生成される', () => {
    expect(report.nodes.length).toBeGreaterThan(0)
    expect(report.edges.length).toBeGreaterThan(0)
  })

  // 誤情報サブプロット: レオが「アランは自室で就寝中」という嘘を広め、
  // アランの昏倒を実際に目撃したニコがクラウス経由でその嘘を聞いて矛盾に気づく。
  it('誤情報の伝播による矛盾が1件検出される', () => {
    expect(report.contradictions).toHaveLength(1)
    const c = report.contradictions[0]
    expect(c.personId).toBe(4) // ニコ
    expect(c.aspect).toBe('容態')
    expect(c.kind).toBe('truth-conflict')
  })
})
