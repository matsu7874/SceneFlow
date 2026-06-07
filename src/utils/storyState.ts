import type { StoryData } from '../types/StoryData'

/**
 * 物語データが実質的に空（どのエンティティも未入力）かを判定する。
 * オンボーディング表示や空状態の出し分けに使う。
 */
export function isStoryEmpty(storyData: StoryData | null): boolean {
  if (!storyData) return true
  return (
    storyData.persons.length === 0 &&
    storyData.locations.length === 0 &&
    storyData.props.length === 0 &&
    storyData.informations.length === 0 &&
    storyData.acts.length === 0
  )
}
