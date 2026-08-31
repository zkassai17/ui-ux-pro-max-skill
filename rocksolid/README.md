# Rock Solid

A property manager's pocket notebook. Three things and nothing else:

- **To do** — what needs doing, and which building or unit it's for
- **Buildings** — walk the checklist, photograph what's wrong, file it to history
- **Units** — knock on a door, write down what happened

That's the whole app. It runs on your own device with no account.

## Running it

```bash
npm install
npm run dev
```

For a version you just open — no dev server:

```bash
npm run build
```

That writes a self-contained `dist/`. Open `dist/index.html` in any browser, or add
it to your phone's home screen.

## How it's meant to be used

**Walking a building.** Open it and you get this visit's checklist — Main areas,
Boiler, Basement, Smoke detectors by default, and you can add your own. Tick ✓ for
fine or ✗ for a problem; a problem opens a box for what's wrong and photos of it.
Press **Save to history** and the visit is filed with today's date, and a fresh
blank one takes its place.

**Seeing whether it improved.** Each building has its own **History** tab, beside
Visit, holding that building's saved walks newest first. Tap one to expand it. Better
still, tap **Past** next to any checklist line to see just that area across every
visit, newest first, with each week's photos. Shoot the same spot each week and the
answer is right there.

**Knocking.** Buildings → the building → Units → the door. Every knock gets a dated
entry: who answered, what they said, what you promised. Tenant name and phone sit at
the top so you know who you're talking to before the door opens.

**Adding units.** "Add many" builds a roster from floors × letters, or you paste a
list for walk-ups that don't follow a pattern.

**Texting.** Any note has a Text button. On a phone it opens the share sheet so you
pick Messages and the recipient; on a desktop it copies for pasting.

## Where your data lives

In this browser, on this device. Records in `localStorage`, photos in IndexedDB,
downscaled and re-encoded to JPEG on the way in so a phone photo lands around 15–100KB.

Clearing site data wipes it. **Export a backup from Settings now and then** — one
JSON file holds every record and photo, and Import restores it anywhere.

## Stack

Vite + React + TypeScript, hand-written CSS, no UI framework. Hash routing, so the
built bundle runs straight from the filesystem. React is the only runtime dependency.
