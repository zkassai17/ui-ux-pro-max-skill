# Rock Solid

A property manager's working notebook, built for NYC multifamily and mixed-use stock.
Tasks, notes, compliance deadlines, walkthroughs and arrears — all in one place, all on
your own device.

## Running it

```bash
npm install
npm run dev
```

Then open the URL it prints.

To get a version you can just open and use — no dev server:

```bash
npm run build
```

That writes a self-contained `dist/`. Open `dist/index.html` in any browser and bookmark it,
or add it to your phone's home screen.

## What's in it

| Screen | What it's for |
|---|---|
| **Today** | Capture box on top for whatever just happened; below it, overdue work, today's tasks, filings inside two weeks, leases expiring, recent notes |
| **Tasks** | Open → Assigned → Waiting on vendor → Done, with priority, category, due date, an activity log and photos |
| **Portfolio** | Buildings and units — tenants, rents, lease dates, rent-stabilized flags |
| **Compliance** | Recurring NYC filings and violation cure clocks, sorted by days remaining, with a preset catalog |
| **Walkthroughs** | Reusable checklists for building inspections and unit turnovers. Mark an item as an issue and turn it into a task in one tap |
| **Arrears** | Per-unit balances, last payment, notice stage, payment plans |
| **Notes** | Every note you've captured, searchable and timestamped |
| **Settings** | JSON export/import, demo data, theme, storage usage |

## Where your data lives

In this browser, on this device. There is no account and nothing is uploaded.

- Records go in `localStorage`
- Photos go in IndexedDB, downscaled and re-encoded to JPEG on the way in

Clearing your browser's site data will wipe it. **Export a backup from Settings regularly** —
one JSON file holds every record and photo, and Import restores it on another machine.

## About the compliance dates

The app ships with the common NYC filings — HPD registration, LL152, LL11/FISP, elevator
CAT1 and CAT5, boiler, backflow, LL84/87/97, LL55, LL1 lead paint, window guards, sprinkler,
FDNY alarm, cooling tower, DHCR registration.

**These are a reminder scaffold, not legal authority.** LL11, LL152 and LL87 run on
staggered per-building cycles rather than one citywide date, applicability thresholds
change, and only the agencies are authoritative. Every date is editable. Verify before
you file.

## Stack

Vite + React + TypeScript, hand-written CSS, no UI framework. Hash routing, so the built
bundle works straight from the filesystem. No runtime dependencies beyond React.
