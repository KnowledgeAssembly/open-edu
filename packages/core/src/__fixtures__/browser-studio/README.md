# browser-studio fixture

Deterministic composite package used by browser Studio tests. It intentionally
combines coverage from `full-package/` (workflow + sidecars + JSON node) and
`assets-package/` (nested binary asset + unknown text file):

- `package.json` — manifest with `entry: nodes/lesson.md`
- `workflow.json` — linear lesson → quiz routing
- `rewards.json` — workflow.complete badge
- `cards.json` — one knowledge card
- `nodes/lesson.md` — markdown lesson referencing `assets/diagram.png`
- `nodes/quiz.json` — JSON quiz node
- `assets/diagram.png` — small deterministic binary asset
- `assets/notes.txt` — unknown text file the Studio must preserve
