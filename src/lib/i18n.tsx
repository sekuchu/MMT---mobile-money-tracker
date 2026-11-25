import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyLang, getLang, type Lang } from "./locale";
import { t as translate, type TranslationKey } from "./strings";

interface I18nValue {
  lang: Lang;
  setLang(next: Lang): void;
  t(key: TranslationKey, vars?: Record<string, string | number>): string;
}

const I18nContext = createContext<I18nValue | null>(null);

const TITLES: Record<Lang, string> = {
  sr: "Privatni novčanik",
  en: "Private wallet",
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang);

  useEffect(() => {
    applyLang(lang);
    document.title = TITLES[lang];
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    // Update the module-level language first so non-React helpers (dates,
    // errors, backends) already read the new value on this render.
    applyLang(next);
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(key, vars),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside LanguageProvider");
  return value;
}
