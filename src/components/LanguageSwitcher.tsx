import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { Translate } from '@phosphor-icons/react';

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
      className="gap-2 font-semibold touch-manipulation"
    >
      <Translate size={18} weight="bold" />
      <span className="hidden sm:inline">{lang === 'en' ? 'தமிழ்' : 'English'}</span>
      <span className="sm:hidden">{lang === 'en' ? 'த' : 'EN'}</span>
    </Button>
  );
}
