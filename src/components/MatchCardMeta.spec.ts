// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import MatchCardMeta from './MatchCardMeta.vue'
import { mount } from '@vue/test-utils'

const kickoff = '2026-06-08T18:00:00+02:00'

// Mirror the component's formatter so the assertion is timezone-independent.
const expectedKickoff = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  weekday: 'short',
}).format(new Date(kickoff))

describe('MatchCardMeta', () => {
  it('renders the kickoff in a <time> with a datetime attribute', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff } })
    const time = wrapper.get('time')
    expect(time.attributes('datetime')).toBe(kickoff)
    expect(time.text()).toBe(expectedKickoff)
  })

  it('is not pressed or active by default', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff } })
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
    expect(wrapper.classes()).not.toContain('match-card-meta--active')
  })

  it('reflects the pinned state via aria-pressed and the active class', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, pinned: true } })
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.classes()).toContain('match-card-meta--active')
  })

  it('emits "toggle" when clicked', async () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('shows the link icon by default', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff } })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.classes()).not.toContain('match-card-meta--static')
  })

  it("includes the formatted kickoff time in the toggle button's aria-label", () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff } })
    expect(wrapper.get('button').attributes('aria-label')).toBe(
      `Spielverbindungen hervorheben (Anstoß ${expectedKickoff})`,
    )
  })

  it('renders a non-interactive element with no toggle affordance when static is true', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, static: true } })
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.classes()).toContain('match-card-meta--static')
    expect(wrapper.attributes('aria-pressed')).toBeUndefined()
    expect(wrapper.attributes('aria-label')).toBeUndefined()
    const time = wrapper.get('time')
    expect(time.attributes('datetime')).toBe(kickoff)
    expect(time.text()).toBe(expectedKickoff)
  })

  it('does not emit "toggle" when static (no click handler is wired up)', async () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, static: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })
})
