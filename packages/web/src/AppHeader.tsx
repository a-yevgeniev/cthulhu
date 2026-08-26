import { useLocale } from './i18n/LocaleContext';
import type { Locale } from './i18n/translations';

const LOCALES: Locale[] = ['en', 'uk'];

export default function AppHeader({ title }: { title: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3 backdrop-blur-md">
      <h1 className="font-display text-lg tracking-wide text-zinc-100">{title}</h1>
      <div className="flex overflow-hidden rounded-full border border-zinc-700 text-xs">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={`px-2.5 py-1 font-medium transition-colors ${
              locale === l ? 'bg-violet-500 text-white' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            {l === 'en' ? 'EN' : 'UA'}
          </button>
        ))}
      </div>
    </header>
  );
}
