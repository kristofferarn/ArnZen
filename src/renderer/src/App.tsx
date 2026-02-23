import { useEffect, useRef } from 'react'
import { TitleBar } from './components/TitleBar'
import { Toolbar } from './components/Toolbar'
import { DevServerPeek } from './components/DevServerPeek'
import { WidgetArea } from './components/WidgetArea'
import { useWorkspaceStore } from './stores/workspace-store'

function App(): React.JSX.Element {
  const { projects, activeProjectId, loadProjects, setActiveProjectId } = useWorkspaceStore()
  const initialized = useRef(false)

  // Load projects on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    window.api.loadProjects().then(({ projects, lastActiveProjectId }) => {
      if (projects.length > 0) {
        loadProjects(projects)
        setActiveProjectId(lastActiveProjectId ?? projects[0].id)
      }
    })
  }, [loadProjects, setActiveProjectId])

  // Auto-save on changes
  useEffect(() => {
    if (!initialized.current) return
    const saveTimeout = setTimeout(() => {
      for (const project of projects) {
        window.api.saveProject(project)
      }
      window.api.saveGlobalConfig({
        projectPaths: projects.map((p) => p.rootPath),
        lastActiveProjectId: activeProjectId
      })
    }, 500)
    return () => clearTimeout(saveTimeout)
  }, [projects, activeProjectId])

  return (
    <div className="flex flex-col h-screen gradient-mesh">
      <TitleBar />
      <Toolbar />
      <DevServerPeek />
      <div className="flex-1 flex flex-col overflow-hidden">
        <WidgetArea />
      </div>
    </div>
  )
}

export default App
