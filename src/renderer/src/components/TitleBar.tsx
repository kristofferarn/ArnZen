import { Minus, Square, X } from 'lucide-react'
import logo from '../../../../resources/logo_transparent.png'

export function TitleBar(): React.JSX.Element {
  return (
    <div className="flex items-center justify-between h-9 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] select-none app-drag">
      <div className="pl-3 flex items-center gap-2">
        <img src={logo} alt="ArnZen" className="h-4.5 w-4.5 object-contain" />
        <span className="mono text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--color-accent)]">
          ArnZen
        </span>
      </div>
      <div className="flex app-no-drag">
        <button
          onClick={() => window.api.windowMinimize()}
          className="px-3.5 h-9 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => window.api.windowMaximize()}
          className="px-3.5 h-9 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.api.windowClose()}
          className="px-3.5 h-9 text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-danger)] transition-colors duration-150"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
