import { useState, useMemo } from 'react'
import { Plus, ChevronRight, X, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import CreateProjectModal from './CreateProjectModal'
import QuickCapture from './QuickCapture'
import { useAutorunStatus } from '../../hooks/useAutorunStatus'
import type { Project, Task } from '../../types'

const PRIORITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 }
const ACTIVE_STATUSES = new Set(['todo', 'in_progress', 'review', 'blocked'])

const TASK_STATUS_ICON: Record<string, string> = {
  done: '✅', cancelled: '❌', in_progress: '🔵',
  review: '👀', blocked: '🚫', todo: '⬜', backlog: '📋',
}
const ASSIGNEE_BADGE: Record<string, string> = {
  baker: '🍞', runner: '🖥️', intake: '🔧', user: '👤',
}

function sortByPriority(tasks: Task[]) {
  return [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0)
  )
}

function ProjectTasksModal({
  project, tasks, onClose,
}: { project: Project; tasks: Task[]; onClose: () => void }) {
  const navigate = useNavigate()
  const active = sortByPriority(tasks.filter(t => ACTIVE_STATUSES.has(t.status ?? '') && !t.is_completed))
  const done   = tasks.filter(t => t.is_completed || t.status === 'done')
  const cancelled = tasks.filter(t => t.status === 'cancelled')

  function TaskRow({ task }: { task: Task }) {
    const icon = TASK_STATUS_ICON[task.status ?? 'backlog'] ?? '📋'
    const dimmed = task.is_completed || task.status === 'done' || task.status === 'cancelled'
    return (
      <div className="flex items-start gap-2 py-1">
        <span className="text-xs shrink-0 mt-0.5">{icon}</span>
        <p className={`flex-1 text-xs leading-snug ${dimmed ? 'line-through text-slate-600' : 'text-slate-300'}`}>
          {task.title}
        </p>
        {task.assignee && ASSIGNEE_BADGE[task.assignee] && (
          <span className="shrink-0 text-[10px]">{ASSIGNEE_BADGE[task.assignee]}</span>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[80dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color }} />
            <p className="text-slate-100 font-semibold text-base">{project.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300">
            <X size={20} />
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
          {tasks.length === 0 && (
            <p className="text-sm text-slate-600 py-4 text-center">Нет задач</p>
          )}

          {active.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mb-1.5">
                Активные · {active.length}
              </p>
              {active.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          )}

          {done.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mb-1.5">
                Выполнено · {done.length}
              </p>
              {done.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          )}

          {cancelled.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mb-1.5">
                Отменено · {cancelled.length}
              </p>
              {cancelled.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          )}
        </div>

        {/* Open full project */}
        <div className="px-5 pb-8 pt-2 shrink-0 border-t border-white/[0.06]">
          <button
            onClick={() => { onClose(); navigate(`/projects/${project.id}`) }}
            className="w-full flex items-center justify-center gap-2 bg-purple-600/20 active:bg-purple-600/40 text-purple-400 text-sm font-medium py-3 rounded-2xl transition-colors"
          >
            Открыть проект
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsTab() {
  const { projects, projectsLoading, tasks, createProject } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const autorunState = useAutorunStatus()

  const ASSIGNEE_ICONS: Record<string, string> = { baker: '🍞', runner: '🖥️', intake: '🔧' }

  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const task of tasks) {
      if (task.project_id && !task.is_completed) {
        counts[task.project_id] = (counts[task.project_id] ?? 0) + 1
      }
    }
    return counts
  }, [tasks])

  const assigneeIcons = useMemo(() => {
    const icons: Record<string, string[]> = {}
    for (const task of tasks) {
      if (!task.project_id || task.is_completed) continue
      const key = task.assignee && ASSIGNEE_ICONS[task.assignee] ? task.assignee : null
      if (!key) continue
      if (!icons[task.project_id]) icons[task.project_id] = []
      if (!icons[task.project_id].includes(key)) icons[task.project_id].push(key)
    }
    return icons
  }, [tasks])

  if (projectsLoading) {
    return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
        <p className="text-sm text-slate-500 mt-0.5">{projects.length} projects</p>
      </div>

      {/* Autorun status indicator */}
      {autorunState !== 'idle' && (
        <div className="px-4 pb-3">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium ${
            autorunState === 'running'
              ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
          }`}>
            {autorunState === 'running' ? (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                </span>
                Autorun запущен
              </>
            ) : (
              <>
                <span className="text-base leading-none">✅</span>
                Только что выполнено
              </>
            )}
          </div>
        </div>
      )}

      <QuickCapture projects={projects} />

      <div className="px-4 space-y-2 flex-1">
        {projects.length === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-600">
            <p className="text-sm">No projects yet</p>
            <p className="text-xs mt-1">Tap + to create one</p>
          </div>
        )}

        {projects.map(project => {
          const count = taskCounts[project.id] ?? 0
          const icons = assigneeIcons[project.id] ?? []
          return (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="w-full flex items-center gap-3 bg-surface rounded-2xl overflow-hidden active:opacity-60 transition-opacity"
            >
              {/* Color left border */}
              <div className="w-1 self-stretch" style={{ background: project.color }} />
              <div className="flex-1 flex items-center gap-3 py-4 pr-4">
                <div className="flex-1 text-left">
                  <p className="font-semibold text-slate-100 text-sm">{project.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {count > 0 ? `${count} задач${count === 1 ? 'а' : count < 5 ? 'и' : ''}` : 'Нет активных задач'}
                    {icons.length > 0 && (
                      <span className="ml-1.5">{icons.map(k => ASSIGNEE_ICONS[k]).join('')}</span>
                    )}
                    {project.last_session_at && (
                      <span className="ml-2 text-slate-600">
                        · {new Date(project.last_session_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                {count > 0 && (
                  <span className="text-xs text-slate-400 bg-white/10 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
                <ChevronRight size={16} className="text-slate-600" />
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-accent hover:bg-accent/90 active:scale-95 text-white rounded-2xl shadow-lg shadow-accent/30 flex items-center justify-center transition-all z-40"
      >
        <Plus size={26} strokeWidth={2} />
      </button>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreate={async (input) => { await createProject(input) }}
        />
      )}

      {selectedProject && (
        <ProjectTasksModal
          project={selectedProject}
          tasks={tasks.filter(t => t.project_id === selectedProject.id)}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  )
}
