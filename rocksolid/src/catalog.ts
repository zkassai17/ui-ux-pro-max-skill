import type { CompliancePreset, WalkthroughTemplate } from './types'

/**
 * NYC filing presets.
 *
 * IMPORTANT: these windows are a starting point, not legal authority. Filing
 * dates, cycles and applicability thresholds change, and several (LL11, LL152,
 * LL87) run on staggered per-building cycles rather than one citywide date.
 * Every date is editable after you add it, and the UI repeats this caveat.
 * Confirm against the agency before you rely on any of it.
 */
export const COMPLIANCE_PRESETS: CompliancePreset[] = [
  {
    title: 'HPD Annual Property Registration',
    agency: 'HPD', recurrence: 'annual', window: { month: 9, day: 1 },
    appliesTo: '3+ unit buildings, and 1–2 unit where owner does not reside',
    note: 'Registration period runs to Sept 1. An unregistered building cannot certify violations or sue for rent.',
  },
  {
    title: 'HPD Bedbug Annual Report (LL69)',
    agency: 'HPD', recurrence: 'annual', window: { month: 12, day: 31 },
    appliesTo: 'Multiple dwellings',
    note: 'Reports the prior year infestation and eradication history. Must also be distributed to tenants.',
  },
  {
    title: 'Lead Paint Annual Notice (LL1)',
    agency: 'HPD', recurrence: 'annual', window: { month: 2, day: 15 },
    appliesTo: 'Pre-1960 buildings with 3+ units and a child under 6',
    note: 'Deliver notice Jan 1–16, tenant returns by Feb 15, owner follows up and inspects. Keep the returned forms.',
  },
  {
    title: 'Window Guard Annual Notice',
    agency: 'HPD', recurrence: 'annual', window: { month: 2, day: 15 },
    appliesTo: 'Multiple dwellings',
    note: 'Same cycle as the lead notice. Required where a child under 11 resides, or on tenant request.',
  },
  {
    title: 'LL55 Indoor Allergen Hazard Inspection',
    agency: 'HPD', recurrence: 'annual', window: null,
    appliesTo: '3+ unit buildings',
    note: 'Annual inspection for mold, pests and underlying conditions, plus inspection at every turnover.',
  },
  {
    title: 'Stove Knob Cover Notice (LL117)',
    agency: 'HPD', recurrence: 'annual', window: null,
    appliesTo: 'Multiple dwellings with gas stoves',
    note: 'Annual notice; covers provided where a child under 6 resides.',
  },
  {
    title: 'LL152 Gas Piping Inspection',
    agency: 'DOB', recurrence: 'quadrennial', window: null,
    appliesTo: 'All buildings except 1–2 family',
    note: 'Every 4 years on a cycle set by community district. Certification due within 60 days of inspection; repairs within 120.',
  },
  {
    title: 'LL11 / FISP Facade Inspection',
    agency: 'DOB', recurrence: 'quinquennial', window: null,
    appliesTo: 'Buildings taller than 6 stories',
    note: 'Five-year cycles staggered by sub-cycle A/B/C from the block number. Unsafe conditions trigger a shed and a repair clock.',
  },
  {
    title: 'Elevator CAT1 Inspection',
    agency: 'DOB', recurrence: 'annual', window: { month: 12, day: 31 },
    appliesTo: 'Any building with an elevator',
    note: 'Performed during the calendar year; report filed within 21 days. Affirmation of correction due for any defect.',
  },
  {
    title: 'Elevator CAT5 Test',
    agency: 'DOB', recurrence: 'quinquennial', window: null,
    appliesTo: 'Any building with an elevator',
    note: 'Full-load safety test every 5 years, usually run together with a CAT1.',
  },
  {
    title: 'Annual Boiler Inspection',
    agency: 'DOB', recurrence: 'annual', window: { month: 12, day: 31 },
    appliesTo: 'Low-pressure boilers in buildings with 6+ units',
    note: 'Inspected within the calendar year, report filed within 14 days of inspection.',
  },
  {
    title: 'DEP Backflow Prevention Annual Test',
    agency: 'DEP', recurrence: 'annual', window: null,
    appliesTo: 'Buildings with an approved backflow device',
    note: 'Tested annually by a certified tester and filed with DEP.',
  },
  {
    title: 'LL84 Energy Benchmarking',
    agency: 'DOB', recurrence: 'annual', window: { month: 5, day: 1 },
    appliesTo: 'Buildings over 25,000 sq ft',
    note: 'Submit prior-year energy and water use by May 1. Fines accrue per quarter missed.',
  },
  {
    title: 'LL97 Emissions Report',
    agency: 'DOB', recurrence: 'annual', window: { month: 5, day: 1 },
    appliesTo: 'Buildings over 25,000 sq ft',
    note: 'Annual emissions report certified by a registered design professional. Penalties are per ton over the cap.',
  },
  {
    title: 'LL87 Energy Audit & Retro-commissioning',
    agency: 'DOB', recurrence: 'decennial', window: null,
    appliesTo: 'Buildings over 50,000 sq ft',
    note: 'Once every 10 years, in the year matching the last digit of the tax block number.',
  },
  {
    title: 'FDNY Fire Alarm System Inspection',
    agency: 'FDNY', recurrence: 'annual', window: null,
    appliesTo: 'Buildings with a fire alarm system',
    note: 'Annual inspection and test by a licensed company; keep the report on site.',
  },
  {
    title: 'Sprinkler / Standpipe 5-Year Test',
    agency: 'FDNY', recurrence: 'quinquennial', window: null,
    appliesTo: 'Buildings with sprinkler or standpipe systems',
    note: 'Five-year hydrostatic and flow test. Annual inspection is separate.',
  },
  {
    title: 'Cooling Tower Annual Certification',
    agency: 'DOHMH', recurrence: 'annual', window: { month: 11, day: 1 },
    appliesTo: 'Buildings with a cooling tower',
    note: 'Annual certification plus 90-day inspections while in operation. Registration required before startup.',
  },
  {
    title: 'DHCR Annual Rent Registration',
    agency: 'DHCR', recurrence: 'annual', window: { month: 7, day: 31 },
    appliesTo: 'Buildings with rent-stabilized units',
    note: 'Failure to register bars collection of increases until the registration is brought current.',
  },
  {
    title: 'Certificate of Occupancy / Place of Assembly',
    agency: 'DOB', recurrence: 'annual', window: null,
    appliesTo: 'Spaces with a Place of Assembly permit',
    note: 'PA certificate renews annually. Keep the current CO on file for any use change.',
  },
]

