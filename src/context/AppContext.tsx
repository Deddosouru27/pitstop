import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import type { Task, Project, Priority } from '../types'

interface AppContextType {
  tasks: Task[]
  tasksLoading: boolean
  createTask: (input: { title: string; priority: Priority; due_date: string | null; project_id: string | null }) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>
  completeTask: (id: string, completed: boolean, onCompleted?: (task: Task) => void) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  projects: Project[]
  projectsLoading: boolean
  createProject: (input: Pick<Project, 'name' | 'color'>) => Promise<Project | null>
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>
  deleteProject: (id: string) => Promise<void>
  selectedTaskId: string | null
  openTask: (id: string) => void
  closeTask: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const t = useTasks()
  const p = useProjects()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const openTask = useCallback((id: string) => setSelectedTaskId(id), [])
  const closeTask = useCallback(() => setSelectedTaskId(null), [])

  return (
    <AppContext.Provider value={{
      tasks: t.tasks,
      tasksLoading: t.loading,
      createTask: t.createTask,
      updateTask: t.updateTask,
      completeTask: t.completeTask,
      deleteTask: t.deleteTask,
      projects: p.projects,
      projectsLoading: p.loading,
      createProject: p.createProject,
      updateProject: p.updateProject,
      deleteProject: p.deleteProject,
      selectedTaskId,
      openTask,
      closeTask,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
