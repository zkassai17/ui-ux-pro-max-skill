import type { Database } from './types'
import { DEFAULT_TEMPLATES } from './catalog'
import { addDays, todayISO } from './lib/dates'

export function emptyDatabase(): Database {
  return {
    version: 1,
    properties: [], units: [], tasks: [], notes: [],
    compliance: [], templates: structuredClone(DEFAULT_TEMPLATES),
    walkthroughs: [], arrears: [],
  }
}

const now = () => new Date().toISOString()

/**
 * Demo portfolio. Addresses are drawn from real Upper Manhattan / LES stock so
 * the screens read like the job, but every record here is invented — wipe it
 * from Settings before you put real work in.
 */
export function demoDatabase(): Database {
  const d = emptyDatabase()
  const T = todayISO()

  d.properties = [
    {
      id: 'p1', address: '303 W 116th St', submarket: 'South Harlem',
      type: 'multifamily', unitCount: 24, superName: 'Luis Ortega', superPhone: '(917) 555-0142',
      hpdRegistration: '3041882', blockLot: '1826 / 45', archived: false, createdAt: now(),
      notes: 'Pre-war walk-up, oil-to-gas conversion completed 2023. Elevator installed 2019.',
    },
    {
      id: 'p2', address: '210 Rivington St', submarket: 'Lower East Side',
      type: 'mixed-use', unitCount: 12, superName: 'Marco Silva', superPhone: '(646) 555-0119',
      hpdRegistration: '2298104', blockLot: '337 / 12', archived: false, createdAt: now(),
      notes: 'Ground-floor retail plus 11 residential above. Facade on FISP Cycle 10B.',
    },
    {
      id: 'p3', address: '2450 Frederick Douglass Blvd', submarket: 'Central Harlem',
      type: 'mixed-use', unitCount: 18, superName: 'Danny Reyes', superPhone: '(212) 555-0177',
      hpdRegistration: '3118740', blockLot: '2044 / 28', archived: false, createdAt: now(),
      notes: 'Cooling tower on roof — DOHMH registration active. Compactor replaced Feb 2026.',
    },
  ]

  d.units = [
    { id: 'u1', propertyId: 'p1', label: '2A', tenantName: 'Renata Alvarez', tenantPhone: '(917) 555-0201', tenantEmail: 'r.alvarez@example.com', leaseStart: '2024-09-01', leaseEnd: addDays(T, 44), rent: 2450, stabilized: true, status: 'occupied', notes: '' },
    { id: 'u2', propertyId: 'p1', label: '3B', tenantName: 'Marcus Webb', tenantPhone: '(646) 555-0233', tenantEmail: 'mwebb@example.com', leaseStart: '2025-03-01', leaseEnd: addDays(T, 180), rent: 2695, stabilized: true, status: 'occupied', notes: 'Recurring radiator complaint — see task history.' },
    { id: 'u3', propertyId: 'p1', label: '4C', tenantName: '', tenantPhone: '', tenantEmail: '', leaseStart: '', leaseEnd: '', rent: 2800, stabilized: false, status: 'turnover', notes: 'Vacated Aug 14. Paint + floors scheduled.' },
    { id: 'u4', propertyId: 'p1', label: '5A', tenantName: 'Joanne Pak', tenantPhone: '(917) 555-0288', tenantEmail: 'jpak@example.com', leaseStart: '2023-06-01', leaseEnd: addDays(T, 12), rent: 2380, stabilized: true, status: 'occupied', notes: '' },
    { id: 'u5', propertyId: 'p2', label: 'Retail 1', tenantName: 'Vera Coffee Co.', tenantPhone: '(212) 555-0310', tenantEmail: 'ops@veracoffee.example', leaseStart: '2022-11-01', leaseEnd: '2027-10-31', rent: 9800, stabilized: false, status: 'occupied', notes: 'Grease trap servicing is tenant responsibility per lease §12.' },
    { id: 'u6', propertyId: 'p2', label: '3F', tenantName: 'Tomás Guillén', tenantPhone: '(646) 555-0344', tenantEmail: 'tguillen@example.com', leaseStart: '2025-01-15', leaseEnd: addDays(T, 137), rent: 3150, stabilized: false, status: 'occupied', notes: '' },
    { id: 'u7', propertyId: 'p2', label: '4R', tenantName: 'Amina Diallo', tenantPhone: '(917) 555-0356', tenantEmail: 'adiallo@example.com', leaseStart: '2024-05-01', leaseEnd: addDays(T, 61), rent: 2975, stabilized: false, status: 'occupied', notes: '' },
    { id: 'u8', propertyId: 'p3', label: '1C', tenantName: 'Desmond Hall', tenantPhone: '(212) 555-0388', tenantEmail: 'dhall@example.com', leaseStart: '2023-10-01', leaseEnd: addDays(T, 29), rent: 2240, stabilized: true, status: 'occupied', notes: '' },
    { id: 'u9', propertyId: 'p3', label: '2D', tenantName: 'Priya Raman', tenantPhone: '(646) 555-0392', tenantEmail: 'praman@example.com', leaseStart: '2024-12-01', leaseEnd: addDays(T, 92), rent: 2560, stabilized: false, status: 'occupied', notes: '' },
    { id: 'u10', propertyId: 'p3', label: '3A', tenantName: '', tenantPhone: '', tenantEmail: '', leaseStart: '', leaseEnd: '', rent: 2600, stabilized: false, status: 'vacant', notes: 'Ready to market.' },
  ]

  d.tasks = [
    { id: 't1', title: 'No hot water — 3rd floor line', propertyId: 'p1', unitId: null, status: 'assigned', priority: 'emergency', category: 'repair', assignee: 'Luis Ortega (super)', dueDate: T, detail: 'Three tenants reported no hot water this morning. Mixing valve suspected.', thread: [{ id: 'e1', at: now(), body: 'Called Apex Plumbing, tech dispatched for 2pm window.' }], photoIds: [], createdAt: now(), completedAt: null },
    { id: 't2', title: 'HPD Class B violation — hallway light 4th fl', propertyId: 'p1', unitId: null, status: 'open', priority: 'high', category: 'compliance', assignee: '', dueDate: addDays(T, 4), detail: 'Violation issued 8/22. Class B cure period running. Need to correct and certify.', thread: [], photoIds: [], createdAt: now(), completedAt: null },
    { id: 't3', title: 'Unit 4C turnover — paint and floors', propertyId: 'p1', unitId: 'u3', status: 'waiting', priority: 'normal', category: 'turnover', assignee: 'Delgado Painting', dueDate: addDays(T, 9), detail: 'Quote approved. Floors sanded first, then paint.', thread: [{ id: 'e2', at: now(), body: 'Waiting on their schedule confirmation for next week.' }], photoIds: [], createdAt: now(), completedAt: null },
    { id: 't4', title: 'Roof drain backing up after rain', propertyId: 'p3', unitId: null, status: 'open', priority: 'high', category: 'repair', assignee: '', dueDate: addDays(T, 2), detail: 'Ponding observed on last walkthrough near the bulkhead.', thread: [], photoIds: [], createdAt: now(), completedAt: null },
    { id: 't5', title: 'Lease renewal offer — 5A', propertyId: 'p1', unitId: 'u4', status: 'open', priority: 'high', category: 'lease', assignee: '', dueDate: addDays(T, 1), detail: 'Rent-stabilized. RGB increase applies. Offer must go out 90–150 days before expiry.', thread: [], photoIds: [], createdAt: now(), completedAt: null },
    { id: 't6', title: 'Exterminator — monthly service 210 Rivington', propertyId: 'p2', unitId: null, status: 'open', priority: 'normal', category: 'admin', assignee: 'Metro Pest', dueDate: addDays(T, 6), detail: '', thread: [], photoIds: [], createdAt: now(), completedAt: null },
    { id: 't7', title: 'Radiator knocking — 3B', propertyId: 'p1', unitId: 'u2', status: 'open', priority: 'normal', category: 'repair', assignee: 'Luis Ortega (super)', dueDate: addDays(T, -2), detail: 'Third report this season. Likely trapped condensate — check pitch and vent.', thread: [], photoIds: [], createdAt: now(), completedAt: null },
    { id: 't8', title: 'Collect COI from Delgado Painting', propertyId: 'p1', unitId: null, status: 'open', priority: 'normal', category: 'admin', assignee: '', dueDate: addDays(T, 3), detail: 'Cannot start work on site without it.', thread: [], photoIds: [], createdAt: now(), completedAt: null },
    { id: 't9', title: 'Retail 1 grease trap — confirm servicing log', propertyId: 'p2', unitId: 'u5', status: 'open', priority: 'low', category: 'tenant', assignee: '', dueDate: addDays(T, 14), detail: 'Tenant obligation, but we hold the DEP exposure. Request the log quarterly.', thread: [], photoIds: [], createdAt: now(), completedAt: null },
    { id: 't10', title: 'Boiler inspection scheduled and filed', propertyId: 'p3', unitId: null, status: 'done', priority: 'normal', category: 'compliance', assignee: 'Hudson Boiler Svc', dueDate: addDays(T, -20), detail: '', thread: [], photoIds: [], createdAt: now(), completedAt: now() },
  ]

  d.compliance = [
    { id: 'c1', propertyId: 'p1', kind: 'filing', title: 'HPD Annual Property Registration', agency: 'HPD', dueDate: addDays(T, 1), recurrence: 'annual', status: 'scheduled', reference: 'REG-3041882', notes: 'Confirm managing agent details are current before filing.', lastCompleted: null, createdAt: now() },
    { id: 'c2', propertyId: 'p1', kind: 'violation', title: 'HPD Class B — hallway lighting, 4th fl', agency: 'HPD', dueDate: addDays(T, 4), recurrence: 'once', status: 'scheduled', reference: 'V-8827431', notes: 'Correct, then certify within the cure period.', lastCompleted: null, createdAt: now() },
    { id: 'c3', propertyId: 'p2', kind: 'filing', title: 'LL11 / FISP Facade Inspection', agency: 'DOB', dueDate: addDays(T, 21), recurrence: 'quinquennial', status: 'scheduled', reference: 'Cycle 10B', notes: 'Engineer walkthrough booked. Budget for probes.', lastCompleted: null, createdAt: now() },
    { id: 'c4', propertyId: 'p3', kind: 'filing', title: 'Cooling Tower Annual Certification', agency: 'DOHMH', dueDate: addDays(T, 8), recurrence: 'annual', status: 'scheduled', reference: '', notes: '90-day inspection records must be attached.', lastCompleted: null, createdAt: now() },
    { id: 'c5', propertyId: 'p1', kind: 'filing', title: 'Elevator CAT1 Inspection', agency: 'DOB', dueDate: addDays(T, 74), recurrence: 'annual', status: 'scheduled', reference: '', notes: 'File within 21 days of inspection.', lastCompleted: null, createdAt: now() },
    { id: 'c6', propertyId: 'p2', kind: 'filing', title: 'LL152 Gas Piping Inspection', agency: 'DOB', dueDate: addDays(T, -6), recurrence: 'quadrennial', status: 'scheduled', reference: '', notes: 'Community district cycle — verify the exact due date with DOB.', lastCompleted: null, createdAt: now() },
    { id: 'c7', propertyId: 'p3', kind: 'filing', title: 'DHCR Annual Rent Registration', agency: 'DHCR', dueDate: addDays(T, 40), recurrence: 'annual', status: 'scheduled', reference: '', notes: '', lastCompleted: null, createdAt: now() },
  ]

  d.arrears = [
    { id: 'a1', unitId: 'u2', propertyId: 'p1', balance: 5390, lastPaymentAmount: 2695, lastPaymentDate: addDays(T, -64), noticeStage: 'demand', paymentPlan: 'Offered 6-month plan, no response yet.', notes: 'Two months behind.', updatedAt: now() },
    { id: 'a2', unitId: 'u6', propertyId: 'p2', balance: 1575, lastPaymentAmount: 1575, lastPaymentDate: addDays(T, -18), noticeStage: 'reminder', paymentPlan: 'Paying half monthly through October.', notes: '', updatedAt: now() },
    { id: 'a3', unitId: 'u8', propertyId: 'p3', balance: 2240, lastPaymentAmount: 2240, lastPaymentDate: addDays(T, -33), noticeStage: 'late-notice', paymentPlan: '', notes: 'Says direct deposit failed, resending.', updatedAt: now() },
  ]

  d.notes = [
    { id: 'n1', body: 'Walked 303 W 116 with Luis. Compactor chute door on 3 is sticking again — if it happens once more we replace the hinge assembly rather than keep adjusting it.', propertyId: 'p1', unitId: null, taskId: null, tags: ['walkthrough'], pinned: false, photoIds: [], createdAt: now() },
    { id: 'n2', body: 'Owner call: wants a capital plan for the Rivington facade before the FISP filing, not after. Get two engineer numbers.', propertyId: 'p2', unitId: null, taskId: null, tags: ['owner'], pinned: true, photoIds: [], createdAt: now() },
    { id: 'n3', body: '3B radiator — third complaint. Documented date and time of each call in case this becomes an HPD heat complaint.', propertyId: 'p1', unitId: 'u2', taskId: 't7', tags: ['heat'], pinned: false, photoIds: [], createdAt: now() },
  ]

  return d
}
