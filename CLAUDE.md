# CLAUDE.md — Инструкции для Claude Code в проекте Pitstop

## Кто владелец
Артур — предприниматель, не кодер. Работает через AI-assisted разработку. Код должен быть понятным, самодокументированным. Если решение неочевидное — комментарий зачем. Никакой магии, никаких хаков.

## Что такое Pitstop
Центральный оркестратор MAOS (Multi-Agent Operational System). Не просто todo-app — это PM-система с AI-контекстом, памятью между сессиями, декомпозицией целей и handoff-логикой для агентов.

URL: pitstop-dusky.vercel.app | GitHub: Deddosouru27/pitstop

### Стек
React 18+, Vite 8, TypeScript strict, Tailwind CSS, Supabase (PostgreSQL), Vercel автодеплой из main. PWA с поддержкой iOS.

### Структура
- src/components/ — React компоненты (рендеринг, минимум логики)
- src/hooks/ — кастомные хуки (ВСЯ бизнес-логика)
- src/utils/ — утилиты
- src/types/ — TypeScript типы
- src/lib/supabase.ts — единственный экземпляр Supabase клиента
- supabase/migrations/ — SQL миграции

### Supabase таблицы
- projects: id, name, ai_what_done, ai_where_stopped, ai_next_step, ai_project_state, color
- tasks: id, title, status (backlog/todo/in_progress/review/blocked/done/cancelled), priority (high/medium/low), project_id, cycle_id, estimate
- subtasks: id, task_id, title, completed
- ideas: id, title, description, project_id
- context_snapshots: id, project_id, snapshot (jsonb), type, created_at
- cycles: id, project_id, name, description, goal, start_date, end_date, status (upcoming/active/completed)
- labels: id, project_id, name, color
- task_labels: task_id, label_id
- agent_jobs: id, type, status, payload, result, retry_count, chat_id

### Что реализовано
Задачи с приоритетами, AI-контекст проектов, декомпозиция целей, work packages, review modal, execution tracker, auto-priorities, Scrum Этап 1 (workflow-статусы, cycles, CycleSelector), Supabase Realtime автообновление UI, PWA iOS.

---

## БЕЗОПАСНОСТЬ (читай первым)

### Секреты
- НЕ читать, НЕ выводить, НЕ логировать значения переменных окружения
- НЕ вставлять токены/ключи в URL, код, комментарии, коммит-сообщения, отчёты, README, тесты
- НЕ редактировать .env файлы
- НЕ коммитить .env, *.env, любые файлы с секретами
- Если нужен новый секрет — сообщить в отчёте "нужно добавить X в .env", не создавать самому

### Shell ограничения
ЗАПРЕЩЕНО без явной команды пользователя:
- rm -rf, sudo, chmod -R, chown, mkfs, shutdown, reboot
- Любые команды затрагивающие домашнюю директорию целиком
- Изменение глобальных git/npm/system настроек
- Установка системных пакетов (apt, brew, winget)
- Запуск фоновых процессов (daemon, nohup, &)
- Изменение SSH конфигов, credential helpers, shell profiles
- curl | bash, wget | bash, npx <неизвестный пакет>

РАЗРЕШЕНО:
- npm install <пакет> --legacy-peer-deps (проверенные пакеты)
- npm run build, npm test, npx vitest, npx tsx
- git add, git commit, git push (в feature branch)
- cat, ls, grep, find, head, tail (чтение файлов)
- mkdir, touch, cp (создание файлов в рамках проекта)

### Git ограничения
- НЕ пушить в main напрямую. Только feature/ или fix/ ветки
- НЕ делать git push --force, git reset --hard, git clean -fd
- НЕ переписывать историю (rebase, amend опубликованных коммитов)
- НЕ менять remote origin без явного основания
- НЕ пушить если npm run build не прошёл
- Коммитить только релевантные файлы, не git add . бездумно
- Push только если пользователь явно попросил ("и запуши", "push", "задеплой")

---

## СТОП-УСЛОВИЯ (когда остановиться)

ОБЯЗАТЕЛЬНО остановись и верни отчёт вместо продолжения если:
- Задача требует секрет которого нет в env
- Нужно изменить инфраструктуру (Vercel config, Supabase settings, домен)
- Нужна деструктивная SQL миграция (DROP TABLE, DELETE данных)
- Нужно удалить больше 3 файлов
- Непонятно какой проект/файл редактировать
- Действие затрагивает деньги, доступы, внешние аккаунты
- Изменение может сломать memory/context layer (см. ниже)
- Уверенность в правильности решения ниже 80%
- Build падает после 3 попыток исправления

При остановке верни:
⚠️ СТОП: [причина]
Что нужно от Артура: [конкретное действие]
Что уже сделано: [если что-то частично выполнено]

---

## ЗАВИСИМОСТИ

### Перед установкой нового пакета — чеклист:
1. Есть ли уже в проекте зависимость которая решает задачу?
2. Можно ли решить существующим стеком за <20 строк?
3. Пакет из npm registry (не случайный GitHub repo)?
4. >1000 weekly downloads?
5. Последний коммит <6 месяцев назад?
6. Нет известных CVE?
7. Не тащит огромный bundle? (проверь bundlephobia.com мысленно)
8. Не требует postinstall скриптов или native зависимостей?

