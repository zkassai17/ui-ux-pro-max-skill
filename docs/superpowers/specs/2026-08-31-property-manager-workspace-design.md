# Rock Solid — Property Manager Workspace

**Date:** 2026-08-31
**Status:** Approved, building

## Purpose

A local-first web app for a property manager at Tahari Realty / Rock Solid Property
Management (NYC multifamily + mixed-use). It exists to keep a dated, written,
photographed record of building operations — the paper trail that owners, HPD, and
housing court all eventually ask for.

This is a personal work tool, not a product. One user, one browser, no login.

## The job it serves

Seven recurring buckets, established before design:

1. **Walkthroughs** — common areas, roof, boiler room, stairwells, sidewalk, trash.
2. **Work orders** — tenant issue intake, assignment to super/vendor, chase to close.
3. **NYC compliance** — recurring agency filings plus violation cure clocks.
4. **Arrears** — who is behind, how far, what notice stage.
5. **Leases** — renewals, expirations, rent-stabilized flags.
6. **Turnovers** — vacant unit prep.
7. **Vendors & staff** — deferred out of v1 by user decision.

The through-line: everything needs a timestamp and a note.

## Scope

**In v1:** Today dashboard, quick note capture, tasks, properties + units,
NYC compliance calendar, walkthrough checklists, arrears tracker, global search,
JSON export/import.

**Out of v1:** vendor directory + COI expiration tracking, multi-user sync,
accounting, document storage beyond photos, email/SMS notifications.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Runtime | Static site, local-first | User chose local + browser storage |
| Stack | Vite + React + TypeScript, hand-written CSS | No CSS-framework version risk; full control of brand palette; builds to a folder openable from `file://` |
| Routing | Hash-based, no router dependency | Works from `file://`, keeps the back button |
| Structured data | `localStorage`, single JSON document | Simple, synchronous, easy to export |
| Photos | IndexedDB, client-compressed JPEG | Photos would blow the ~5MB localStorage budget |
| Home screen | Split: capture on top, what's-on-fire below | User chose "both, side by side" |

## Data model

- **Property** — name, address, submarket, unit count, type, super name/phone,
  HPD registration number, block/lot, notes, archived
- **Unit** — property, label, tenant name/phone/email, lease start/end, rent,
  rent-stabilized flag, status (occupied / vacant / turnover)
- **Task** — title, property, unit, status (open / assigned / waiting / done),
  priority (emergency / high / normal / low), category, assignee, due date,
  note thread, photos, created/completed timestamps
- **Note** — body, optional property/unit/task link, tags, pinned, created
- **ComplianceItem** — property, agency, title, due date, recurrence, status,
  reference number, notes. Covers both recurring filings and one-off violation
  cure clocks.
- **WalkthroughTemplate** — name, sections, items
- **Walkthrough** — property, template, date, per-item result (ok / issue / na)
  with note and photo, overall note
- **ArrearsEntry** — unit, balance, last payment amount/date, notice stage,
  payment plan, updated

## Compliance catalog

Ships with editable NYC presets: HPD annual registration, LL152 gas piping,
LL11/FISP facade, elevator CAT1 and CAT5, boiler annual, DEP backflow, LL84
benchmarking, LL87, LL97 emissions, LL55 allergen, LL1 lead paint annual notice,
window guard notice, sprinkler/standpipe five-year, FDNY alarm, HPD bedbug annual
filing. A heat-season indicator runs Oct 1 – May 31.

**Every preset date is editable and carries a "confirm with the agency" caveat.**
The app is a reminder system, not a legal calendar. Rules change; the seeded
windows are a starting point, not authority.

## Screens

1. **Today** — capture box; overdue, due-this-week, open tasks
2. **Tasks** — filterable list, grouped by status
3. **Properties** — list, then detail with units, tasks, compliance, walkthroughs,
   arrears, notes
4. **Compliance** — portfolio-wide, sorted by days remaining, colour-coded
5. **Walkthroughs** — templates, run a walkthrough, dated history
6. **Arrears** — per-property table, portfolio total, notice stages
7. **Notes** — searchable stream
8. **Settings** — export, import, demo data, storage usage, wipe

## Non-goals

Not a replacement for Yardi/AppFolio/Buildium. No accounting, no tenant portal,
no payments. It is a manager's notebook with deadlines attached.
