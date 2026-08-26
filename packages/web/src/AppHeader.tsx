import { useLocale } from './i18n/LocaleContext';
import type { Locale } from './i18n/translations';

const LOCALES: Locale[] = ['en', 'uk'];

export default function AppHeader({ title }: { title: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-line/80 bg-ink/80 px-4 py-3 backdrop-blur-md">
      <h1 className="font-display text-lg tracking-wide text-paper">{title}</h1>
      <div className="flex overflow-hidden border border-ink-line text-[11px]">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={`px-2.5 py-1 font-medium uppercase transition-colors ${
              locale === l ? 'bg-brass text-ink' : 'text-paper-dim'
            }`}
          >
            {l === 'en' ? 'EN' : 'UA'}
          </button>
        ))}
      </div>
    </header>
  );
}
