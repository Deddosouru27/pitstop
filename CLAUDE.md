# Pitstop — инструкция для Claude Code агента

## Что это
Центральный оркестратор MAOS. React + Vite + TypeScript + Tailwind + Supabase.
Деплой: pitstop-dusky.vercel.app (Vercel, автодеплой из main).

## Ключевые файлы
- src/context/AppContext.tsx — главный стейт приложения
- src/hooks/ — хуки для данных (useProjects, useTasks, useMemories...)
- src/types/index.ts — все TypeScript типы, начинай отсюда
- src/components/ — UI по папкам (projects/, tasks/, dashboard/, memory/)
- supabase/migrations/ — SQL миграции, выполнять вручную в Supabase Dashboard

## Supabase
Project ID: stqhnkhcfndmhgvfyojv, RLS отключён
Таблицы: projects, tasks, subtasks, ideas, context_snapshots, cycles, agent_jobs
Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

## Правила
1. Полный код — никаких TODO и заглушек
2. TypeScript: все типы явные, никаких any
3. npm run build ОБЯЗАТЕЛЕН до коммита
4. npm install — всегда с --legacy-peer-deps (Vite 8)
5. .env файлы — не трогать через терминал echo

## Что НЕ делать
- Не удалять Ogham/OpenClaw references — это decision log
- Не добавлять Scrum-артефакты без явной задачи
- Не трогать Realtime подписки в useProjects/useTasks без понимания

## Команды
npm run dev      — локальная разработка (порт 5173)
npm run build    — проверка перед коммитом
git add . && git commit -m "feat: ..." && git push origin main
