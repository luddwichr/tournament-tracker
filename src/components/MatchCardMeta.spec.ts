// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MatchCardMeta from './MatchCardMeta.vue'

const kickoff = '2026-06-08T18:00:00+02:00'

// Mirror the component's formatter so the assertion is timezone-independent.
const expectedKickoff = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
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

  it('hides the link icon and marks itself static when hideLinkIcon is true', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, hideLinkIcon: true } })
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.classes()).toContain('match-card-meta--static')
  })
})
