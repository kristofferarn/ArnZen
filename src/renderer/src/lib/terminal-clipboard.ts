import type { Terminal } from '@xterm/xterm'

/**
 * Attach Ctrl+V paste and Ctrl+C copy-selection to an xterm.js terminal.
 * Electron's frameless window doesn't wire native clipboard events for
 * xterm.js, so we handle them manually.
 */
export function attachClipboardHandler(terminal: Terminal): void {
  terminal.attachCustomKeyEventHandler((event) => {
    if (event.type === 'keydown' && event.ctrlKey && event.key === 'v') {
      navigator.clipboard
        .readText()
        .then((text) => {
          if (text) terminal.paste(text)
        })
        .catch(() => {})
      return false
    }
    if (event.type === 'keydown' && event.ctrlKey && event.key === 'c' && terminal.hasSelection()) {
      navigator.clipboard.writeText(terminal.getSelection()).catch(() => {})
      return false
    }
    return true
  })
}
