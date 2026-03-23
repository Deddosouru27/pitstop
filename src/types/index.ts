export type Priority = 'none' | 'low' | 'medium' | 'high'

export interface Project {
  id: string
  name: string
  color: string
  context_what: string | null
  context_where: string | null
  context_done: string | null
  context_next: string | null
  ai_what_done: string | null
  ai_where_stopped: string | null
  ai_next_step: string | null
  last_session_at: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  is_completed: boolean
  priority: Priority
  due_date: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  created_at: string
}

export interface Idea {
  id: string
  project_id: string
  content: string
  category: string
  ai_category: string
  converted_to_task: boolean
  created_at: string
}
