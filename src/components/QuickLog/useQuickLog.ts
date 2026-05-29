import { useCallback, useMemo } from 'react'
import { useAppContext } from '../../contexts/AppContext'
import type { Act, StoryData } from '../../types/StoryData'
import {
  appendAct,
  appendPerson,
  appendLocation,
  applyActPatch,
  removeAct,
  detectMovementInconsistencies,
  sortActs,
  type AppendActInput,
} from './quickLogLogic'

export interface UseQuickLogReturn {
  storyData: StoryData | null
  sortedActs: Act[]
  inconsistentActIds: Set<number>
  addAct: (input: AppendActInput) => number | null
  updateAct: (id: number, patch: Partial<Act>) => void
  deleteAct: (id: number) => void
  createPerson: (name: string) => number | null
  createLocation: (name: string) => number | null
}

export function useQuickLog(): UseQuickLogReturn {
  const { storyData, setStoryData } = useAppContext()

  const addAct = useCallback(
    (input: AppendActInput): number | null => {
      if (!storyData) return null
      const { data, id } = appendAct(storyData, input)
      setStoryData(data)
      return id
    },
    [storyData, setStoryData],
  )

  const updateAct = useCallback(
    (id: number, patch: Partial<Act>) => {
      if (!storyData) return
      setStoryData(applyActPatch(storyData, id, patch))
    },
    [storyData, setStoryData],
  )

  const deleteAct = useCallback(
    (id: number) => {
      if (!storyData) return
      setStoryData(removeAct(storyData, id))
    },
    [storyData, setStoryData],
  )

  const createPerson = useCallback(
    (name: string): number | null => {
      if (!storyData) return null
      const { data, id } = appendPerson(storyData, name)
      setStoryData(data)
      return id
    },
    [storyData, setStoryData],
  )

  const createLocation = useCallback(
    (name: string): number | null => {
      if (!storyData) return null
      const { data, id } = appendLocation(storyData, name)
      setStoryData(data)
      return id
    },
    [storyData, setStoryData],
  )

  const sortedActs = useMemo(() => (storyData ? sortActs(storyData.acts) : []), [storyData])
  const inconsistentActIds = useMemo(
    () => (storyData ? detectMovementInconsistencies(storyData.acts) : new Set<number>()),
    [storyData],
  )

  return {
    storyData,
    sortedActs,
    inconsistentActIds,
    addAct,
    updateAct,
    deleteAct,
    createPerson,
    createLocation,
  }
}
