# Context Snapshots Audit Report

**Date:** 2026-04-07
**Auditor:** Baker (Pitstop FE)
**Scope:** `context_snapshots` table in Pitstop Supabase (stqhnkhcfndmhgvfyojv)

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Total snapshots | 289 | 286 |
| Duplicates removed | — | 3 |
| Mistyped ai_summary reclassified | 37 broken | 0 broken |
| NULL project_id | 93 | 93 (intentional) |

---

## Actions Taken

### 1. Deleted 3 Duplicates

| ID | Type | Reason | Kept |
|----|------|--------|------|
| `d8eb77db` | system_rule (onboarding) | Exact content dupe, older version | `7e3b0870` (newer, 2026-04-04) |
| `3366c0ff` | ai_summary (heartbeat) | Identical content, created 2 min after original | `70432716` (original, 2026-03-27) |
| `5b884da2` | ai_summary (cycle report) | Less detailed dupe of Cycle 2 report | `ad6a737c` (more detailed, same day) |

### 2. Reclassified 37 Mistyped ai_summary Records

These records were stored as `snapshot_type = 'ai_summary'` but had no `what_done` field — breaking `getContextForAI()` which reads `what_done` from all ai_summary records.

| New Type | Count | Content Examples |
|----------|-------|------------------|
| intake_processing_log | 16 | Instagram/article processing results with hot_count, source_url |
| session_log | 9 | Daily reports, cycle kickoffs, session summaries, completion reports |
| lesson | 7 | Quality audits, knowledge gap analysis, system audits |
| handoff | 3 | Session handoffs between agents/chats |
| decision | 2 | Planning notes, pending decisions |

---

## Final Distribution (286 snapshots)

| snapshot_type | Count | NULL project_id |
|---------------|-------|-----------------|
| system_rule | 76 | 31 |
| decision | 42 | 12 |
| intake_processing_log | 32 | 16 |
| lesson | 29 | 0 |
| job_outcome | 28 | 0 |
| session_log | 18 | 8 |
| agent_action | 14 | 5 |
| task_completed | 10 | 6 |
| decision_log | 9 | 9 |
| ai_summary | 8 | 0 |
| task_created | 6 | 0 |
| handoff | 6 | 5 |
| idea_added | 3 | 0 |
| scoring_audit | 2 | 0 |
| daily_summary | 2 | 0 |
| calibration_data | 1 | 1 |

---

## Remaining Issues (non-blocking)

### NULL project_id (93 records)
These are cross-project system records written by CEO/agents without a project context. They include handoffs, decision_logs, system_rules, and agent_actions. **Not orphaned** — they are intentionally project-agnostic. Could be assigned to a "MAOS System" project in the future if needed.

### Type Proliferation
16 distinct snapshot_types exist in DB, but the TypeScript `SnapshotType` union in `useContextSnapshots.ts` only covers 8. The extra types (`system_rule`, `decision`, `lesson`, `job_outcome`, `session_log`, `agent_action`, `decision_log`, `handoff`) are used by Runner/CEO agents. Consider extending the TS type or creating a separate DB view for agent-written snapshots.

### No Exact Duplicates Remain
Verified: `GROUP BY content::text HAVING count(*) > 1` returns 0 rows.

---

## Impact

- **`getContextForAI()` fixed**: Previously returned NULL `what_done` for 37/47 ai_summary records (79% noise). Now all 8 remaining ai_summaries have valid `what_done` fields.
- **No data loss**: Only true duplicates deleted. All unique content preserved.
- **No code changes needed**: Cleanup was DB-only.
