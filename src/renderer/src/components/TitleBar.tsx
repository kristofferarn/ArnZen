import { Minus, Square, X } from 'lucide-react'
import logo from '../../../../resources/logo_transparent.png'

export function TitleBar(): React.JSX.Element {
  return (
    <div className="flex items-center justify-between h-9 glass-solid border-b border-[var(--glass-border)] select-none app-drag">
      <div className="pl-3 flex items-center gap-2">
        <img src={logo} alt="ArnZen" className="h-5 w-5 object-contain" />
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--color-accent)] opacity-80">
          ArnZen
        </span>
      </div>
      <div className="flex app-no-drag">
        <button
          onClick={() => window.api.windowMinimize()}
          className="px-3.5 h-9 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all duration-200"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => window.api.windowMaximize()}
          className="px-3.5 h-9 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all duration-200"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.api.windowClose()}
          className="px-3.5 h-9 text-[var(--color-text-muted)] hover:text-white hover:bg-red-500/80 transition-all duration-200"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
