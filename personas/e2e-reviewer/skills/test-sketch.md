---
id: test-sketch
name: Sketching a missing e2e test
description: Use when the answer is would_help, to sketch the e2e test that would turn red on a wrong edit in this PR.
globs: ['**']
---

1. Read "Test conventions" and the lane's "Adding a test" in
   `agent_context/e2e-oct2026/design.md`. The sketch follows them.
2. Pick the `lane` (`mf2` or `expo`) whose app can run the edited lines, and
   the `file`: the feature's existing `e2e/<feature>.e2e.ts` when it has one,
   or a new file.
3. `screen`: what a screen would need to do to make the edited lines run, as
   a change to an existing screen or a new one.
4. `reports`: the `<Report>` rows, each as `<name>: <value>` with the value a
   correct build shows.
5. `asserts`: what the test checks, in order, starting with the lane's
   prologue.
6. `break_once`: one concrete edit to the code this PR changes that turns
   exactly this test red.

Done when every field is filled and `break_once` names code from the PR's
diff.
