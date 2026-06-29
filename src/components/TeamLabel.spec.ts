import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamLabel from './TeamLabel.vue'
import { squadViewerKey } from '../composables/use-squad-viewer'
import type { Team } from '../types/tournament'

const team: Team = { id: 'ger', name: 'Deutschland', flagCode: 'de', group: 'A', fifaRanking: 12 }

describe('TeamLabel – non-clickable', () => {
  it('renders as a span', () => {
    const wrapper = mount(TeamLabel, { props: { team } })
    expect(wrapper.element.tagName).toBe('SPAN')
  })

  it('shows the team name', () => {
    const wrapper = mount(TeamLabel, { props: { team } })
    expect(wrapper.find('.team-label__name').text()).toBe('Deutschland')
  })

  it('has no type or aria-label attribute', () => {
    const wrapper = mount(TeamLabel, { props: { team } })
    expect(wrapper.attributes('type')).toBeUndefined()
    expect(wrapper.attributes('aria-label')).toBeUndefined()
  })

  it('does not call the squad viewer when not clickable', async () => {
    const openSquad = vi.fn()
    const wrapper = mount(TeamLabel, {
      props: { team },
      global: { provide: { [squadViewerKey as symbol]: openSquad } },
    })
    await wrapper.trigger('click')
    expect(openSquad).not.toHaveBeenCalled()
  })
})

describe('TeamLabel – clickable', () => {
  it('renders as a button', () => {
    const wrapper = mount(TeamLabel, { props: { team, clickable: true } })
    expect(wrapper.element.tagName).toBe('BUTTON')
  })

  it('has type="button"', () => {
    const wrapper = mount(TeamLabel, { props: { team, clickable: true } })
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('has an aria-label containing the team name', () => {
    const wrapper = mount(TeamLabel, { props: { team, clickable: true } })
    expect(wrapper.attributes('aria-label')).toContain('Deutschland')
  })

  it('calls the squad viewer with the team on click', async () => {
    const openSquad = vi.fn()
    const wrapper = mount(TeamLabel, {
      props: { team, clickable: true },
      global: { provide: { [squadViewerKey as symbol]: openSquad } },
    })
    await wrapper.trigger('click')
    expect(openSquad).toHaveBeenCalledOnce()
    expect(openSquad).toHaveBeenCalledWith(team)
  })

})
