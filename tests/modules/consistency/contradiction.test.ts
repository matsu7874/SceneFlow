import { describe, it, expect } from 'vitest'
import { analyzeStory } from '../../../src/modules/consistency'
import type { StoryData, Information, Act } from '../../../src/types/StoryData'

// 矛盾検出のテスト。
// 矛盾の定義: ある人物が、同一 (subject, aspect) で value の異なる情報を初めて同時に保有した瞬間。

const SUBJECT = 4 // 容疑者
const OTHER_SUBJECT = 5

function build(informations: Information[], acts: Act[]): StoryData {
  return {
    persons: [
      { id: 1, name: '太郎', color: '#000' },
      { id: 2, name: '花子', color: '#111' },
      { id: 3, name: '次郎', color: '#222' },
    ],
    locations: [{ id: 10, name: '広場', connections: [] }],
    props: [],
    informations,
    initialStates: [
      { personId: 1, locationId: 10, time: '00:00' },
      { personId: 2, locationId: 10, time: '00:00' },
      { personId: 3, locationId: 10, time: '00:00' },
    ],
    acts,
  }
}

// person が時刻 t に情報 infoId を直接取得（観察）する LEARN act
function learn(id: number, person: number, infoId: number, t: number): Act {
  return {
    id,
    personId: person,
    locationId: 10,
    time: `00:${String(t).padStart(2, '0')}`,
    startTime: t,
    description: `${person}が${infoId}を観察`,
    type: 'LEARN',
    informationId: infoId,
  }
}

// speaker が recipient に情報 infoId を伝える SPEAK act
function speak(id: number, speaker: number, recipient: number, infoId: number, t: number): Act {
  return {
    id,
    personId: speaker,
    locationId: 10,
    time: `00:${String(t).padStart(2, '0')}`,
    startTime: t,
    description: `${speaker}が${recipient}に${infoId}を伝える`,
    type: 'SPEAK',
    informationId: infoId,
    interactedPersonId: recipient,
  }
}

describe('矛盾検出', () => {
  it('同一(subject,aspect)で異なるvalueを観察すると矛盾を1件記録する', () => {
    const story = build(
      [
        { id: 101, content: '髪は茶', subject: SUBJECT, aspect: '髪色', value: '茶' },
        { id: 102, content: '髪は黒', subject: SUBJECT, aspect: '髪色', value: '黒', truth: true },
      ],
      [learn(1, 3, 101, 1), learn(2, 3, 102, 2)],
    )
    const report = analyzeStory(story)
    expect(report.contradictions).toHaveLength(1)
    const c = report.contradictions[0]
    expect(c.personId).toBe(3)
    expect(c.subject).toBe(SUBJECT)
    expect(c.aspect).toBe('髪色')
    // 発覚ポイントは後から来た言明を取得した act
    expect(c.actId).toBe(2)
    expect(c.incoming.value).toBe('黒')
    expect(c.existing.value).toBe('茶')
  })

  it('片方が真実なら truth-conflict に分類する', () => {
    const story = build(
      [
        { id: 101, content: '髪は茶', subject: SUBJECT, aspect: '髪色', value: '茶' },
        { id: 102, content: '髪は黒', subject: SUBJECT, aspect: '髪色', value: '黒', truth: true },
      ],
      [learn(1, 3, 101, 1), learn(2, 3, 102, 2)],
    )
    const report = analyzeStory(story)
    expect(report.contradictions[0].kind).toBe('truth-conflict')
  })

  it('両方とも伝聞（真実なし）なら testimony-conflict に分類する', () => {
    const story = build(
      [
        { id: 201, content: '髪は茶', subject: SUBJECT, aspect: '髪色', value: '茶' },
        { id: 202, content: '髪は黒', subject: SUBJECT, aspect: '髪色', value: '黒' },
      ],
      [
        learn(1, 1, 201, 1), // 太郎が観察
        learn(2, 2, 202, 2), // 花子が観察
        speak(3, 1, 3, 201, 3), // 太郎→次郎: 茶
        speak(4, 2, 3, 202, 4), // 花子→次郎: 黒
      ],
    )
    const report = analyzeStory(story)
    expect(report.contradictions).toHaveLength(1)
    const c = report.contradictions[0]
    expect(c.personId).toBe(3)
    expect(c.kind).toBe('testimony-conflict')
    expect(c.actId).toBe(4)
  })

  it('aspect が異なれば矛盾としない（正面の姿 vs 側面の姿）', () => {
    const story = build(
      [
        { id: 101, content: '髪は茶', subject: SUBJECT, aspect: '髪色', value: '茶' },
        { id: 103, content: '埠頭にいた', subject: SUBJECT, aspect: '居場所', value: '埠頭' },
      ],
      [learn(1, 3, 101, 1), learn(2, 3, 103, 2)],
    )
    const report = analyzeStory(story)
    expect(report.contradictions).toHaveLength(0)
  })

  it('subject が異なれば矛盾としない', () => {
    const story = build(
      [
        { id: 101, content: '容疑者の髪は茶', subject: SUBJECT, aspect: '髪色', value: '茶' },
        { id: 104, content: '別人の髪は金', subject: OTHER_SUBJECT, aspect: '髪色', value: '金' },
      ],
      [learn(1, 3, 101, 1), learn(2, 3, 104, 2)],
    )
    const report = analyzeStory(story)
    expect(report.contradictions).toHaveLength(0)
  })

  it('同じ value を複数回得ても矛盾としない', () => {
    const story = build(
      [
        { id: 101, content: '髪は茶(A)', subject: SUBJECT, aspect: '髪色', value: '茶' },
        { id: 105, content: '髪は茶(B)', subject: SUBJECT, aspect: '髪色', value: '茶' },
      ],
      [learn(1, 3, 101, 1), learn(2, 3, 105, 2)],
    )
    const report = analyzeStory(story)
    expect(report.contradictions).toHaveLength(0)
  })

  it('自分の観察 vs 伝聞 の食い違いも発覚ポイントとする', () => {
    const story = build(
      [
        { id: 301, content: '髪は黒', subject: SUBJECT, aspect: '髪色', value: '黒', truth: true },
        {
          id: 302,
          content: '髪は茶',
          subject: SUBJECT,
          aspect: '髪色',
          value: '茶',
          misinfoType: 'lie',
        },
      ],
      [
        learn(1, 3, 301, 1), // 次郎が自分で見た（黒）
        learn(2, 1, 302, 2), // 太郎が嘘の元情報を持つ
        speak(3, 1, 3, 302, 3), // 太郎が次郎に嘘（茶）を吹き込む → 発覚
      ],
    )
    const report = analyzeStory(story)
    expect(report.contradictions).toHaveLength(1)
    const c = report.contradictions[0]
    expect(c.personId).toBe(3)
    expect(c.actId).toBe(3)
    expect(c.kind).toBe('truth-conflict')
  })

  it('構造化されていない情報は検出対象外', () => {
    const story = build(
      [
        { id: 401, content: '何かの噂' },
        { id: 402, content: '別の噂' },
      ],
      [learn(1, 3, 401, 1), learn(2, 3, 402, 2)],
    )
    const report = analyzeStory(story)
    expect(report.contradictions).toHaveLength(0)
  })
})
