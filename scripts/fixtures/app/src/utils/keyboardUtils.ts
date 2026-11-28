// A small copy of the app's keymap format for the website's tests
// (scripts/shortcuts.test.mjs, build.test.mjs).
export const KEYBIND_SECTIONS: KeybindSection[] = [
  { id: 'library', label: 'settings.keybinds.sections.library' },
  { id: 'view', label: 'settings.keybinds.sections.view' }
];

export const KEYBIND_DEFINITIONS: KeybindDefinition[] = [
  { action: 'view_grid', description: 'appMenu.items.view_grid', defaultCombo: ['KeyG'], section: 'view' },
  {
    // A comment inside an entry.
    action: 'flag_reject',
    description: 'appMenu.items.flag_reject',
    defaultCombo: ['KeyX'],
    aliasCombos: [['shift', 'KeyX']],
    section: 'library'
  },
  {
    action: 'export_previous',
    description: 'appMenu.items.export_previous',
    defaultCombo: ['ctrl', 'shift', 'alt', 'KeyE'],
    section: 'library'
  },
  { action: 'copy_files', description: 'appMenu.items.copy_files', defaultCombo: [], section: 'library' },
  { action: 'zoom_in', description: 'appMenu.items.zoom_in', defaultCombo: ['ctrl', 'Equal'], section: 'view' },
  { action: 'show_original', description: 'appMenu.items.show_original', defaultCombo: ['Backslash'], section: 'view' }
];
