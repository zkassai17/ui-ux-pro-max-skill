import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { I18nManager } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { getLanguage, setLanguage } from "../services/prefs";
import { setApiLanguage } from "../services/catalog";
import { translate, isRtlLang, type Lang } from "./translations";

type I18nContextValue = {
  lang: Lang;
  // returns true if the change flips text direction (caller should prompt a restart)
  setLang: (l: Lang) => Promise<boolean>;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: async () => false,
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const qc = useQueryClient();

  useEffect(() => {
    getLanguage().then((l) => {
      setLangState(l);
      setApiLanguage(l); // localize TMDB titles/overviews/genres
      qc.invalidateQueries(); // refetch content in the resolved language
      // Align the native layout direction with the saved language on launch.
      I18nManager.allowRTL(true);
      const rtl = isRtlLang(l);
      if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
    });
  }, []);

  async function setLang(l: Lang): Promise<boolean> {
    await setLanguage(l);
    setLangState(l); // UI text updates live
    setApiLanguage(l);
    qc.invalidateQueries(); // re-pull TMDB content (titles/overviews) in the new language
    const rtl = isRtlLang(l);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(rtl); // takes full effect after an app restart
      return true;
    }
    return false;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: (key) => translate(lang, key) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
