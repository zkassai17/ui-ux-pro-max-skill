import type { Building, Unit } from './types'

/**
 * The buildings you manage.
 *
 * Unit counts, floors, year built and owning LLC come from NYC PLUTO, the
 * city's tax-lot record — those are solid. Unit LABELS are not published
 * anywhere; the ones marked confirmed come from real listings, and the rest are
 * inferred from each building's own pattern so there's a slot at every door.
 * Fix any that are wrong on site — a note filed against the wrong apartment is
 * worse than no note.
 *
 * 1875 Lexington Ave is deliberately incomplete: 8 of 31, because its labels
 * are irregular (2DA, 2FA) and guessing them would be inventing doors.
 *
 * Delete this file and its import in store.ts to ship without it.
 */

export const PORTFOLIO_BUILDINGS: Building[] = [
  {
    id: "p_303w116",
    address: "303 W 116th St",
    notes: "4 residential + 1 commercial = 5 units \u00b7 5 floors \u00b7 built 1910 \u00b7 owner 303 W 116 LLC.\nVerified \u2014 NYC PLUTO (city tax-lot record).\n\nFour full-floor apartments over ground-floor retail. Columbia / Barnard area, NY 10026.\nUnits 3 and PH confirmed from Tahari listings; the other two floors are inferred.",
    createdAt: "2026-08-31T16:44:21.357140"
  },
  {
    id: "p_1875lex",
    address: "1875 Lexington Ave",
    notes: "31 residential + 6 commercial = 37 units \u00b7 6 floors \u00b7 built 1920 \u00b7 owner 1875 LEX LLC.\nVerified \u2014 NYC PLUTO (city tax-lot record).\n\n\u26a0\ufe0f Only 8 of the 31 apartments are listed here \u2014 the ones that have actually appeared in listings. Labels are irregular (2DA, 2FA alongside 1A, 3B), so the rest cannot be guessed. Get the roster from the office and paste it in with Add many.",
    createdAt: "2026-08-31T16:44:21.357140"
  },
  {
    id: "p_6aveb",
    address: "6 Avenue B",
    notes: "10 residential + 1 commercial = 11 units \u00b7 6 floors \u00b7 built 1900 \u00b7 owner 6 AVENUE B LLC.\nVerified \u2014 NYC PLUTO (city tax-lot record).\n\nEast Village, NY 10009. Not 42, 44 or 60 Avenue B \u2014 different buildings.\nUnits 3 and 6 confirmed from Tahari listings; both are bare numbers, so 1\u201310 is the likely scheme. Confirm on site.",
    createdAt: "2026-08-31T16:44:21.357140"
  },
  {
    id: "p_515w47",
    address: "515 W 47th St",
    notes: "15 residential + 1 commercial = 16 units \u00b7 5 floors \u00b7 built 1901 \u00b7 owner 515 W 47 LLC.\nVerified \u2014 NYC PLUTO (city tax-lot record).\n\nHell's Kitchen, NY 10036. Pre-war, many apartments renovated.\n15 apartments over 5 floors = 3 per floor, and every confirmed label (1C, 2C, 3B, 4B, 4C) fits floor + A/B/C \u2014 so this roster should be close to right.",
    createdAt: "2026-08-31T16:44:21.357140"
  },
  {
    id: "p_323e108",
    address: "323 E 108th St",
    notes: "33 residential + 2 commercial = 35 units \u00b7 6 floors \u00b7 built 1920 \u00b7 owner 323 E 108 LLC.\nVerified \u2014 NYC PLUTO (city tax-lot record).\n\nEast Harlem, NY 10029.\nUnit 22 is the only label confirmed anywhere, and it's a bare number \u2014 so 1\u201333 is the likely scheme, but this is the least certain of the five. Check before you rely on it.",
    createdAt: "2026-08-31T16:44:21.357140"
  }
]

