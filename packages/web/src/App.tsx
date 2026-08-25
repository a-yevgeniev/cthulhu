import { useState } from 'react';
import QuickRoll from './QuickRoll';
import DiceTray from './DiceTray';
import RollLog from './RollLog';
import CharactersTab from './CharactersTab';
import { RollLogProvider } from './RollLogContext';
import { CharacterProvider } from './CharacterContext';
import { LocaleProvider, useLocale } from './i18n/LocaleContext';
import type { Locale } from './i18n/translations';

const TAB_IDS = ['quick', 'tray', 'characters', 'log'] as const;
type TabId = (typeof TAB_IDS)[number];

const SCREENS: Record<TabId, React.ComponentType> = {
  quick: QuickRoll,
  tray: DiceTray,
  characters: CharactersTab,
  log: RollLog,
};

const LOCALES: Locale[] = ['en', 'uk'];

function LanguageToggle() {
  const { locale, t, setLocale } = useLocale();
  return (
    <div className="fixed right-3 top-3 z-10 flex overflow-hidden rounded-full border border-zinc-700 bg-zinc-900/90 text-xs backdrop-blur">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 font-medium transition-colors ${
            locale === l ? 'bg-violet-500 text-white' : 'text-zinc-400'
          }`}
        >
          {l === locale ? t.languageName : l === 'en' ? 'EN' : 'UA'}
        </button>
      ))}
    </div>
  );
}

function AppShell() {
  const { t } = useLocale();
  const [tabId, setTabId] = useState<TabId>('quick');
  const Active = SCREENS[tabId];

  const tabLabels: Record<TabId, string> = {
    quick: t.tabs.quickRoll,
    tray: t.tabs.diceTray,
    characters: t.tabs.characters,
    log: t.tabs.rollLog,
  };

  return (
    <div className="flex min-h-svh flex-col bg-zinc-950">
      <LanguageToggle />
      <div className="flex-1 pb-24">
        <Active />
      </div>
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTabId(id)}
            className={`flex-1 py-4 text-xs font-medium transition-colors sm:text-sm ${
              tabId === id ? 'text-violet-300' : 'text-zinc-500'
            }`}
          >
            {tabLabels[id]}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <CharacterProvider>
        <RollLogProvider>
          <AppShell />
        </RollLogProvider>
      </CharacterProvider>
    </LocaleProvider>
  );
}
