export type Lang = "sr" | "en";

const LANG_KEY = "mmt-lang";

function readStoredLang(): Lang {
  try {
    const value = localStorage.getItem(LANG_KEY);
    if (value === "en" || value === "sr") return value;
  } catch {
    /* storage can be blocked; fall back to Serbian */
  }
  return "sr";
}

let current: Lang = readStoredLang();

if (typeof document !== "undefined") {
  document.documentElement.lang = current;
}

export function getLang(): Lang {
  return current;
}

export function applyLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage unavailable, the language just won't persist */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}
