// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import MatchCardMeta from './MatchCardMeta.vue'
import { mount } from '@vue/test-utils'

const kickoff = '2026-06-08T18:00:00+02:00'
const matchId = 'M73'

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
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId } })
    const time = wrapper.get('time')
    expect(time.attributes('datetime')).toBe(kickoff)
    expect(time.text()).toBe(expectedKickoff)
  })

  it('is not pressed or active by default', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId } })
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
    expect(wrapper.classes()).not.toContain('match-card-meta--active')
  })

  it('reflects the pinned state via aria-pressed and the active class', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId, pinned: true } })
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.classes()).toContain('match-card-meta--active')
  })

  it('emits "toggle" when clicked', async () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('shows the link icon by default', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId } })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.classes()).not.toContain('match-card-meta--plain')
  })

  it("includes the match number and formatted kickoff time in the toggle button's aria-label", () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId } })
    expect(wrapper.get('button').attributes('aria-label')).toBe(
      `Spielverbindungen hervorheben (Spiel 73, Anstoß ${expectedKickoff})`,
    )
  })

  it('renders the match number so bracket labels like "Sieger Sp. 73" are locatable', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId } })
    expect(wrapper.get('.match-card-meta__number').text()).toBe('Sp. 73')
  })

  it('spells the match number out for screen readers when plain', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId, plain: true } })
    expect(wrapper.get('.match-card-meta__number').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.visually-hidden').text()).toBe('Spiel 73')
  })

  it('renders a non-interactive element with no toggle affordance when plain is true', () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId, plain: true } })
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.classes()).toContain('match-card-meta--plain')
    expect(wrapper.attributes('aria-pressed')).toBeUndefined()
    expect(wrapper.attributes('aria-label')).toBeUndefined()
    const time = wrapper.get('time')
    expect(time.attributes('datetime')).toBe(kickoff)
    expect(time.text()).toBe(expectedKickoff)
  })

  it('does not emit "toggle" when plain (no click handler is wired up)', async () => {
    const wrapper = mount(MatchCardMeta, { props: { kickoff, matchId, plain: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })
})
