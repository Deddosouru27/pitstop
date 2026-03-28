import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import BottomNav from './components/BottomNav'
import TaskDetail from './components/tasks/TaskDetail'
import ProjectsTab from './components/projects/ProjectsTab'
import ProjectDetail from './components/projects/ProjectDetail'
import CalendarTab from './components/calendar/CalendarTab'
import IdeasTab from './components/ideas/IdeasTab'
import DashboardPage from './components/dashboard/DashboardPage'

function AppShell() {
  const { selectedTaskId, closeTask } = useApp()

  return (
    <div className="flex flex-col h-dvh bg-[#0a0a0f] text-slate-100 overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsTab />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/calendar" element={<CalendarTab />} />
          <Route path="/ideas" element={<IdeasTab />} />
          <Route path="/dashboard" element={<DashboardPage />} />
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
