import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ActTimelineRow } from '../../src/components/QuickLog/ActTimelineRow'
import type { Act } from '../../src/types/StoryData'
import type { Breakage } from '../../src/modules/consistency'

const act: Act = {
  id: 1,
  personId: 1,
  locationId: 10,
  time: '00:00',
  startTime: 0,
  description: 'する',
}
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
    const breakages: Breakage[] = [
      { actId: 1, category: 'position', fact: null, message: 'いない' },
    ]
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
