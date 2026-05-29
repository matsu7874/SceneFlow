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

  const describeAct = (actId: number): string => {
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
                <li key={`${category}-${b.actId}-${i}`}>
                  <strong>{describeAct(b.actId)}</strong>: {b.message}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
