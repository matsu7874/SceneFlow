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

    // 2回目: 誰が/どこでを再入力せずに連射でき、stickyが保持され時刻が+5される
    await user.type(description, '話しかけた{Enter}')
    expect(onAdd).toHaveBeenCalledTimes(2)
    expect(onAdd).toHaveBeenNthCalledWith(2, {
      personId: 1,
      locationId: 10,
      description: '話しかけた',
      startTime: 5,
    })
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
