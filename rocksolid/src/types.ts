// ---------- Core records ----------

export type PropertyType = 'multifamily' | 'mixed-use' | 'commercial' | 'walk-up' | 'other'

export interface Property {
  id: string
  /** The address is the building's identity — there is no separate name. */
  address: string
  submarket: string
  type: PropertyType
  unitCount: number
  superName: string
  superPhone: string
  hpdRegistration: string
  blockLot: string
  notes: string
  archived: boolean
  createdAt: string
}

export type UnitStatus = 'occupied' | 'vacant' | 'turnover'

export interface Unit {
  id: string
  propertyId: string
  label: string
  tenantName: string
  tenantPhone: string
  tenantEmail: string
  leaseStart: string
  leaseEnd: string
  rent: number
  stabilized: boolean
  status: UnitStatus
  notes: string
}

export type TaskStatus = 'open' | 'assigned' | 'waiting' | 'done'
export type TaskPriority = 'emergency' | 'high' | 'normal' | 'low'
export type TaskCategory =
  | 'repair' | 'compliance' | 'lease' | 'turnover' | 'tenant' | 'admin' | 'capital'

export interface TaskEntry {
  id: string
  at: string
  body: string
}

export interface Task {
  id: string
  title: string
  propertyId: string | null
  unitId: string | null
  status: TaskStatus
  priority: TaskPriority
  category: TaskCategory
  assignee: string
  dueDate: string
  detail: string
  thread: TaskEntry[]
  photoIds: string[]
  createdAt: string
  completedAt: string | null
}

export interface Note {
  id: string
  body: string
  propertyId: string | null
  unitId: string | null
  taskId: string | null
  tags: string[]
  pinned: boolean
  photoIds: string[]
  createdAt: string
}

// ---------- Compliance ----------

export type Agency = 'HPD' | 'DOB' | 'FDNY' | 'DEP' | 'DOHMH' | 'DHCR' | 'Other'
export type Recurrence =
  | 'once' | 'annual' | 'biennial' | 'triennial'
  | 'quadrennial' | 'quinquennial' | 'decennial'
export type ComplianceStatus = 'scheduled' | 'filed' | 'waived'
export type ComplianceKind = 'filing' | 'violation'

export interface ComplianceItem {
  id: string
  propertyId: string
  kind: ComplianceKind
  title: string
  agency: Agency
  dueDate: string
  recurrence: Recurrence
  status: ComplianceStatus
  reference: string
  notes: string
  lastCompleted: string | null
  createdAt: string
}

export interface CompliancePreset {
  title: string
  agency: Agency
  recurrence: Recurrence
  /** Month/day the filing window typically closes. month is 1-indexed. */
  window: { month: number; day: number } | null
  note: string
  appliesTo: string
}

// ---------- Walkthroughs ----------

export interface TemplateItem { id: string; label: string }
export interface TemplateSection { id: string; name: string; items: TemplateItem[] }

export interface WalkthroughTemplate {
  id: string
  name: string
  sections: TemplateSection[]
}

export type ResultStatus = 'pending' | 'ok' | 'issue' | 'na'

export interface WalkthroughResult {
  itemId: string
  status: ResultStatus
  note: string
  photoIds: string[]
}

export interface Walkthrough {
  id: string
  propertyId: string
  templateId: string
  templateName: string
  date: string
  results: WalkthroughResult[]
  overallNote: string
  completedAt: string | null
}

// ---------- Arrears ----------

export type NoticeStage = 'none' | 'reminder' | 'late-notice' | 'demand' | 'legal'

export interface ArrearsEntry {
  id: string
  unitId: string
  propertyId: string
  balance: number
  lastPaymentAmount: number
  lastPaymentDate: string
  noticeStage: NoticeStage
  paymentPlan: string
  notes: string
  updatedAt: string
}

// ---------- Root ----------

export interface Database {
  version: number
  properties: Property[]
  units: Unit[]
  tasks: Task[]
  notes: Note[]
  compliance: ComplianceItem[]
  templates: WalkthroughTemplate[]
  walkthroughs: Walkthrough[]
  arrears: ArrearsEntry[]
}
