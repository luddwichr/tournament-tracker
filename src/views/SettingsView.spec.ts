import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SettingsView from './SettingsView.vue'
import { useSettingsStore } from '../stores/settings'
import { useTournamentStore } from '../stores/tournament'
import * as persistence from '../lib/persistence'
import ThemePicker from '../components/ThemePicker.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

vi.mock('../lib/persistence', () => ({
  exportJson: vi.fn(),
  parseImport: vi.fn(),
  SCHEMA_VERSION: 1,
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

function mountView() {
  return mount(SettingsView)
}

function setupFileReader(content: string) {
  vi.stubGlobal(
    'FileReader',
    class {
      result = content
      onload: (() => void) | null = null
      readAsText(_file: File) {
        this.onload?.()
      }
    },
  )
}

async function triggerFileChange(wrapper: ReturnType<typeof mountView>, content: string) {
  setupFileReader(content)
  const file = new File([content], 'results.json', { type: 'application/json' })
  const fileInput = wrapper.find('input[type="file"]')
  Object.defineProperty(fileInput.element, 'files', {
    value: { 0: file, length: 1, item: () => file },
    configurable: true,
  })
  await fileInput.trigger('change')
}

describe('SettingsView – theme', () => {
  it('renders a ThemePicker', () => {
    const wrapper = mountView()
    expect(wrapper.findComponent(ThemePicker).exists()).toBe(true)
  })

  it('passes the current theme to ThemePicker', () => {
    const settings = useSettingsStore()
    settings.theme = 'dark'
    const wrapper = mountView()
    expect(wrapper.findComponent(ThemePicker).props('modelValue')).toBe('dark')
  })

  it('updates the settings store when ThemePicker emits update:modelValue', async () => {
    const settings = useSettingsStore()
    const wrapper = mountView()
    const darkRadio = wrapper
      .findAll('input[type="radio"]')
      .find((r) => (r.element as HTMLInputElement).value === 'dark')
    await darkRadio!.trigger('change')
    expect(settings.theme).toBe('dark')
  })
})

describe('SettingsView – export', () => {
  it('calls exportJson with store results when Exportieren is clicked', async () => {
    const store = useTournamentStore()
    const wrapper = mountView()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Exportieren')!
      .trigger('click')
    expect(vi.mocked(persistence.exportJson)).toHaveBeenCalledWith(store.results)
  })
})

describe('SettingsView – import', () => {
  it('clicking Importieren clears any previous error and clicks the file input', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    const wrapper = mountView()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Importieren')!
      .trigger('click')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('shows ConfirmDialog after selecting a valid file', async () => {
    vi.mocked(persistence.parseImport).mockReturnValue({})
    const wrapper = mountView()
    await triggerFileChange(wrapper, '{"version":1,"results":{}}')
    expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(true)
  })

  it('shows error message when parseImport throws an Error', async () => {
    vi.mocked(persistence.parseImport).mockImplementation(() => {
      throw new Error('Ungültiges JSON-Format.')
    })
    const wrapper = mountView()
    await triggerFileChange(wrapper, 'not-json')
    expect(wrapper.find('.settings-view__error').text()).toBe('Ungültiges JSON-Format.')
    expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(false)
  })

  it('shows fallback error message when thrown value is not an Error instance', async () => {
    vi.mocked(persistence.parseImport).mockImplementation(() => {
      throw 'unexpected'
    })
    const wrapper = mountView()
    await triggerFileChange(wrapper, 'anything')
    expect(wrapper.find('.settings-view__error').text()).toBe('Fehler beim Importieren.')
  })

  it('clicking Importieren again clears the previous error', async () => {
    vi.mocked(persistence.parseImport).mockImplementation(() => {
      throw new Error('bad')
    })
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    const wrapper = mountView()
    await triggerFileChange(wrapper, 'bad')
    expect(wrapper.find('.settings-view__error').exists()).toBe(true)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Importieren')!
      .trigger('click')
    expect(wrapper.find('.settings-view__error').exists()).toBe(false)
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('does nothing when the file input fires with no files selected', async () => {
    const wrapper = mountView()
    await wrapper.find('input[type="file"]').trigger('change')
    expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(false)
    expect(wrapper.find('.settings-view__error').exists()).toBe(false)
  })

  it('confirming import calls store.importResults and hides dialog', async () => {
    const store = useTournamentStore()
    const mockResults = {
      M01: { matchId: 'M01', homeGoals: 1, awayGoals: 0, homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 },
    }
    vi.mocked(persistence.parseImport).mockReturnValue(mockResults)
    const wrapper = mountView()
    await triggerFileChange(wrapper, '...')
    await wrapper.findComponent(ConfirmDialog).find('.btn--danger').trigger('click')
    expect(store.results).toEqual(mockResults)
    expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(false)
  })

  it('cancelling import hides dialog without saving', async () => {
    const store = useTournamentStore()
    vi.mocked(persistence.parseImport).mockReturnValue({ M01: {} as never })
    const wrapper = mountView()
    await triggerFileChange(wrapper, '...')
    await wrapper.find('dialog').trigger('close')
    expect(store.results).toEqual({})
    expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(false)
  })
})

describe('SettingsView – reset', () => {
  it('shows ConfirmDialog with reset title when Zurücksetzen is clicked', async () => {
    const wrapper = mountView()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Zurücksetzen')!
      .trigger('click')
    expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(true)
    expect(wrapper.find('.base-dialog__title').text()).toBe('Zurücksetzen')
  })

  it('confirming reset calls store.reset and hides dialog', async () => {
    const store = useTournamentStore()
    const resetSpy = vi.spyOn(store, 'reset')
    const wrapper = mountView()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Zurücksetzen')!
      .trigger('click')
    await wrapper.findComponent(ConfirmDialog).find('.btn--danger').trigger('click')
    expect(resetSpy).toHaveBeenCalledOnce()
    expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(false)
  })

  it('cancelling reset hides dialog without calling store.reset', async () => {
    const store = useTournamentStore()
    const resetSpy = vi.spyOn(store, 'reset')
    const wrapper = mountView()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Zurücksetzen')!
      .trigger('click')
    await wrapper.find('dialog').trigger('close')
    expect(resetSpy).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(false)
  })
})
