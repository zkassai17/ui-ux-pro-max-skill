import { mutate } from './store'
import { uid } from './lib/id'
import type { Building, Entry, Todo, Unit } from './types'

const now = () => new Date().toISOString()

// ---------- Buildings ----------

export const newBuilding = (): Building =>
  ({ id: uid('b_'), address: '', notes: '', createdAt: now() })

export function saveBuilding(b: Building) {
  mutate((d) => {
    const i = d.buildings.findIndex((x) => x.id === b.id)
    if (i >= 0) d.buildings[i] = b
    else d.buildings.push(b)
  })
}

export function deleteBuilding(id: string) {
  mutate((d) => {
    d.buildings = d.buildings.filter((b) => b.id !== id)
    d.units = d.units.filter((u) => u.buildingId !== id)
    d.todos = d.todos.filter((t) => t.buildingId !== id)
    d.entries = d.entries.filter((e) => e.buildingId !== id)
  })
}

// ---------- Units ----------

export const newUnit = (buildingId: string): Unit =>
  ({ id: uid('u_'), buildingId, label: '', tenantName: '', tenantPhone: '', notes: '' })

export function saveUnit(u: Unit) {
  mutate((d) => {
    const i = d.units.findIndex((x) => x.id === u.id)
    if (i >= 0) d.units[i] = u
    else d.units.push(u)
  })
}

export function addUnits(buildingId: string, labels: string[]) {
  mutate((d) => {
    for (const label of labels) {
      d.units.push({ ...newUnit(buildingId), label })
    }
  })
}

export function deleteUnit(id: string) {
  mutate((d) => {
    d.units = d.units.filter((u) => u.id !== id)
    d.todos = d.todos.filter((t) => t.unitId !== id)
    d.entries = d.entries.filter((e) => e.unitId !== id)
  })
}

// ---------- To-dos ----------

export const newTodo = (partial: Partial<Todo> = {}): Todo => ({
  id: uid('t_'), title: '', buildingId: null, unitId: null, done: false,
  dueDate: '', photoIds: [], createdAt: now(), doneAt: null, ...partial,
})

export function saveTodo(t: Todo) {
  mutate((d) => {
    const i = d.todos.findIndex((x) => x.id === t.id)
    if (i >= 0) d.todos[i] = t
    else d.todos.unshift(t)
  })
}

export function toggleTodo(id: string) {
  mutate((d) => {
    const t = d.todos.find((x) => x.id === id)
    if (!t) return
    t.done = !t.done
    t.doneAt = t.done ? now() : null
  })
}

export function deleteTodo(id: string) {
  mutate((d) => { d.todos = d.todos.filter((t) => t.id !== id) })
}

// ---------- Entries ----------

export function addEntry(partial: Partial<Entry> = {}): Entry {
  const e: Entry = {
    id: uid('e_'), body: '', buildingId: null, unitId: null,
    photoIds: [], createdAt: now(), ...partial,
  }
  mutate((d) => { d.entries.unshift(e) })
  return e
}

export function saveEntry(e: Entry) {
  mutate((d) => {
    const i = d.entries.findIndex((x) => x.id === e.id)
    if (i >= 0) d.entries[i] = e
  })
}

export function deleteEntry(id: string) {
  mutate((d) => { d.entries = d.entries.filter((e) => e.id !== id) })
}
