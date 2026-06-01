import { useCallback, useMemo } from 'react'
import { useAppContext } from '../../contexts/AppContext'
import { createEmptyStoryData, type Act, type StoryData } from '../../types/StoryData'
import { analyzeStory, type Breakage } from '../../modules/consistency'
import {
  appendAct,
  appendPerson,
  appendLocation,
  applyActPatch,
  removeAct,
  sortActs,
  type AppendActInput,
} from './quickLogLogic'

export interface UseQuickLogReturn {
  storyData: StoryData
  sortedActs: Act[]
  breakagesByActId: Map<number, Breakage[]>
  addAct: (input: AppendActInput) => number | null
  updateAct: (id: number, patch: Partial<Act>) => void
  deleteAct: (id: number) => void
  createPerson: (name: string) => number | null
  createLocation: (name: string) => number | null
}

export function useQuickLog(): UseQuickLogReturn {
  const { storyData, setStoryData } = useAppContext()

  // データ未読み込みでもゼロから入力を始められるよう、空の物語データを土台にする。
  // 最初の入力で setStoryData が呼ばれ、以降は通常の物語データとして扱われる。
  const story = useMemo(() => storyData ?? createEmptyStoryData(), [storyData])

  const addAct = useCallback(
    (input: AppendActInput): number | null => {
      const { data, id } = appendAct(story, input)
      setStoryData(data)
      return id
    },
    [story, setStoryData],
  )

  const updateAct = useCallback(
    (id: number, patch: Partial<Act>) => {
      setStoryData(applyActPatch(story, id, patch))
    },
    [story, setStoryData],
  )

  const deleteAct = useCallback(
    (id: number) => {
      setStoryData(removeAct(story, id))
    },
    [story, setStoryData],
  )

  const createPerson = useCallback(
    (name: string): number | null => {
      const { data, id } = appendPerson(story, name)
      setStoryData(data)
      return id
    },
    [story, setStoryData],
  )

  const createLocation = useCallback(
    (name: string): number | null => {
      const { data, id } = appendLocation(story, name)
      setStoryData(data)
      return id
    },
    [story, setStoryData],
  )

  const sortedActs = useMemo(() => sortActs(story.acts), [story])
  const breakagesByActId = useMemo<Map<number, Breakage[]>>(
    () => analyzeStory(story).byActId,
    [story],
  )

  return {
    storyData: story,
    sortedActs,
    breakagesByActId,
    addAct,
    updateAct,
    deleteAct,
    createPerson,
    createLocation,
  }
}