export const PORTFOLIO_UNITS: Unit[] = [
  {
    id: "u_p_303w116_2",
    buildingId: "p_303w116",
    label: "2",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_303w116_3",
    buildingId: "p_303w116",
    label: "3",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_303w116_4",
    buildingId: "p_303w116",
    label: "4",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_303w116_ph",
    buildingId: "p_303w116",
    label: "PH",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_303w116_retail",
    buildingId: "p_303w116",
    label: "Retail",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_1875lex_1a",
    buildingId: "p_1875lex",
    label: "1A",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_1875lex_2da",
    buildingId: "p_1875lex",
    label: "2DA",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_1875lex_2fa",
    buildingId: "p_1875lex",
    label: "2FA",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_1875lex_3b",
    buildingId: "p_1875lex",
    label: "3B",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_1875lex_3d",
    buildingId: "p_1875lex",
    label: "3D",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_1875lex_4c",
    buildingId: "p_1875lex",
    label: "4C",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_1875lex_4e",
    buildingId: "p_1875lex",
    label: "4E",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_1875lex_5c",
    buildingId: "p_1875lex",
    label: "5C",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_6aveb_1",
    buildingId: "p_6aveb",
    label: "1",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_6aveb_2",
    buildingId: "p_6aveb",
    label: "2",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_6aveb_3",
    buildingId: "p_6aveb",
    label: "3",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_6aveb_4",
    buildingId: "p_6aveb",
    label: "4",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_6aveb_5",
    buildingId: "p_6aveb",
    label: "5",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_6aveb_6",
    buildingId: "p_6aveb",
    label: "6",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_6aveb_7",
    buildingId: "p_6aveb",
    label: "7",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_6aveb_8",
    buildingId: "p_6aveb",
    label: "8",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_6aveb_9",
    buildingId: "p_6aveb",
    label: "9",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_6aveb_10",
    buildingId: "p_6aveb",
    label: "10",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_6aveb_retail",
    buildingId: "p_6aveb",
    label: "Retail",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_1a",
    buildingId: "p_515w47",
    label: "1A",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_1b",
    buildingId: "p_515w47",
    label: "1B",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_1c",
    buildingId: "p_515w47",
    label: "1C",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_515w47_2a",
    buildingId: "p_515w47",
    label: "2A",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_2b",
    buildingId: "p_515w47",
    label: "2B",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_2c",
    buildingId: "p_515w47",
    label: "2C",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_515w47_3a",
    buildingId: "p_515w47",
    label: "3A",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_3b",
    buildingId: "p_515w47",
    label: "3B",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_515w47_3c",
    buildingId: "p_515w47",
    label: "3C",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_4a",
    buildingId: "p_515w47",
    label: "4A",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_4b",
    buildingId: "p_515w47",
    label: "4B",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_515w47_4c",
    buildingId: "p_515w47",
    label: "4C",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_515w47_5a",
    buildingId: "p_515w47",
    label: "5A",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_5b",
    buildingId: "p_515w47",
    label: "5B",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_5c",
    buildingId: "p_515w47",
    label: "5C",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_515w47_retail",
    buildingId: "p_515w47",
    label: "Retail",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_1",
    buildingId: "p_323e108",
    label: "1",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_2",
    buildingId: "p_323e108",
    label: "2",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_3",
    buildingId: "p_323e108",
    label: "3",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_4",
    buildingId: "p_323e108",
    label: "4",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_5",
    buildingId: "p_323e108",
    label: "5",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_6",
    buildingId: "p_323e108",
    label: "6",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_7",
    buildingId: "p_323e108",
    label: "7",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_8",
    buildingId: "p_323e108",
    label: "8",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_9",
    buildingId: "p_323e108",
    label: "9",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_10",
    buildingId: "p_323e108",
    label: "10",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_11",
    buildingId: "p_323e108",
    label: "11",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_12",
    buildingId: "p_323e108",
    label: "12",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_13",
    buildingId: "p_323e108",
    label: "13",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_14",
    buildingId: "p_323e108",
    label: "14",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_15",
    buildingId: "p_323e108",
    label: "15",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_16",
    buildingId: "p_323e108",
    label: "16",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_17",
    buildingId: "p_323e108",
    label: "17",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_18",
    buildingId: "p_323e108",
    label: "18",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_19",
    buildingId: "p_323e108",
    label: "19",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_20",
    buildingId: "p_323e108",
    label: "20",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_21",
    buildingId: "p_323e108",
    label: "21",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_22",
    buildingId: "p_323e108",
    label: "22",
    tenantName: "",
    tenantPhone: "",
    notes: "Confirmed from a real listing."
  },
  {
    id: "u_p_323e108_23",
    buildingId: "p_323e108",
    label: "23",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_24",
    buildingId: "p_323e108",
    label: "24",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_25",
    buildingId: "p_323e108",
    label: "25",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_26",
    buildingId: "p_323e108",
    label: "26",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_27",
    buildingId: "p_323e108",
    label: "27",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_28",
    buildingId: "p_323e108",
    label: "28",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_29",
    buildingId: "p_323e108",
    label: "29",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_30",
    buildingId: "p_323e108",
    label: "30",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_31",
    buildingId: "p_323e108",
    label: "31",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_32",
    buildingId: "p_323e108",
    label: "32",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_33",
    buildingId: "p_323e108",
    label: "33",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_retail1",
    buildingId: "p_323e108",
    label: "Retail 1",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  },
  {
    id: "u_p_323e108_retail2",
    buildingId: "p_323e108",
    label: "Retail 2",
    tenantName: "",
    tenantPhone: "",
    notes: "Label inferred from the building's pattern, not confirmed. Fix it if it's wrong."
  }
]
