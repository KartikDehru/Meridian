# Graph navigation (InfraNodus)

This project recommends the **InfraNodus Graph View** Cursor / VS Code
extension for navigating within and across files as an interactive graph.

Marketplace id: `infranodus.infranodus-graph-view`

## What it does

- On **code** files (`.ts`, `.tsx`, …) it builds an architecture graph:
  nodes are functions, classes, methods, and exported variables; edges are
  containment and references. Click a node to jump to its definition.
- On **docs** (`.md`, …) it builds a topic / concept graph so you can spot
  gaps in `docs/` or `AGENTS.md`.
- Right-click a file or folder → open it in the InfraNodus Graph view.

## Setup (once)

1. Open this folder in Cursor.
2. When prompted, install the recommended extension
   (`infranodus.infranodus-graph-view`), or install it from the marketplace.
3. Create an InfraNodus account and grab an API key from
   https://infranodus.com/api-access
4. Command Palette → **InfraNodus Graph: Set API Key** (or use the Key
   button in the graph panel).
5. Optional: Command Palette → **View: Move View** → InfraNodus Graph →
   Secondary Side Bar (puts it next to the AI chat).

Workspace defaults live in `.vscode/settings.json`
(`infranodus.contentToSend: "auto"` = prose → text graph, code → symbol graph).

## Suggested starting points in this repo

| Open in the graph | Why |
| --- | --- |
| `src/modules/` | Module service layer — the heart of the domain logic |
| `src/lib/auth/` | Session + RBAC matrix — every permission check starts here |
| `src/app/api/v1/` | Thin REST handlers; useful to see how routes fan into services |
| `AGENTS.md` + `docs/` | Topic graph of the project docs / agent orientation |

## Without the extension

You can still navigate with the editor's built-in **Call Hierarchy**,
**Go to Definition**, and the file map in [`AGENTS.md`](../AGENTS.md).
