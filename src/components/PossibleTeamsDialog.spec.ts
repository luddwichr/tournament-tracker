// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PossibleTeamsDialog from './PossibleTeamsDialog.vue'
import { makeTeam } from '../test-support/teams'

const teamA = makeTeam({ id: 'ger', name: 'Deutschland' })
const teamB = makeTeam({ id: 'fra', name: 'Frankreich' })

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

describe('PossibleTeamsDialog', () => {
  it('calls showModal on mount', () => {
    mount(PossibleTeamsDialog, { props: { label: 'Sieger A', possibleTeams: [] } })
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
  })

  it('renders the fixed dialog title', () => {
    const wrapper = mount(PossibleTeamsDialog, { props: { label: 'Sieger A', possibleTeams: [] } })
    expect(wrapper.find('.base-dialog__title').text()).toBe('Mögliche Teams')
  })

  it('renders the slot label as section heading', () => {
    const wrapper = mount(PossibleTeamsDialog, { props: { label: 'Sieger Gruppe B', possibleTeams: [] } })
    expect(wrapper.find('.possible-teams-dialog__section-title').text()).toBe('Sieger Gruppe B')
  })

  it('renders one list item per team', () => {
    const wrapper = mount(PossibleTeamsDialog, {
      props: { label: 'Sieger A', possibleTeams: [teamA, teamB] },
    })
    expect(wrapper.findAll('.possible-teams-dialog__item')).toHaveLength(2)
  })

  it('renders each team name', () => {
    const wrapper = mount(PossibleTeamsDialog, {
      props: { label: 'Sieger A', possibleTeams: [teamA, teamB] },
    })
    const [first, second] = wrapper.findAll('.possible-teams-dialog__item')
    expect(first!.text()).toContain('Deutschland')
    expect(second!.text()).toContain('Frankreich')
  })

  it('renders an empty list when possibleTeams is empty', () => {
    const wrapper = mount(PossibleTeamsDialog, { props: { label: 'Sieger A', possibleTeams: [] } })
    expect(wrapper.findAll('.possible-teams-dialog__item')).toHaveLength(0)
  })

  it('emits close when the dialog fires its native close event', async () => {
    const wrapper = mount(PossibleTeamsDialog, { props: { label: 'Sieger A', possibleTeams: [] } })
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(PossibleTeamsDialog, { props: { label: 'Sieger A', possibleTeams: [] } })
    await wrapper.find('.base-dialog__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
