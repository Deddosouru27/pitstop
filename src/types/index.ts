export type Priority = 'none' | 'low' | 'medium' | 'high'

export interface CyclePlanPhase {
  number: number
  name: string
  description?: string
  status: 'active' | 'completed' | 'pending'
}

export interface CyclePlan {
  id: string
  name: string
  description: string | null
  status: string
  phases: CyclePlanPhase[] | null
  created_at: string
  updated_at: string
}

export type BatcherEventType =
  | 'task_completed'
  | 'idea_converted'
  | 'priority_changed'
  | 'task_created'
  | 'idea_added'

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled'

export interface Cycle {
  id: string
  project_id: string
  name: string
  description: string | null
  goal: string | null
  start_date: string
  end_date: string
  status: 'upcoming' | 'active' | 'completed'
  created_at: string
  updated_at: string
}

export interface CycleStats {
  total_tasks: number
  done_tasks: number
  in_progress: number
  blocked: number
  completion_rate: number
}

export interface Project {
  id: string
  name: string
  color: string
  github_repo?: string | null
  deploy_url?: string | null
  autorun_enabled?: boolean | null
  dod_items?: string[] | null
  context_what: string | null
  context_where: string | null
  context_done: string | null
  context_next: string | null
  ai_what_done: string | null
  ai_where_stopped: string | null
  ai_next_step: string | null
  last_session_at: string | null
  description?: string | null
  current_focus?: string | null
  tech_stack?: string[] | null
  current_needs?: string[] | null
  long_term_goals?: string[] | null
  created_at: string
  updated_at: string
}

export interface GoalChain {
  mission?: string | null
  block?: string | null
  cycle?: string | null
  phase?: string | null
  task?: string | null
}

export interface TaskContext {
  what?: string | null
  why?: string | null
  goal?: string | null
  scope?: string | null
  done_criteria?: string | null
  acceptance?: string | null
  risks?: string | null
  dependencies?: string | null
  goal_chain?: GoalChain | null
}

export interface Task {
  id: string
  title: string
  description: string | null
  is_completed: boolean
  status?: TaskStatus
  priority: Priority
  due_date: string | null
  project_id: string | null
  cycle_id?: string | null
  cycle_plan_id?: string | null
  phase_number?: number | null
  work_type?: string | null
  created_by?: string
  assignee?: string | null
  context_readiness?: string | null
  context?: TaskContext | null
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
  status?: 'new' | 'pending' | 'accepted' | 'dismissed' | 'rejected' | 'deferred' | null
  summary?: string | null
  source?: string | null
  source_type?: string | null
  relevance?: string | null
  extracted_ideas?: string[] | null
  rejection_reason?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
}

export interface Memory {
  id: string
  content: string
  source: string | null
  tags: string[] | null
  importance: number | null
  created_at: string
}

export interface ExtractedKnowledge {
  id: string
  content: string
  knowledge_type: string | null
  project_id: string | null
  immediate_relevance: number | null
  strategic_relevance: number | null
  novelty: number | null
  effort: number | null
  has_ready_code: boolean | null
  routed_to: string | string[] | null
  tags: string[] | null
  source_url: string | null
  source_type: string | null
  business_value: string | null
  ingested_content_id?: string | null
  superseded_by?: string | null
  entities?: string[] | null
  has_embedding?: boolean
  created_at: string
}

export interface MemoryHistory {
  id: string
  action: string
  prev_value: string | null
  new_value: string | null
  reason: string | null
  knowledge_id: string | null
  created_at: string
}

export interface IngestedContent {
  id: string
  title: string | null
  source_type: string | null
  source_url: string | null
  processing_status: string | null
  raw_text: string | null
  summary: string | null
  routing_result?: Record<string, unknown> | string | null
  knowledge_count: number | null
  overall_immediate?: number | null
  overall_strategic?: number | null
  is_guide?: boolean | null
  quarantined?: boolean | null
  quarantine_reason?: string | null
  created_at: string
}

export interface KnowledgeDomain {
  id: string
  name: string
  description: string | null
  priority: 'critical' | 'high' | 'medium' | 'low'
  created_at: string
  updated_at: string
}

export type Theme = 'dark' | 'light'
export type Language = 'ru' | 'en'

export interface UserSettings {
  theme: Theme
  language: Language
  notifications: boolean
}
