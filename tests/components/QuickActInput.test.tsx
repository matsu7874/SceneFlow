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

  it('未確定のまま追加すると不足項目を知らせ、無反応にならない', async () => {
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
    // 候補を確定せずテキストだけ入力（personId/locationIdは未確定）
    await user.type(screen.getByLabelText('誰が'), '太郎')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(onAdd).not.toHaveBeenCalled()
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('誰が')
    expect(alert.textContent).toContain('どこで')
    expect(alert.textContent).toContain('何をした')
  })

  it('時刻が不正な形式なら追加せずHH:MM形式を促す', async () => {
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

    const time = screen.getByLabelText('時刻')
    await user.clear(time)
    await user.type(time, '99:99')
    await user.type(screen.getByLabelText('何をした'), '到着した{Enter}')

    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('HH:MM')

    // 時刻を直すとエラーが消えて追加できる
    await user.clear(time)
    await user.type(time, '09:30')
    expect(screen.queryByRole('alert')).toBeNull()
    await user.type(screen.getByLabelText('何をした'), '{Enter}')
    expect(onAdd).toHaveBeenCalledWith({
      personId: 1,
      locationId: 10,
      description: '到着した',
      startTime: 9 * 60 + 30,
    })
  })

  it('項目を確定するとエラー表示が消える', async () => {
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
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(screen.getByRole('alert')).toBeTruthy()

    await user.click(screen.getByLabelText('誰が'))
    await user.keyboard('太郎{Enter}')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
