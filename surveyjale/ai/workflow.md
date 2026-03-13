# Workflow & Operating Rules

Rules for how Claude Code operates on this project. Skills must be invoked via the `Skill` tool — reading this file does not substitute for invoking them.

---

## Core Principles

- **Simplicity First** — Touch minimal code. Make every change as small as possible.
- **No Laziness** — Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact** — Only touch what's necessary. Avoid cascading changes.

---

## Skill Invocation Map

This project uses skills from the `superpowers` and `everything-claude-code` packs. Invoke the correct skill **before** acting — not after.

### Planning & Design

| Trigger | Skill to invoke |
|---|---|
| Any new feature, UI change, or multi-step task | `superpowers:brainstorming` first, then `superpowers:writing-plans` |
| Turning a spec or requirement into a step-by-step plan | `superpowers:writing-plans` |
| UI/UX decisions — layout, visual design, components, responsiveness | `ui-ux-pro-max:ui-ux-pro-max` |
| Frontend architecture, React patterns, state management | `everything-claude-code:frontend-patterns` |

### Implementation

| Trigger | Skill to invoke |
|---|---|
| Executing a written plan | `superpowers:executing-plans` |
| Implementing any feature or bugfix | `superpowers:test-driven-development` |
| Adding auth, handling user input, API endpoints, or sensitive data | `everything-claude-code:security-review` |

### Debugging

| Trigger | Skill to invoke |
|---|---|
| Any bug, test failure, or unexpected behavior | `superpowers:systematic-debugging` |

### Completion & Review

| Trigger | Skill to invoke |
|---|---|
| About to say "done", "complete", or "fixed" | `superpowers:verification-before-completion` |
| Major feature or step complete | `superpowers:requesting-code-review` |

---

## Workflow Stages

### 1. Before Starting Any Task
- Invoke `superpowers:brainstorming` for features, UI work, or anything with design decisions.
- Invoke `superpowers:writing-plans` for anything 3+ steps or with architectural impact.
- For UI-heavy work, invoke `ui-ux-pro-max:ui-ux-pro-max` before touching JSX or CSS.

### 2. During Implementation
- Invoke `superpowers:executing-plans` when working off a written plan.
- Invoke `everything-claude-code:security-review` proactively on any auth or input code — don't wait to be asked.
- Invoke `everything-claude-code:frontend-patterns` when making structural React decisions.

### 3. Before Claiming Done
- Always invoke `superpowers:verification-before-completion` before saying a task is complete.
- Run `npm run build` from `surveyjale/` to confirm no build errors.
- Ask: "Would a staff engineer approve this?"

### 4. After Any User Correction
- Update `ai/lessons.md` with the pattern immediately.
- Write a rule that prevents the same mistake.

---

## Task Tracking

| File | Purpose |
|---|---|
| `ai/todo.md` | Current plan with checkable items |
| `ai/lessons.md` | Patterns learned from corrections — review at session start |

### Task Lifecycle
1. **Plan** — Write plan to `ai/todo.md`. Invoke planning skills first.
2. **Check in** — Confirm plan before touching code.
3. **Track** — Mark items complete as you go.
4. **Verify** — Invoke `superpowers:verification-before-completion` before marking done.
5. **Learn** — Update `ai/lessons.md` after any correction.
