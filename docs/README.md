# The Helia Docs

`docs` contains the current source-of-truth documents for the project.
Do not keep multiple active `spec / handoff / design-system` files for the same topic.
Keep one active document per topic.

## Active Docs

- [architecture.md](architecture.md)
  - Product scope, screens, data model, APIs, and runtime structure
- [servicenow-wanted-off-migration-runbook.md](servicenow-wanted-off-migration-runbook.md)
  - Current wanted-off implementation baseline, ServiceNow target design, build, migration, cutover, rollback, and operations runbook
- [design/frontend-guidelines.md](design/frontend-guidelines.md)
  - Shared UI rules, feedback patterns, responsive rules, accessibility
- [design/mobile-excel.md](design/mobile-excel.md)
  - Mobile spreadsheet view IA and interaction rules
- [design/room-floorplan.md](design/room-floorplan.md)
  - Single source of truth for the room floorplan UI

## Archive

- [archive/initial-product-idea.md](archive/initial-product-idea.md)
  - Early product notes, not a current implementation spec

## Documentation Rules

1. Keep one active document per topic.
2. When the implementation changes, update the active file instead of cloning it.
3. Move drafts, early ideas, and obsolete docs into `archive/`.
4. When adding a new doc, register it here first with a short purpose note.
