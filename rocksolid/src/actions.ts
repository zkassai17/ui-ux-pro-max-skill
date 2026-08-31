import { mutate } from './store'
import { uid } from './lib/id'
import { addYears, todayISO, YEARS_PER_RECURRENCE } from './lib/dates'
import type {
  ArrearsEntry, ComplianceItem, Note, Property, Task, Unit,
  Walkthrough, WalkthroughTemplate,
} from './types'

const now = () => new Date().toISOString()

// ---------- Properties & units ----------

export function newProperty(): Property {
  return {
    id: uid('p_'), address: '', submarket: '', type: 'multifamily',
    unitCount: 0, superName: '', superPhone: '', hpdRegistration: '', blockLot: '',
    notes: '', archived: false, createdAt: now(),
  }
}

export function saveProperty(p: Property) {
  mutate((d) => {
    const i = d.properties.findIndex((x) => x.id === p.id)
    if (i >= 0) d.properties[i] = p
    else d.properties.push(p)
  })
}

export function deleteProperty(id: string) {
  mutate((d) => {
    d.properties = d.properties.filter((p) => p.id !== id)
    d.units = d.units.filter((u) => u.propertyId !== id)
    d.tasks = d.tasks.filter((t) => t.propertyId !== id)
    d.compliance = d.compliance.filter((c) => c.propertyId !== id)
    d.walkthroughs = d.walkthroughs.filter((w) => w.propertyId !== id)
    d.arrears = d.arrears.filter((a) => a.propertyId !== id)
    d.notes = d.notes.map((n) => (n.propertyId === id ? { ...n, propertyId: null, unitId: null } : n))
  })
}

export function newUnit(propertyId: string): Unit {
  return {
    id: uid('u_'), propertyId, label: '', tenantName: '', tenantPhone: '',
    tenantEmail: '', leaseStart: '', leaseEnd: '', rent: 0, stabilized: false,
    status: 'occupied', notes: '',
  }
}

export function saveUnit(u: Unit) {
  mutate((d) => {
    const i = d.units.findIndex((x) => x.id === u.id)
    if (i >= 0) d.units[i] = u
    else d.units.push(u)
  })
}

export function deleteUnit(id: string) {
  mutate((d) => {
    d.units = d.units.filter((u) => u.id !== id)
    d.arrears = d.arrears.filter((a) => a.unitId !== id)
    d.tasks = d.tasks.map((t) => (t.unitId === id ? { ...t, unitId: null } : t))
  })
}

// ---------- Tasks ----------

export function newTask(partial: Partial<Task> = {}): Task {
  return {
    id: uid('t_'), title: '', propertyId: null, unitId: null, status: 'open',
    priority: 'normal', category: 'repair', assignee: '', dueDate: '', detail: '',
    thread: [], photoIds: [], createdAt: now(), completedAt: null, ...partial,
  }
}

export function saveTask(t: Task) {
  mutate((d) => {
    const i = d.tasks.findIndex((x) => x.id === t.id)
    if (i >= 0) d.tasks[i] = t
    else d.tasks.unshift(t)
  })
}

export function setTaskStatus(id: string, status: Task['status']) {
  mutate((d) => {
    const t = d.tasks.find((x) => x.id === id)
    if (!t) return
    t.status = status
    t.completedAt = status === 'done' ? now() : null
  })
}

export function addTaskEntry(id: string, body: string, photoIds: string[] = []) {
  mutate((d) => {
    const t = d.tasks.find((x) => x.id === id)
    if (t) t.thread.push({ id: uid('e_'), at: now(), body, photoIds })
  })
}

export function attachTaskPhoto(id: string, photoId: string) {
  mutate((d) => {
    const t = d.tasks.find((x) => x.id === id)
    if (t) t.photoIds.push(photoId)
  })
}

export function deleteTask(id: string) {
  mutate((d) => {
    d.tasks = d.tasks.filter((t) => t.id !== id)
    d.notes = d.notes.map((n) => (n.taskId === id ? { ...n, taskId: null } : n))
  })
}

// ---------- Notes ----------