const t = (id: string, label: string) => ({ id, label })

export const DEFAULT_TEMPLATES: WalkthroughTemplate[] = [
  {
    id: 'tpl_building',
    name: 'Building Walkthrough',
    sections: [
      {
        id: 's_ext', name: 'Exterior & Sidewalk',
        items: [
          t('e1', 'Sidewalk free of trip hazards and cracks'),
          t('e2', 'Tree pits and curb clear'),
          t('e3', 'Facade — no spalling, cracks or loose brick'),
          t('e4', 'Exterior lighting working'),
          t('e5', 'Standpipe siamese capped and clear'),
          t('e6', 'Scaffolding / shed permits current'),
        ],
      },
      {
        id: 's_entry', name: 'Entry & Lobby',
        items: [
          t('l1', 'Front door closes and locks'),
          t('l2', 'Intercom / buzzer working'),
          t('l3', 'Lobby lighting fully working'),
          t('l4', 'Mailboxes secure and locked'),
          t('l5', 'HPD registration and required notices posted'),
          t('l6', 'Floor and walls clean, no damage'),
        ],
      },
      {
        id: 's_halls', name: 'Stairwells & Halls',
        items: [
          t('h1', 'All hall and stair lighting working'),
          t('h2', 'Self-closing doors latch properly'),
          t('h3', 'Handrails secure'),
          t('h4', 'Egress paths clear of storage'),
          t('h5', 'Exit signs lit'),
          t('h6', 'Emergency lighting operational'),
        ],
      },
      {
        id: 's_boiler', name: 'Boiler & Mechanical',
        items: [
          t('b1', 'Boiler firing, pressure and temp normal'),
          t('b2', 'No leaks at boiler or piping'),
          t('b3', 'Hot water temperature adequate'),
          t('b4', 'Room clear of stored material'),
          t('b5', 'Current inspection certificate posted'),
          t('b6', 'Fuel level adequate'),
        ],
      },
      {
        id: 's_roof', name: 'Roof',
        items: [
          t('r1', 'Drains clear, no ponding water'),
          t('r2', 'Bulkhead door secured'),
          t('r3', 'Parapet and coping sound'),
          t('r4', 'Roof surface intact, no debris'),
          t('r5', 'Skylights intact'),
        ],
      },
      {
        id: 's_base', name: 'Basement & Utilities',
        items: [
          t('u1', 'No standing water'),
          t('u2', 'Sump pump operational'),
          t('u3', 'Electrical panels accessible and labeled'),
          t('u4', 'Gas piping shows no corrosion or damage'),
          t('u5', 'Water meter readable and dry'),
        ],
      },
      {
        id: 's_trash', name: 'Trash & Recycling',
        items: [
          t('t1', 'Bins staged and returned on schedule'),
          t('t2', 'Area clean and washed down'),
          t('t3', 'Recycling properly separated'),
          t('t4', 'No rodent activity or droppings'),
          t('t5', 'Compactor operating'),
        ],
      },
      {
        id: 's_safety', name: 'Life Safety',
        items: [
          t('f1', 'Common-area smoke and CO detectors sounding'),
          t('f2', 'Fire alarm panel normal, no trouble light'),
          t('f3', 'Sprinkler gauge in range'),
          t('f4', 'Fire extinguishers charged and tagged'),
          t('f5', 'No signs of illegal occupancy or partitions'),
        ],
      },
    ],
  },
  {
    id: 'tpl_turnover',
    name: 'Unit Turnover Prep',
    sections: [
      {
        id: 'v_kitchen', name: 'Kitchen',
        items: [
          t('k1', 'Refrigerator clean and cooling'),
          t('k2', 'Stove and oven operating, knob covers if needed'),
          t('k3', 'Cabinets and drawers sound'),
          t('k4', 'Sink and faucet, no drips'),
          t('k5', 'GFCI outlets tested'),
        ],
      },
      {
        id: 'v_bath', name: 'Bathroom',
        items: [
          t('ba1', 'Tub, tile and grout sound'),
          t('ba2', 'Toilet secure, no running'),
          t('ba3', 'Sink and vanity intact'),
          t('ba4', 'Vent fan working'),
          t('ba5', 'Caulking fresh'),
        ],
      },
      {
        id: 'v_rooms', name: 'Rooms',
        items: [
          t('rm1', 'Walls patched and painted'),
          t('rm2', 'Floors refinished or replaced'),
          t('rm3', 'Windows open, close and lock'),
          t('rm4', 'Window guards installed where required'),
          t('rm5', 'Closet doors on track'),
          t('rm6', 'All outlets and switches working'),
        ],
      },
      {
        id: 'v_sys', name: 'Systems',
        items: [
          t('sy1', 'Radiators heat, valves working'),
          t('sy2', 'Smoke and CO detectors installed and dated'),
          t('sy3', 'Intercom working'),
          t('sy4', 'Locks re-keyed, keys tagged'),
        ],
      },
      {
        id: 'v_final', name: 'Ready to Market',
        items: [
          t('fi1', 'Unit fully cleaned'),
          t('fi2', 'Listing photos taken'),
          t('fi3', 'Lead paint and allergen inspections done'),
          t('fi4', 'Handed to leasing'),
        ],
      },
    ],
  },
]
