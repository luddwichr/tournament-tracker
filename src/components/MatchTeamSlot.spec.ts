// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import MatchTeamSlot from './MatchTeamSlot.vue'
import TeamLabel from './TeamLabel.vue'
import { makeTeam } from '../test-support/teams'
import { mount } from '@vue/test-utils'

const team = makeTeam({ id: 'ger', name: 'Deutschland' })

describe('MatchTeamSlot – with a resolved team', () => {
  it('renders a clickable TeamLabel and no placeholder', () => {
    const wrapper = mount(MatchTeamSlot, { props: { side: 'home', team } })
    const label = wrapper.findComponent(TeamLabel)
    expect(label.exists()).toBe(true)
    expect(label.props('clickable')).toBe(true)
    expect(wrapper.find('.match-team-slot__placeholder').exists()).toBe(false)
  })
})

describe('MatchTeamSlot – without a team (placeholder)', () => {
  it('renders the placeholder text and aria-label', () => {
    const wrapper = mount(MatchTeamSlot, { props: { placeholder: 'Gruppe A – 2.', side: 'home', team: null } })
    const btn = wrapper.get('.match-team-slot__placeholder')
    expect(btn.text()).toBe('Gruppe A – 2.')
    expect(btn.attributes('aria-label')).toBe('Mögliche Teams: Gruppe A – 2.')
  })

  it('falls back to "?" when no placeholder is provided', () => {
    const wrapper = mount(MatchTeamSlot, { props: { side: 'home', team: null } })
    expect(wrapper.get('.match-team-slot__placeholder').text()).toBe('?')
  })

  it('emits "placeholderClick" when the placeholder is clicked', async () => {
    const wrapper = mount(MatchTeamSlot, { props: { placeholder: 'X', side: 'away', team: null } })
    await wrapper.get('.match-team-slot__placeholder').trigger('click')
    expect(wrapper.emitted('placeholderClick')).toHaveLength(1)
  })
})

describe('MatchTeamSlot – side modifier', () => {
  it('applies the side-specific class', () => {
    expect(mount(MatchTeamSlot, { props: { side: 'home', team } }).classes()).toContain('match-team-slot--home')
    expect(mount(MatchTeamSlot, { props: { side: 'away', team } }).classes()).toContain('match-team-slot--away')
  })
})
