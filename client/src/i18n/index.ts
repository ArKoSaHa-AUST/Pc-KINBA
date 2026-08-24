import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enAuth from './locales/en/auth.json';
import enBuilder from './locales/en/builder.json';
import enProduct from './locales/en/product.json';
import enPricing from './locales/en/pricing.json';
import enAi from './locales/en/ai.json';
import enWishlist from './locales/en/wishlist.json';
import enAdmin from './locales/en/admin.json';
import enCompare from './locales/en/compare.json';

import bnCommon from './locales/bn/common.json';
import bnNav from './locales/bn/nav.json';
import bnAuth from './locales/bn/auth.json';
import bnBuilder from './locales/bn/builder.json';
import bnProduct from './locales/bn/product.json';
import bnPricing from './locales/bn/pricing.json';
import bnAi from './locales/bn/ai.json';
import bnWishlist from './locales/bn/wishlist.json';
import bnAdmin from './locales/bn/admin.json';
import bnCompare from './locales/bn/compare.json';

export const SUPPORTED_LANGUAGES = ['en', 'bn'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'builder',
  'product',
  'pricing',
  'ai',
  'wishlist',
  'admin',
  'compare',
] as const;

export const LANGUAGE_STORAGE_KEY = 'pckinba.language';

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    builder: enBuilder,
    product: enProduct,
    pricing: enPricing,
    ai: enAi,
    wishlist: enWishlist,
    admin: enAdmin,
    compare: enCompare,
  },
  bn: {
    common: bnCommon,
    nav: bnNav,
    auth: bnAuth,
    builder: bnBuilder,
    product: bnProduct,
    pricing: bnPricing,
    ai: bnAi,
    wishlist: bnWishlist,
    admin: bnAdmin,
    compare: bnCompare,
  },
};

/** Keep the <html lang> attribute in sync so CSS font stacks and a11y work. */
function applyDocumentLanguage(language?: string) {
  const lang = language && typeof language === 'string' && language.startsWith('bn') ? 'bn' : 'en';
  document.documentElement.setAttribute('lang', lang);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: NAMESPACES as unknown as string[],
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

applyDocumentLanguage(i18n.language);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;
