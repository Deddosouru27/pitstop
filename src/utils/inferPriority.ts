interface InferContext {
  nextStep: string
  whereStoped: string
  activeTasks: { title: string; priority: string }[]
  recentIdeas: { content: string }[]
}

const HIGH_KEYWORDS = [
  'баг', 'ошибка', 'сломан', 'критич', 'срочно',
  'fix', 'bug', 'critical', 'urgent', 'block',
]
const MEDIUM_KEYWORDS = [
  'добавить', 'сделать', 'реализовать', 'внедрить', 'улучшить',
  'add', 'implement', 'improve',
]

/** Returns a Set of lowercase words with length > minLen */
function wordSet(text: string, minLen = 1): Set<string> {
  return new Set(
    text.toLowerCase().split(/\W+/).filter(w => w.length > minLen),
  )
}

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const w of a) if (b.has(w)) return true
  return false
}

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(k => lower.includes(k))
}

export function inferPriority(
  taskTitle: string,
  context: InferContext,
): 'high' | 'medium' | 'low' {
  if (!taskTitle.trim()) return 'low'

  const titleLong = wordSet(taskTitle, 4)   // words >4 chars for overlap
  const titleAll = wordSet(taskTitle, 1)    // all words for keyword check

  // ── HIGH ─────────────────────────────────────────────────────────────────
  if (containsAny(taskTitle, HIGH_KEYWORDS)) return 'high'

  const nextStepWords = wordSet(context.nextStep, 4)
  const whereStopedWords = wordSet(context.whereStoped, 4)

  if (titleLong.size > 0) {
    if (hasOverlap(titleLong, nextStepWords)) return 'high'
    if (hasOverlap(titleLong, whereStopedWords)) return 'high'
  }

  // ── MEDIUM ────────────────────────────────────────────────────────────────
  if (containsAny(taskTitle, MEDIUM_KEYWORDS)) return 'medium'

  // Overlap with any HIGH-priority active task title
  const highTaskWords = context.activeTasks
    .filter(t => t.priority === 'high')
    .flatMap(t => [...wordSet(t.title, 4)])
  if (highTaskWords.length > 0) {
    const highSet = new Set(highTaskWords)
    if (hasOverlap(titleLong, highSet)) return 'medium'
  }

  // Any task-title word appears in 2+ idea bodies
  const ideasText = context.recentIdeas.map(i => i.content.toLowerCase())
  for (const word of titleAll) {
    const matches = ideasText.filter(t => t.includes(word)).length
    if (matches >= 2) return 'medium'
  }

  return 'low'
}