export function addNote(partial: Partial<Note> = {}): Note {
  const note: Note = {
    id: uid('n_'), body: '', propertyId: null, unitId: null, taskId: null,
    tags: [], pinned: false, photoIds: [], createdAt: now(), ...partial,
  }
  mutate((d) => { d.notes.unshift(note) })
  return note
}

export function saveNote(n: Note) {
  mutate((d) => {
    const i = d.notes.findIndex((x) => x.id === n.id)
    if (i >= 0) d.notes[i] = n
  })
}

export function deleteNote(id: string) {
  mutate((d) => { d.notes = d.notes.filter((n) => n.id !== id) })
}

export function togglePin(id: string) {
  mutate((d) => {
    const n = d.notes.find((x) => x.id === id)
    if (n) n.pinned = !n.pinned
  })
}

// ---------- Compliance ----------

export function newCompliance(propertyId: string, partial: Partial<ComplianceItem> = {}): ComplianceItem {
  return {
    id: uid('c_'), propertyId, kind: 'filing', title: '', agency: 'HPD',
    dueDate: '', recurrence: 'annual', status: 'scheduled', reference: '',
    notes: '', lastCompleted: null, createdAt: now(), ...partial,
  }
}

export function saveCompliance(c: ComplianceItem) {
  mutate((d) => {
    const i = d.compliance.findIndex((x) => x.id === c.id)
    if (i >= 0) d.compliance[i] = c
    else d.compliance.push(c)
  })
}

export function deleteCompliance(id: string) {
  mutate((d) => { d.compliance = d.compliance.filter((c) => c.id !== id) })
}

/**
 * Mark a filing done. Recurring items roll forward by their own interval and
 * stay scheduled; one-off items (violations) simply close.
 */
export function markComplianceFiled(id: string) {
  mutate((d) => {
    const c = d.compliance.find((x) => x.id === id)
    if (!c) return
    c.lastCompleted = todayISO()
    const years = YEARS_PER_RECURRENCE[c.recurrence] ?? 0
    if (years > 0 && c.dueDate) {
      c.dueDate = addYears(c.dueDate, years)
      c.status = 'scheduled'
    } else {
      c.status = 'filed'
    }
  })
}

// ---------- Walkthroughs ----------

export function startWalkthrough(propertyId: string, template: WalkthroughTemplate): Walkthrough {
  const w: Walkthrough = {
    id: uid('w_'), propertyId, templateId: template.id, templateName: template.name,
    date: todayISO(),
    results: template.sections.flatMap((s) =>
      s.items.map((i) => ({ itemId: i.id, status: 'pending' as const, note: '', photoIds: [] })),
    ),
    overallNote: '', completedAt: null,
  }
  mutate((d) => { d.walkthroughs.unshift(w) })
  return w
}

export function saveWalkthrough(w: Walkthrough) {
  mutate((d) => {
    const i = d.walkthroughs.findIndex((x) => x.id === w.id)
    if (i >= 0) d.walkthroughs[i] = w
  })
}

export function deleteWalkthrough(id: string) {
  mutate((d) => { d.walkthroughs = d.walkthroughs.filter((w) => w.id !== id) })
}

export function saveTemplate(t: WalkthroughTemplate) {
  mutate((d) => {
    const i = d.templates.findIndex((x) => x.id === t.id)
    if (i >= 0) d.templates[i] = t
    else d.templates.push(t)
  })
}

export function deleteTemplate(id: string) {
  mutate((d) => { d.templates = d.templates.filter((t) => t.id !== id) })
}

// ---------- Arrears ----------

export function upsertArrears(entry: ArrearsEntry) {
  mutate((d) => {
    const i = d.arrears.findIndex((a) => a.id === entry.id)
    const withStamp = { ...entry, updatedAt: now() }
    if (i >= 0) d.arrears[i] = withStamp
    else d.arrears.push(withStamp)
  })
}

export function newArrears(unitId: string, propertyId: string): ArrearsEntry {
  return {
    id: uid('a_'), unitId, propertyId, balance: 0, lastPaymentAmount: 0,
    lastPaymentDate: '', noticeStage: 'none', paymentPlan: '', notes: '',
    updatedAt: now(),
  }
}

export function deleteArrears(id: string) {
  mutate((d) => { d.arrears = d.arrears.filter((a) => a.id !== id) })
}