Если хотя бы один пункт — нет, не ставь. Напиши лучше сам.

### npm install ВСЕГДА с --legacy-peer-deps

### Уже используемые пакеты (предпочитай их):
@dnd-kit/core, @dnd-kit/sortable (drag-and-drop), recharts (графики), react-day-picker (даты), @supabase/supabase-js, @anthropic-ai/sdk

---

## КАЧЕСТВО КОДА

### Обязательно
- Полный рабочий код. Никаких TODO, заглушек, placeholder, "добавить позже"
- TypeScript strict: все типы явно в src/types/, никаких any
- Логика в хуках (src/hooks/), компоненты только рендерят
- Unused variables — удалять
- Файлы не больше 300 строк — декомпозировать
- npm run build после КАЖДОГО изменения. 0 ошибок

### Запрещено
- any в TypeScript
- console.log в production (только console.error для ошибок)
- Хардкод URL и ключей
- Инлайн стили — только Tailwind
- Ломать существующий функционал

### UX паттерны Pitstop
- Glassmorphism: bg-white/5, backdrop-blur, border-white/10
- Primary: purple-500/purple-600
- Мобиль-first, iOS PWA safe area: env(safe-area-inset-bottom)
- Анимации: transition-all duration-200

### Хуки — паттерн
```typescript
export function useXxx(projectId: string) {
  const [items, setItems] = useState<Type[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => { /* загрузка */ }
  const createItem = async (data: CreateType) => { /* создание */ }

  // Realtime подписка
  useSupabaseRealtime({ table: 'xxx', channelName: 'xxx-changes' }, {
    onInsert: (record) => setItems(prev => [record, ...prev]),
    onUpdate: (record) => setItems(prev => prev.map(i => i.id === record.id ? record : i)),
    onDelete: (old) => setItems(prev => prev.filter(i => i.id !== old.id))
  })

  useEffect(() => { fetchItems() }, [projectId])
  return { items, loading, createItem }
}
```

---

## ТЕСТИРОВАНИЕ

npm run build — обязателен но НЕДОСТАТОЧЕН.

### После каждого изменения:
1. npm run build → 0 ошибок TypeScript
2. Запусти существующие тесты если есть: npx vitest run
3. Если тестов нет для изменённой логики — создай минимальный тест
4. Для UI изменений — составь smoke checklist (что проверить вручную)

### Для критических изменений (memory, context, workflow):
- Позитивный сценарий: основной flow работает
- Негативный: невалидные данные не ломают приложение
- Регрессия: существующие фичи не сломаны
- Описать в отчёте что проверено

---

## HIGH-RISK ЗОНЫ PITSTOP

Изменения в этих областях требуют ПОВЫШЕННОЙ осторожности:

### Memory/Context layer
Файлы и поля: ai_what_done, ai_where_stopped, ai_next_step, ai_project_state, context_snapshots, useProjects
- Проверять что изменение не создаёт дублирование контекста
- Проверять что старый/удалённый контекст не влияет на новый
- Не перезаписывать контекст без сохранения предыдущего в snapshot

### Workflow/Cycles
Файлы: useCycles, useTasks (статусы), CycleSelector
- Проверять что смена статуса корректна (backlog→todo→in_progress→done)
- Проверять что незакрытые задачи не теряются при завершении цикла

### Декомпозиция целей
Файлы: Claude API интеграция, inferPriority
- AI может предложить задачи которые уже сделаны — фильтровать
- AI может предложить неправильный порядок — проверять зависимости

---

## ЭФФЕКТИВНОСТЬ (экономия токенов)

- НЕ читать весь проект. Сначала определи точку входа через grep/find/imports
- Сначала краткий план (3-5 строк), потом реализация
- Для крупных задач: inspect → plan → patch → build → report
- Не перечитывать большие файлы которые уже проверил
- Не дублировать контекст в промптах

---

## SQL МИГРАЦИИ

Агент может выполнять SQL миграции самостоятельно через Supabase REST API.

Правила:
- Всегда IF NOT EXISTS / IF EXISTS для идемпотентности
- Сохранять миграцию как файл в supabase/migrations/NNN_description.sql
- Для деструктивных миграций (DROP, DELETE) — СТОП, спросить Артура
- Перед ALTER TABLE — проверить что колонка/таблица существует

---

## ОТЧЁТ ПОСЛЕ ВЫПОЛНЕНИЯ

Каждый ответ заканчивается структурированным отчётом:
✅ РЕЗУЛЬТАТ: [что сделано, 1-2 строки]
📁 ФАЙЛЫ: [изменённые файлы]
📦 ЗАВИСИМОСТИ: [добавленные пакеты или "без изменений"]
🔨 BUILD: [результат npm run build]
🧪 ТЕСТЫ: [что проверено]
⚠️ РИСКИ: [что может сломаться, или "нет"]
📋 NEXT STEP: [что делать дальше]

Если задача не завершена:
⏸️ ЧАСТИЧНЫЙ РЕЗУЛЬТАТ: [что сделано]
🚫 БЛОКЕР: [что помешало]
📋 НУЖНО: [что требуется для продолжения]
