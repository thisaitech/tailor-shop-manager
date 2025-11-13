import { createContext, useContext, ReactNode } from 'react';
import { useStorage } from './use-storage';
import { Language } from '@/lib/types';
import { getTranslation } from '@/lib/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useStorage<Language>('language', 'en');

  const t = (key: string) => getTranslation(lang || 'en', key as any);

  return (
    <LanguageContext.Provider value={{ lang: lang || 'en', setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
