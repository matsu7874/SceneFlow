import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { QuickActInput } from '../../src/components/QuickLog/QuickActInput'

const persons = [
  { id: 1, name: '太郎' },
  { id: 2, name: '花子' },
]
const locations = [
  { id: 10, name: '広場' },
  { id: 11, name: '図書館' },
]

describe('QuickActInput', () => {
  const user = userEvent.setup()

  it('誰が・どこで・何をしたを選んでEnterでonAddが呼ばれ、入力が連射用に整う', async () => {
    const onAdd = vi.fn()
    render(
      <QuickActInput
        persons={persons}
        locations={locations}
        onAdd={onAdd}
        onCreatePerson={() => 99}
        onCreateLocation={() => 88}
      />,
    )

    await user.click(screen.getByLabelText('誰が'))
    await user.keyboard('太郎{Enter}')
    await user.click(screen.getByLabelText('どこで'))
    await user.keyboard('広場{Enter}')

    const description = screen.getByLabelText('何をした')
    await user.type(description, '到着した{Enter}')

    expect(onAdd).toHaveBeenCalledWith({
      personId: 1,
      locationId: 10,
      description: '到着した',
      startTime: 0,
    })
    expect((description as HTMLInputElement).value).toBe('')
  })

  it('何をしたが空ならEnterで確定しない', async () => {
    const onAdd = vi.fn()
    render(
      <QuickActInput
        persons={persons}
        locations={locations}
        onAdd={onAdd}
        onCreatePerson={() => 99}
        onCreateLocation={() => 88}
      />,
    )
    await user.click(screen.getByLabelText('誰が'))
    await user.keyboard('太郎{Enter}')
    await user.click(screen.getByLabelText('どこで'))
    await user.keyboard('広場{Enter}')
    await user.type(screen.getByLabelText('何をした'), '{Enter}')
    expect(onAdd).not.toHaveBeenCalled()
  })
})
