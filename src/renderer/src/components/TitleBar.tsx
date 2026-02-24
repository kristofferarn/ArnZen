import { useState, useEffect } from 'react'
import { ArrowDownToLine, Minus, RotateCw, Square, X } from 'lucide-react'
import logo from '../../../../resources/logo_transparent.png'

export function TitleBar(): React.JSX.Element {
  const [updateState, setUpdateState] = useState<
    { status: 'idle' } | { status: 'available'; version: string } | { status: 'downloading' } | { status: 'ready' }
  >({ status: 'idle' })

  useEffect(() => {
    const cleanupAvailable = window.api.onUpdateAvailable((version) => {
      setUpdateState({ status: 'available', version })
    })
    const cleanupDownloaded = window.api.onUpdateDownloaded(() => {
      setUpdateState({ status: 'ready' })
    })
    return () => { cleanupAvailable(); cleanupDownloaded() }
  }, [])

  const handleUpdate = (): void => {
    if (updateState.status === 'available') {
      setUpdateState({ status: 'downloading' })
      window.api.updaterDownload()
    } else if (updateState.status === 'ready') {
      window.api.updaterInstall()
    }
  }

  return (
    <div className="flex items-center justify-between h-9 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] select-none app-drag">
      <div className="pl-3 flex items-center gap-2">
        <img src={logo} alt="ArnZen" className="h-4.5 w-4.5 object-contain self-center" />
        <span className="flex items-baseline gap-1.5">
          <span className="mono text-xs font-semibold tracking-[0.15em] leading-none">
            <span className="text-white">Arn</span><span className="text-[var(--color-accent)]">Zen</span>
          </span>
          <span className="mono text-[9px] leading-none text-[var(--color-text-muted)]">
            {__IS_DEV__ ? 'dev' : `v${__APP_VERSION__}`}
          </span>
        </span>

        {updateState.status !== 'idle' && (
          <button
            onClick={handleUpdate}
            disabled={updateState.status === 'downloading'}
            className="flex items-center gap-1 px-1.5 h-5 rounded text-[9px] mono app-no-drag transition-colors duration-150 bg-[var(--color-accent-subtle)] text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              updateState.status === 'available' ? `Download v${updateState.version}` :
              updateState.status === 'downloading' ? 'Downloading...' :
              'Restart to update'
            }
          >
            {updateState.status === 'available' && (
              <>
                <ArrowDownToLine size={10} />
                <span>v{updateState.version}</span>
              </>
            )}
            {updateState.status === 'downloading' && (
              <>
                <ArrowDownToLine size={10} className="animate-pulse" />
                <span>Downloading</span>
              </>
            )}
            {updateState.status === 'ready' && (
              <>
                <RotateCw size={10} />
                <span>Restart</span>
              </>
            )}
          </button>
        )}
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
