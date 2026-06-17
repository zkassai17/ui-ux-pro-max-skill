import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WatchStatus } from "../types/db";

// Small on-device preferences (no server needed).

const DEFAULT_TAB_KEY = "pref:defaultLibraryTab";

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
