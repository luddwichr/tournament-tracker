// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { provideTeamViewer, useTeamViewer } from './use-team-viewer'
import { defineComponent } from 'vue'
import { makeTeam } from '../test-support/teams'
import { mount } from '@vue/test-utils'

// App.spec.ts and TeamLabel.spec.ts exercise `useTeamViewer()` only indirectly.
// They provide their own stub `open` function via `global.provide` and never touch the real `provideTeamViewer()`.
// Nothing directly covers provideTeamViewer's own contract.
// That contract is the `team` ref starting at null, `open` setting it, `close` nulling it again, and what a lone
// `useTeamViewer()`
// consumer gets when nothing above it provided.
//
// Vue's provide()/inject() only resolve through real component instances,
// and a component can't inject something it provided itself in the same
// setup(), because injection walks the *parent* chain.
// So, as in use-scroll-lock.spec.ts, minimal defineComponents stand in for a full app.
// A Provider mounts provideTeamViewer() and exposes its state.
// A nested Child consumes useTeamViewer() and exposes the injected `open`.
// No template markup or DOM assertions are needed, just the composables' own return values.

const team = makeTeam({ id: 'ger', name: 'Deutschland' })

const Child = defineComponent({
  setup() {
    const open = useTeamViewer()
    return { open }
  },
  template: '<div></div>',
})

const Provider = defineComponent({
  components: { Child },
  setup() {
    const viewer = provideTeamViewer()
    // `team` is returned at the top level (rather than nested inside an
    // object) so Vue's setup-return unwrapping exposes it as a plain value
    // on the component instance instead of the raw Ref.
    return { close: viewer.close, team: viewer.team }
  },
  template: '<Child />',
})

describe('provideTeamViewer', () => {
  it('starts with a null team', () => {
    const wrapper = mount(Provider)
    expect(wrapper.vm.team).toBeNull()
  })

  it('open(team) sets the team ref', () => {
    const wrapper = mount(Provider)
    wrapper.findComponent(Child).vm.open(team)
    expect(wrapper.vm.team).toEqual(team)
  })

  it('close() nulls the team ref again', () => {
    const wrapper = mount(Provider)
    wrapper.findComponent(Child).vm.open(team)
    expect(wrapper.vm.team).toEqual(team)

    wrapper.vm.close()
    expect(wrapper.vm.team).toBeNull()
  })
})

describe('useTeamViewer', () => {
  it('returns a noop that does nothing when injected without a matching provide', () => {
    const wrapper = mount(Child)

    expect(() => {
      wrapper.vm.open(team)
    }).not.toThrow()
  })
})
