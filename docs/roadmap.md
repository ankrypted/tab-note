# Tab Note: Roadmap and Checklists

Work the stages in order. Tick a box only when its acceptance criteria in the requirement files are met and tested. Requirement IDs link to [functional-requirements.md](functional-requirements.md) and [non-functional-requirements.md](non-functional-requirements.md).

Goal: a published, tested, full-stack project that backs an SDE 2 résumé. The wider interview plan is in `Switch_Plan_2026`.

| Stage | Name | Status |
|-------|------|--------|
| 0 | MVP | Built, needs a final check in Brave |
| 1 | Engineering foundation | Not started |
| 2 | Robustness and design doc | Not started |
| 3 | Publish | Not started |
| 4 | Opt-in keep and sync | Not started |
| 5 | Showcase | Not started |

Rough timing (about 15 hours a week): Stages 1–3 take 2 weeks, Stage 4 takes 4–6 weeks, Stage 5 takes 1 week.

---

## Stage 0: MVP

- [ ] Verified in Brave: FR-1 open note on any tab, including new-tab and `brave://` pages
- [ ] FR-2 edit plain text
- [ ] FR-3 auto-save within about 1 s
- [ ] FR-4 note deleted when its tab closes
- [ ] FR-5 save to file (.txt with title, URL, date, note)
- [ ] FR-6 badge on tabs with notes
- [ ] FR-7 delete with confirmation
- [ ] FR-8 list of tabs with notes
- [ ] FR-9 shortcut (`Alt+N`)
- [ ] NFR-1 to NFR-11 spot-checked (opens under 200 ms, no `innerHTML`, minimal permissions, keyboard only, dark mode)
- [ ] Open questions in the FR doc answered and recorded

## Stage 1: Engineering foundation

- [ ] FR-10 convert `src/` to TypeScript (strict)
- [ ] FR-10 add a build tool (Vite or esbuild) that outputs a loadable folder and a zip
- [ ] NFR-12 lint and format config, passing
- [ ] FR-11 GitHub Actions: lint, type-check, test, build, upload zip
- [ ] NFR-13 coverage report in CI, at least 90% on `lib/`
- [ ] README "Develop" section updated for the new build

Done when: a push to GitHub runs CI green and produces an installable zip.

## Stage 2: Robustness and design doc

- [ ] FR-17 session restore behaviour defined and tested
- [ ] FR-17 tab discard
- [ ] FR-17 tab dragged between windows
- [ ] FR-17 service-worker eviction during a save
- [ ] FR-17 storage quota exceeded
- [ ] FR-17 tab closed while the popup is open
- [ ] NFR-14 writes are idempotent, no corruption under eviction
- [ ] NFR-15 local debug log (off by default)
- [ ] FR-19 Playwright E2E for FR-1 to FR-9
- [ ] FR-18 `docs/design.md` written (decisions, trade-offs, rejected alternatives)

Done when: every edge case has a test and the design doc explains the storage layer.

## Stage 3: Publish

- [ ] NFR-16 permission justifications written
- [ ] NFR-16 privacy policy written and hosted (matches NFR-3)
- [ ] FR-20 screenshots, description, store icon
- [ ] NFR-17 `npm audit` in CI, dependencies pinned
- [ ] FR-21 changelog and tagged `v1.0.0` release built by CI
- [ ] FR-20 submitted to the Chrome Web Store
- [ ] FR-20 listing live and installable in Brave

Done when: anyone can install Tab Note from a store link.

## Stage 4: Opt-in keep and sync

Start with the design doc: sync model, conflict strategy, data schema, API, back-of-envelope numbers (NFR-22).

- [ ] Design: pick the conflict strategy (FR-16) and decide on E2E encryption (NFR-19)
- [ ] Design: API spec and DB schema with migrations (NFR-24)
- [ ] FR-12 "Keep this note" in the extension, stored locally first
- [ ] Backend: project skeleton, Docker, health check (NFR-23)
- [ ] FR-13 sign up, sign in, sign out, with password hashing and token refresh (NFR-18)
- [ ] FR-14 push and pull kept notes
- [ ] FR-15 offline queue with idempotent writes and backoff (NFR-21)
- [ ] FR-16 conflict handling, with tests for concurrent edits
- [ ] FR-22 delete account and all data
- [ ] NFR-18 rate limiting and security review
- [ ] NFR-20 k6 load test, results checked in
- [ ] NFR-23 structured logs and basic metrics
- [ ] NFR-24 backups with a tested restore
- [ ] Deploy to a real host, with CI deploy and a rollback note
- [ ] NFR-3 and NFR-4: privacy policy and permission justifications updated for sync
- [ ] Store update released as `v2.0.0`

Done when: two devices stay in sync, offline edits merge safely, and the load-test numbers are in the repo.

## Stage 5: Showcase

- [ ] FR-23 README rewritten with architecture diagram and "decisions and trade-offs"
- [ ] FR-23 demo GIF
- [ ] FR-23 blog post on MV3 service-worker lessons
- [ ] FR-23 résumé bullets with real numbers (users, p95 latency, coverage)
- [ ] Interview talk track: 2-minute pitch, 10-minute deep dive, and an answer to "what would you change at 100x scale?"

---

## How to use this file

1. Pick the first unchecked box in the earliest unfinished stage.
2. Read the acceptance criteria for its requirement ID. Build and test it.
3. Commit with the ID in the message (for example `FR-17: handle tab discard`).
4. Tick the box in the same commit.
