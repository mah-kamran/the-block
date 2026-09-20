import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PriceRange, type PriceBounds } from './PriceRange'

const bounds = { min: 4000, max: 96000 }

function setup(value: PriceBounds = {}) {
  const onChange = vi.fn()
  const view = render(<PriceRange value={value} bounds={bounds} onChange={onChange} />)
  const min = screen.getByLabelText(/Minimum price/)
  const max = screen.getByLabelText(/Maximum price/)
  return { onChange, min, max, rerender: (next: PriceBounds) => view.rerender(<PriceRange value={next} bounds={bounds} onChange={onChange} />) }
}

describe('PriceRange', () => {
  it('commits on blur, not on every keystroke', async () => {
    const user = userEvent.setup()
    const { onChange, min } = setup()
    await user.type(min, '15000')
    expect(onChange).not.toHaveBeenCalled()
    await user.tab()
    expect(onChange).toHaveBeenCalledWith({ min: 15000, max: undefined })
  })

  it('commits on Enter and strips non-digits', async () => {
    const user = userEvent.setup()
    const { onChange, max } = setup()
    await user.type(max, '$20,000{Enter}')
    expect(max).toHaveValue('20000')
    expect(onChange).toHaveBeenCalledWith({ min: undefined, max: 20000 })
  })

  it('swaps min and max when entered backwards', async () => {
    const user = userEvent.setup()
    const { onChange, min, max } = setup()
    await user.type(min, '30000')
    await user.type(max, '10000')
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith({ min: 10000, max: 30000 })
  })

  it('does not fire when the committed value is unchanged', async () => {
    const user = userEvent.setup()
    const { onChange, min } = setup({ min: 15000 })
    await user.click(min)
    await user.tab()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('adopts external changes such as the back button or clear all', () => {
    const { min, max, rerender } = setup({ min: 15000, max: 40000 })
    expect(min).toHaveValue('15000')
    rerender({})
    expect(min).toHaveValue('')
    expect(max).toHaveValue('')
  })

  it('offers a reset only when a bound is active', async () => {
    const user = userEvent.setup()
    const { onChange, rerender } = setup()
    expect(screen.queryByRole('button', { name: 'Any price' })).not.toBeInTheDocument()
    rerender({ max: 40000 })
    await user.click(screen.getByRole('button', { name: 'Any price' }))
    expect(onChange).toHaveBeenCalledWith({})
  })
})
