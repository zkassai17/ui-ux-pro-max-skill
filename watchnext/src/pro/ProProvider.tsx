import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProPlan } from "../lib/proGates";

// watchnext Pro entitlement. Today the entitlement is a local flag persisted on
// the device (so a dev toggle / stubbed purchase can preview the whole gated
// experience in Expo Go). At launch this file is the single place to swap the
// source to a real store receipt (RevenueCat) — the rest of the app just reads
// `isPro` and never needs to change.

const ENTITLEMENT_KEY = "pro:entitlement";

type ProContextValue = {
  isPro: boolean;
  loading: boolean;
  // Directly set entitlement (dev toggle; also how the stubbed purchase unlocks).
  setPro: (v: boolean) => Promise<void>;
  // Begin a purchase for a plan. Stubbed until store products are wired at launch.
  // Returns true if the user is now Pro.
  startPurchase: (plan: ProPlan) => Promise<boolean>;
  // Restore a previous purchase. Stubbed until launch.
  restore: () => Promise<boolean>;
};

const ProContext = createContext<ProContextValue>({
  isPro: false,
  loading: true,
  setPro: async () => {},
  startPurchase: async () => false,
  restore: async () => false,
});

export function ProProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ENTITLEMENT_KEY)
      .then((v) => setIsPro(v === "1"))
      .catch(() => setIsPro(false))
      .finally(() => setLoading(false));
  }, []);

  const setPro = useCallback(async (v: boolean) => {
    setIsPro(v);
    try {
      await AsyncStorage.setItem(ENTITLEMENT_KEY, v ? "1" : "0");
    } catch {
      // best-effort; in-memory state still reflects the change this session
    }
  }, []);

  // Stub: real store purchase gets wired here at launch (RevenueCat / expo IAP).
  // For now, in a dev build we simulate a successful purchase so the unlock flow
  // is fully testable end-to-end. In a production build this is a no-op until wired.
  const startPurchase = useCallback(
    async (_plan: ProPlan) => {
      if (__DEV__) {
        await setPro(true);
        return true;
      }
      return false;
    },
    [setPro]
  );

  const restore = useCallback(async () => {
    // Real receipt restore gets wired here at launch. No-op stub for now.
    return isPro;
  }, [isPro]);

  return (
    <ProContext.Provider value={{ isPro, loading, setPro, startPurchase, restore }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro(): ProContextValue {
  return useContext(ProContext);
}
