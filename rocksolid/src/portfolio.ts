import type { Building, Unit } from './types'

/**
 * The buildings you manage, loaded the first time the app runs on a device.
 *
 * Only units that showed up in Tahari marketing material are here, so it's the
 * vacant ones — use "Add many" on a building to put the real roster in.
 * 515 W 47th St and 323 E 108th St have no units at all; nothing on file
 * mentions them.
 *
 * Delete this file and its import in store.ts to ship without it.
 */

export const PORTFOLIO_BUILDINGS: Building[] = [
  {
    id: "p_303w116",
    address: "303 W 116th St",
    notes: "Columbia / Barnard area, NY 10026. Virtual doorman. Ground-floor retail.",
    createdAt: "2026-08-31T16:11:56.013433"
  },
  {
    id: "p_1875lex",
    address: "1875 Lexington Ave",
    notes: "East Harlem.",
    createdAt: "2026-08-31T16:11:56.013433"
  },
  {
    id: "p_6aveb",
    address: "6 Avenue B",
    notes: "East Village. Not 42, 44 or 60 Avenue B \u2014 those are different buildings.",
    createdAt: "2026-08-31T16:11:56.013433"
  },
  {
    id: "p_515w47",
    address: "515 W 47th St",
    notes: "Hell's Kitchen.",
    createdAt: "2026-08-31T16:11:56.013433"
  },
  {
    id: "p_323e108",
    address: "323 E 108th St",
    notes: "East Harlem. Not 301 E 108th St.",
    createdAt: "2026-08-31T16:11:56.013433"
  }
]

export const PORTFOLIO_UNITS: Unit[] = [
  {
    id: "u_p_303w116_ph",
    buildingId: "p_303w116",
    label: "PH",
    tenantName: "",
    tenantPhone: "",
    notes: "4 bed / 2 bath. Open city views. Was available 1 Jul 2026 \u2014 confirm status."
  },
  {
    id: "u_p_303w116_3",
    buildingId: "p_303w116",
    label: "3",
    tenantName: "",
    tenantPhone: "",
    notes: "$6,495/mo in the Jul 2026 blast \u2014 confirm status."
  },
  {
    id: "u_p_303w116_retail",
    buildingId: "p_303w116",
    label: "Retail",
    tenantName: "",
    tenantPhone: "",
    notes: "\u00b11,500 SF ground floor. Asking on request."
  },
  {
    id: "u_p_1875lex_4c",
    buildingId: "p_1875lex",
    label: "4C",
    tenantName: "",
    tenantPhone: "",
    notes: "$3,495/mo, available now per the Aug 2026 blast."
  },
  {
    id: "u_p_1875lex_3d",
    buildingId: "p_1875lex",
    label: "3D",
    tenantName: "",
    tenantPhone: "",
    notes: "$3,695/mo, available 28 Aug 2026."
  },
  {
    id: "u_p_1875lex_5c",
    buildingId: "p_1875lex",
    label: "5C",
    tenantName: "",
    tenantPhone: "",
    notes: "$3,595/mo in the Jul 2026 blast \u2014 confirm status."
  },
  {
    id: "u_p_6aveb_6",
    buildingId: "p_6aveb",
    label: "6",
    tenantName: "",
    tenantPhone: "",
    notes: "$5,495/mo, available now per the Aug 2026 blast."
  },
  {
    id: "u_p_6aveb_3",
    buildingId: "p_6aveb",
    label: "3",
    tenantName: "",
    tenantPhone: "",
    notes: "Listed as Inquire in the Jul 2026 blast \u2014 no rent published. Confirm status."
  }
]
