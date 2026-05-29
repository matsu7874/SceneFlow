import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ActDetailPanel } from '../../src/components/QuickLog/ActDetailPanel'
import type { Act } from '../../src/types/StoryData'

const act: Act = {
  id: 1,
  personId: 1,
  locationId: 10,
  time: '00:00',
  startTime: 0,
  description: '渡す',
}

describe('ActDetailPanel 種類セレクト', () => {
  it('種類を選ぶとonChangeにtypeが渡る', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ActDetailPanel
        act={act}
        persons={[{ id: 1, name: '太郎', color: '#000' }]}
        locations={[{ id: 10, name: '広場', connections: [] }]}
        props={[]}
        informations={[]}
        onChange={onChange}
      />,
    )
    await user.selectOptions(screen.getByLabelText('種類'), 'GIVE')
    expect(onChange).toHaveBeenCalledWith({ type: 'GIVE' })
  })
})
