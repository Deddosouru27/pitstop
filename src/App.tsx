import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import BottomNav from './components/BottomNav'
import TaskDetail from './components/tasks/TaskDetail'
import ProjectsTab from './components/projects/ProjectsTab'
import TasksTab from './components/tasks/TasksTab'
import ProjectDetail from './components/projects/ProjectDetail'
import CalendarTab from './components/calendar/CalendarTab'
import IdeasTab from './components/ideas/IdeasTab'
import DashboardPage from './components/dashboard/DashboardPage'
import MemoryViewer from './components/memory/MemoryViewer'
import KnowledgePage from './components/knowledge/KnowledgePage'
import IngestedPage from './components/ingested/IngestedPage'
import DomainsPage from './components/domains/DomainsPage'
import SettingsPage from './components/settings/SettingsPage'
import SmokeTestPage from './components/smoke/SmokeTestPage'
import GraphPage from './components/graph/GraphPage'
import AgentLogsPage from './components/agent-logs/AgentLogsPage'
import AgentMonitorPage from './components/agents/AgentMonitorPage'
import AgentsPage from './components/agents/AgentsPage'
import IntakeLogsPage from './components/intake-logs/IntakeLogsPage'
import IdeasTriagePage from './components/triage/IdeasTriagePage'
import StatsPage from './components/stats/StatsPage'
import DataQualityPage from './components/data-quality/DataQualityPage'
import DiscoveryPage from './components/discovery/DiscoveryPage'
import PendingPage from './components/pending/PendingPage'
import AuditPage from './components/audit/AuditPage'

function AppShell() {
  const { selectedTaskId, closeTask } = useApp()

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsTab />} />
          <Route path="/tasks" element={<TasksTab />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/calendar" element={<CalendarTab />} />
          <Route path="/ideas" element={<IdeasTab />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/memory" element={<MemoryViewer />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/ingested" element={<IngestedPage />} />
          <Route path="/domains" element={<DomainsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/smoke-test" element={<SmokeTestPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/agent-logs" element={<AgentLogsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agent-monitor" element={<AgentMonitorPage />} />
          <Route path="/intake-logs" element={<IntakeLogsPage />} />
          <Route path="/ideas-triage" element={<IdeasTriagePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/data-quality" element={<DataQualityPage />} />
          <Route path="/discovery" element={<DiscoveryPage />} />
          <Route path="/pending" element={<PendingPage />} />
          <Route path="/audit" element={<AuditPage />} />
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
