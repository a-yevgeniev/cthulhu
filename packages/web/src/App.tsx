import { useState } from 'react';
import QuickRoll from './QuickRoll';
import DiceTray from './DiceTray';
import RollLog from './RollLog';
import CharactersTab from './CharactersTab';
import AppHeader from './AppHeader';
import { RollLogProvider } from './RollLogContext';
import { CharacterProvider } from './CharacterContext';
import { LocaleProvider, useLocale } from './i18n/LocaleContext';
import { DieIcon, DiceTrayIcon, InvestigatorIcon, ScrollIcon } from './icons';

const TAB_IDS = ['quick', 'tray', 'characters', 'log'] as const;
type TabId = (typeof TAB_IDS)[number];

const SCREENS: Record<TabId, React.ComponentType> = {
  quick: QuickRoll,
  tray: DiceTray,
  characters: CharactersTab,
  log: RollLog,
};

const TAB_ICONS: Record<TabId, React.ComponentType<{ className?: string }>> = {
  quick: DieIcon,
  tray: DiceTrayIcon,
  characters: InvestigatorIcon,
  log: ScrollIcon,
};

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
    <div className="flex min-h-svh flex-col bg-transparent">
      <AppHeader title={tabLabels[tabId]} />
      <div className="flex-1 pb-24">
        <Active />
      </div>
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-zinc-800/80 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        {TAB_IDS.map((id) => {
          const Icon = TAB_ICONS[id];
          const active = tabId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTabId(id)}
              className="relative flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors"
            >
              <span
                className={`absolute -top-px h-0.5 w-8 rounded-full transition-colors ${active ? 'bg-violet-400' : 'bg-transparent'}`}
              />
              <Icon className={`h-5 w-5 ${active ? 'text-violet-300' : 'text-zinc-500'}`} />
              <span className={active ? 'text-violet-300' : 'text-zinc-500'}>{tabLabels[id]}</span>
            </button>
          );
        })}
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
