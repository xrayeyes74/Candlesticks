import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./locales/it.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";

export const SUPPORTED_LANGUAGES = [
  { code: "it", label: "Italiano" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
] as const;

const STORAGE_KEY = "candlestick-lang";
const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code) as string[];

function detectInitialLanguage(): string {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && supportedCodes.includes(saved)) return saved;
  const browserLang = window.navigator.language?.slice(0, 2);
  if (browserLang && supportedCodes.includes(browserLang)) return browserLang;
  return "en";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      it: { translation: it },
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
    },
    lng: detectInitialLanguage(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

  i18n.on("languageChanged", (lng) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lng);
      document.documentElement.lang = lng;
    }
  });
}

export default i18n;
