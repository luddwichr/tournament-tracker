// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamLabel from './TeamLabel.vue'
import { teamViewerKey } from '../composables/use-team-viewer'
import { makeTeam } from '../test-support/teams'

const team = makeTeam({ id: 'ger', name: 'Deutschland' })

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

  it('does not call the team viewer when not clickable', async () => {
    const openTeamView = vi.fn()
    const wrapper = mount(TeamLabel, {
      global: { provide: { [teamViewerKey as symbol]: openTeamView } },
      props: { team },
    })
    await wrapper.trigger('click')
    expect(openTeamView).not.toHaveBeenCalled()
  })
})

describe('TeamLabel – clickable', () => {
  it('renders as a button', () => {
    const wrapper = mount(TeamLabel, { props: { clickable: true, team } })
    expect(wrapper.element.tagName).toBe('BUTTON')
  })

  it('has type="button"', () => {
    const wrapper = mount(TeamLabel, { props: { clickable: true, team } })
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('has an aria-label containing the team name', () => {
    const wrapper = mount(TeamLabel, { props: { clickable: true, team } })
    expect(wrapper.attributes('aria-label')).toContain('Deutschland')
  })

  it('calls the team viewer with the team on click', async () => {
    const openTeamView = vi.fn()
    const wrapper = mount(TeamLabel, {
      global: { provide: { [teamViewerKey as symbol]: openTeamView } },
      props: { clickable: true, team },
    })
    await wrapper.trigger('click')
    expect(openTeamView).toHaveBeenCalledOnce()
    expect(openTeamView).toHaveBeenCalledWith(team)
  })
})
