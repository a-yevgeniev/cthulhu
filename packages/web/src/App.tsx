import { useState } from 'react';
import QuickRoll from './QuickRoll';
import DiceTray from './DiceTray';
import RollLog from './RollLog';
import CharactersTab from './CharactersTab';
import AppHeader from './AppHeader';
import Table from './table/Table';
import { RollLogProvider } from './RollLogContext';
import { CharacterProvider } from './CharacterContext';
import { TableProvider } from './table/TableContext';
import { LocaleProvider, useLocale } from './i18n/LocaleContext';
import { DieIcon, DiceTrayIcon, InvestigatorIcon, ScrollIcon, TableIcon } from './icons';

const TAB_IDS = ['quick', 'tray', 'characters', 'log', 'table'] as const;
type TabId = (typeof TAB_IDS)[number];

const SCREENS: Record<TabId, React.ComponentType> = {
  quick: QuickRoll,
  tray: DiceTray,
  characters: CharactersTab,
  log: RollLog,
  table: Table,
};

const TAB_ICONS: Record<TabId, React.ComponentType<{ className?: string }>> = {
  quick: DieIcon,
  tray: DiceTrayIcon,
  characters: InvestigatorIcon,
  log: ScrollIcon,
  table: TableIcon,
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
    table: t.tabs.table,
  };

  return (
    <div className="flex min-h-svh flex-col bg-transparent">
      <AppHeader title={tabLabels[tabId]} />
      <div className="flex-1 pb-4">
        <Active />
      </div>
      <nav className="sticky bottom-0 flex border-t border-ink-line/80 bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        {TAB_IDS.map((id) => {
          const Icon = TAB_ICONS[id];
          const active = tabId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTabId(id)}
              className="relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-wider transition-colors"
            >
              <span
                className={`absolute -top-px h-0.5 w-8 transition-colors ${active ? 'bg-brass' : 'bg-transparent'}`}
              />
              <Icon className={`h-5 w-5 ${active ? 'text-brass' : 'text-paper-dim'}`} />
              <span className={active ? 'text-brass' : 'text-paper-dim'}>{tabLabels[id]}</span>
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
          <TableProvider>
            <AppShell />
          </TableProvider>
        </RollLogProvider>
      </CharacterProvider>
    </LocaleProvider>
  );
}
