import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import BottomNav from './components/BottomNav'
import TaskDetail from './components/tasks/TaskDetail'
import ProjectsTab from './components/projects/ProjectsTab'
import ProjectDetail from './components/projects/ProjectDetail'
import CalendarTab from './components/calendar/CalendarTab'
import IdeasTab from './components/ideas/IdeasTab'
import DashboardPage from './components/dashboard/DashboardPage'
import MemoryViewer from './components/memory/MemoryViewer'
import KnowledgePage from './components/knowledge/KnowledgePage'
import IngestedPage from './components/ingested/IngestedPage'
import DomainsPage from './components/domains/DomainsPage'
import SettingsPage from './components/settings/SettingsPage'

function AppShell() {
  const { selectedTaskId, closeTask } = useApp()

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsTab />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/calendar" element={<CalendarTab />} />
          <Route path="/ideas" element={<IdeasTab />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/memory" element={<MemoryViewer />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/ingested" element={<IngestedPage />} />
          <Route path="/domains" element={<DomainsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </main>
      <BottomNav />
      {selectedTaskId && (
        <TaskDetail taskId={selectedTaskId} onClose={closeTask} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  )
}
