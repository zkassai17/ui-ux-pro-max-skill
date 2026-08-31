import type {
  Agency, NoticeStage, PropertyType, Recurrence,
  TaskCategory, TaskPriority, TaskStatus, UnitStatus,
} from './types'

export const TASK_STATUS: Record<TaskStatus, string> = {
  open: 'Open', assigned: 'Assigned', waiting: 'Waiting on vendor', done: 'Done',
}

export const TASK_PRIORITY: Record<TaskPriority, string> = {
  emergency: 'Emergency', high: 'High', normal: 'Normal', low: 'Low',
}

export const TASK_CATEGORY: Record<TaskCategory, string> = {
  repair: 'Repair', compliance: 'Compliance', lease: 'Lease',
  turnover: 'Turnover', tenant: 'Tenant', admin: 'Admin', capital: 'Capital',
}

export const CATEGORY_ICON: Record<TaskCategory, string> = {
  repair: '🔧', compliance: '📋', lease: '📄',
  turnover: '🔑', tenant: '👤', admin: '🗂', capital: '🏗',
}

export const PROPERTY_TYPE: Record<PropertyType, string> = {
  multifamily: 'Multifamily', 'mixed-use': 'Mixed-use', commercial: 'Commercial',
  'walk-up': 'Walk-up', other: 'Other',
}

export const UNIT_STATUS: Record<UnitStatus, string> = {
  occupied: 'Occupied', vacant: 'Vacant', turnover: 'Turnover',
}

export const AGENCY: Record<Agency, string> = {
  HPD: 'HPD', DOB: 'DOB', FDNY: 'FDNY', DEP: 'DEP',
  DOHMH: 'DOHMH', DHCR: 'DHCR', Other: 'Other',
}

export const RECURRENCE: Record<Recurrence, string> = {
  once: 'One-off', annual: 'Every year', biennial: 'Every 2 years',
  triennial: 'Every 3 years', quadrennial: 'Every 4 years',
  quinquennial: 'Every 5 years', decennial: 'Every 10 years',
}

export const NOTICE_STAGE: Record<NoticeStage, string> = {
  none: 'None', reminder: 'Reminder sent', 'late-notice': 'Late notice',
  demand: 'Demand / 14-day', legal: 'With counsel',
}

export const NOTICE_TONE: Record<NoticeStage, 'grey' | 'blue' | 'amber' | 'red' | 'solid-red'> = {
  none: 'grey', reminder: 'blue', 'late-notice': 'amber',
  demand: 'red', legal: 'solid-red',
}

export function opts<T extends string>(map: Record<T, string>) {
  return (Object.keys(map) as T[]).map((k) => ({ value: k, label: map[k] }))
}
