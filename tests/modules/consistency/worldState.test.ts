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
