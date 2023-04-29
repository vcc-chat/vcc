import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import Backend from "i18next-http-backend"
import LanguageDetector from "i18next-browser-languagedetector"

// eslint-disable-next-line import/no-named-as-default-member
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    // debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false
    },
    supportedLngs: ["zh-CN", "zh-TW", "en"]
  })

export default i18n
