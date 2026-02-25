import type { Terminal } from '@xterm/xterm'

/**
 * Attach clipboard shortcuts to an xterm.js terminal.
 *
 * Ctrl+V: We only suppress xterm's default handling (which would send a raw
 * ^V control character to the shell). The actual paste is handled by xterm's
 * built-in paste-event listener, which fires when the browser processes the
 * Ctrl+V on the focused textarea. This gives us a single paste path and
 * avoids double-paste with tools that simulate Ctrl+V (e.g. Wispr Flow).
 *
 * Ctrl+C: When there is an active selection we copy it to the clipboard
 * instead of sending SIGINT.
 */
export function attachClipboardHandler(terminal: Terminal): void {
  terminal.attachCustomKeyEventHandler((event) => {
    if (event.type === 'keydown' && event.ctrlKey && event.key === 'v') {
      // Suppress xterm's default ^V handling; paste is handled by xterm's
      // own paste-event listener on the textarea.
      return false
    }
    if (event.type === 'keydown' && event.ctrlKey && event.key === 'c' && terminal.hasSelection()) {
      navigator.clipboard.writeText(terminal.getSelection()).catch(() => {})
      return false
    }
    return true
  })
}
