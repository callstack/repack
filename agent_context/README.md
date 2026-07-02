# Agent Context

Dated documentation of substantial work done with AI agents in this repository —
a durable memory of research, decisions, plans, and verification results that
would otherwise live only in chat transcripts.

## Conventions

- One folder per effort, named `<topic>-<month><year>` (e.g. `rspackv2-jul2026`).
- Each folder has a `README.md` index with a status line (research → decided →
  implemented) kept up to date as the effort progresses.
- While an effort is **in flight**, its folder is a living document — revise
  freely as understanding improves.
- Record *decisions* inline where the open question was raised, with the date —
  keep the analysis that led to them, so the "why" survives alongside the "what".
- Prefer verifiable claims: link upstream PRs/issues, note exact versions
  tested against, and keep verification results (what was run, what it showed).
- Once the work is **completed and merged**, the folder is settled: future or
  follow-up work gets a new dated folder (which can link back), rather than
  editing the old one. Status-line updates and cross-links to successor
  folders are the exception.

## Index

| Folder | Topic | Status |
| --- | --- | --- |
| [rspackv2-jul2026](./rspackv2-jul2026/README.md) | Rspack 2 support with dual Rspack 1/2 compatibility | Implemented (PR [#1393](https://github.com/callstack/repack/pull/1393)); follow-ups: workspace adoption + defaults flip |
