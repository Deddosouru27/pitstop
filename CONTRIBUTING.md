# Contributing to Pitstop

## Development Rules

### Code Quality

- **TypeScript strict** — all types must be explicit. No `any`, no `@ts-ignore`.
- **Complete code only** — no TODOs, stubs, or placeholder data in commits.
- **Build must pass** — run `npm run build` before every push. If it fails, do not push.

### Styling

- **Tailwind CSS only** — utility classes exclusively. No CSS modules, no styled-components, no inline style objects.
- **Mobile-first** — use safe area insets (`pb-safe`, `min-h-dvh`), touch targets >= 44px.

### State Management

- `useState` / `useReducer` + custom hooks in `src/hooks/`.
- No Redux, no Zustand, no external state libraries.

### Data Layer

- All data access goes through the Supabase JS client from `src/lib/supabase.ts`.
- Always use filters on queries — no unfiltered `SELECT *` on large tables.
- Realtime subscriptions must return a cleanup function from `useEffect` (call `removeChannel`).

### Components

- Organised by feature inside `src/components/` (e.g., `agents/`, `audit/`, `ideas/`).
- Prefer reusing existing components over creating new ones.
- Icons: use `lucide-react`.

### Git Workflow

- **One commit = one feature or fix.** Do not mix unrelated changes.
- Write meaningful commit messages in English.
- `git push --force` is forbidden without explicit approval.

### Dependencies

- Always install with `--legacy-peer-deps` (configured in `.npmrc`).
- Do not add new dependencies without justification.

### Security

- **Never** commit API keys, secrets, or credentials.
- Environment variables go in `.env.local` (gitignored).

## Testing

Tests use Vitest + Testing Library. Test files are colocated with the code they test (`*.test.ts` or `*.test.tsx`).

```bash
npm run test          # run all tests
npm run test:watch    # watch mode
```

### Supabase Mock Pattern

When mocking Supabase in tests, use the thenable query builder pattern:

```typescript
vi.mock('../lib/supabase', () => {
  function makeQ(data: unknown[]) {
    const result = { data, error: null, count: data.length }
    const q: any = {}
    for (const m of ['select', 'order', 'eq', 'neq', 'in', 'filter', 'not', 'limit', 'range', 'gte', 'lte', 'is', 'maybeSingle']) {
      q[m] = () => q
    }
    q.then = (r: (v: typeof result) => unknown, x?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(r, x)
    q.single = () => Promise.resolve({ data: (data as unknown[])[0] ?? null, error: null })
    return q
  }
  return {
    supabase: {
      from: () => makeQ([]),
      channel: () => ({ on: () => ({}), subscribe: () => {} }),
      removeChannel: () => {}
    }
  }
})
```

## Verify Before Push

```bash
npm run build    # must succeed
npm run test     # must pass
npm run lint     # should be clean
```
