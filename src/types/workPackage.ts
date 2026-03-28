export interface WorkPackage {
  taskId?: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'none'
  context: {
    projectName: string
    projectState: string
    whereStoped: string
    nextStep: string
  }
  goal?: string
  expectedOutcome: string
  subtasks?: { title: string; is_completed: boolean }[]
  createdAt: string
}
