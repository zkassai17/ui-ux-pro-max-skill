import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WatchStatus } from "../types/db";
import { DEFAULT_REC_WEIGHTS, type RecWeights } from "../lib/recPrefs";
import type { Lang } from "../i18n/translations";

// Small on-device preferences (no server needed).

const DEFAULT_TAB_KEY = "pref:defaultLibraryTab";
const REC_WEIGHTS_KEY = "pref:recWeights";
const LANGUAGE_KEY = "pref:language";

const VALID_LANGS: Lang[] = ["en", "es", "fr", "he", "ar"];

export async function getLanguage(): Promise<Lang> {
  try {
    const v = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (v && (VALID_LANGS as string[]).includes(v)) return v as Lang;
  } catch {
    // fall through
  }
  return "en";
}

export async function setLanguage(lang: Lang): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // best-effort
  }
}

export async function getRecWeights(): Promise<RecWeights> {
  try {
    const raw = await AsyncStorage.getItem(REC_WEIGHTS_KEY);
    if (raw) {
      const w = JSON.parse(raw);
      if (
        typeof w?.content === "number" &&
        typeof w?.collaborative === "number" &&
        typeof w?.trending === "number"
      ) {
        return w;
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_REC_WEIGHTS;
}

export async function setRecWeights(w: RecWeights): Promise<void> {
  try {
    await AsyncStorage.setItem(REC_WEIGHTS_KEY, JSON.stringify(w));
  } catch {
    // best-effort
  }
}

export async function getDefaultLibraryTab(): Promise<WatchStatus> {
  try {
    const v = await AsyncStorage.getItem(DEFAULT_TAB_KEY);
    if (v === "want" || v === "watching" || v === "watched") return v;
  } catch {
    // ignore storage errors — fall back to the default
  }
  return "want";
}

export async function setDefaultLibraryTab(tab: WatchStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(DEFAULT_TAB_KEY, tab);
  } catch {
    // best-effort; not worth surfacing
  }
}
