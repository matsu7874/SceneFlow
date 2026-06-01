import { describe, it, expect } from 'vitest'
import { analyzeStory } from '../../../src/modules/consistency'
import {
  isMisinformation,
  truthValueFor,
  misinfoChain,
} from '../../../src/modules/consistency/misinformation'
import type { StoryData, Information, Act } from '../../../src/types/StoryData'

const SUBJECT = 4

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

function learn(id: number, person: number, infoId: number, t: number): Act {
  return {
    id,
    personId: person,
    locationId: 10,
    time: '00:00',
    startTime: t,
    description: 'learn',
    type: 'LEARN',
    informationId: infoId,
  }
}
function speak(id: number, speaker: number, recipient: number, infoId: number, t: number): Act {
  return {
    id,
    personId: speaker,
    locationId: 10,
    time: '00:00',
    startTime: t,
    description: 'speak',
    type: 'SPEAK',
    informationId: infoId,
    interactedPersonId: recipient,
  }
}

const misinfo: Information = {
  id: 501,
  content: '髪は茶',
  subject: SUBJECT,
  aspect: '髪色',
  value: '茶',
  misinfoType: 'lie',
}
const truth: Information = {
  id: 502,
  content: '髪は黒',
  subject: SUBJECT,
  aspect: '髪色',
  value: '黒',
  truth: true,
}
const unstructured: Information = { id: 503, content: 'ただの噂' }
const lonelyClaim: Information = {
  id: 504,
  content: '居場所は埠頭',
  subject: SUBJECT,
  aspect: '居場所',
  value: '埠頭',
}

const story = build([misinfo, truth, unstructured, lonelyClaim], [])

describe('truthValueFor', () => {
  it('slot に真実があればその value を返す', () => {
    expect(truthValueFor(story, SUBJECT, '髪色')).toBe('黒')
  })
  it('真実が無ければ undefined', () => {
    expect(truthValueFor(story, SUBJECT, '居場所')).toBeUndefined()
  })
})

describe('isMisinformation', () => {
  it('真実と value が異なる構造化情報は誤情報', () => {
    expect(isMisinformation(misinfo, story)).toBe(true)
  })
  it('真実そのものは誤情報ではない', () => {
    expect(isMisinformation(truth, story)).toBe(false)
  })
  it('真実が指定されていない slot の情報は誤情報ではない', () => {
    expect(isMisinformation(lonelyClaim, story)).toBe(false)
  })
  it('構造化されていない情報は誤情報ではない', () => {
    expect(isMisinformation(unstructured, story)).toBe(false)
  })
})

describe('misinfoChain', () => {
  it('情報の伝播経路（knowsエッジ）のノードを発生源から辿って返す', () => {
    // 太郎が観察 → 太郎が花子に → 花子が次郎に、と誤情報が伝播
    const propagated = build(
      [misinfo, truth],
      [learn(1, 1, 501, 1), speak(2, 1, 2, 501, 2), speak(3, 2, 3, 501, 3)],
    )
    const report = analyzeStory(propagated)
    const chain = misinfoChain(501, report)
    // 発生源(act1)・中継(act2)・末端(act3) がすべて経路に含まれる
    expect(chain.nodes.has('1')).toBe(true)
    expect(chain.nodes.has('2')).toBe(true)
    expect(chain.nodes.has('3')).toBe(true)
    // エッジは act1→act2, act2→act3 の2本
    expect(chain.edges).toHaveLength(2)
  })
  it('伝播していない情報の経路は空', () => {
    const report = analyzeStory(build([misinfo, truth], [learn(1, 1, 501, 1)]))
    const chain = misinfoChain(501, report)
    expect(chain.edges).toHaveLength(0)
  })
})
