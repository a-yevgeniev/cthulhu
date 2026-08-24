import { useState } from 'react';
import QuickRoll from './QuickRoll';
import DiceTray from './DiceTray';
import RollLog from './RollLog';
import CharactersTab from './CharactersTab';
import { RollLogProvider } from './RollLogContext';
import { CharacterProvider } from './CharacterContext';

const TABS = [
  { id: 'quick', label: 'Quick Roll', Screen: QuickRoll },
  { id: 'tray', label: 'Dice Tray', Screen: DiceTray },
  { id: 'characters', label: 'Characters', Screen: CharactersTab },
  { id: 'log', label: 'Roll Log', Screen: RollLog },
] as const;

export default function App() {
  const [tabId, setTabId] = useState<(typeof TABS)[number]['id']>('quick');
  const Active = TABS.find((t) => t.id === tabId)!.Screen;

  return (
    <CharacterProvider>
      <RollLogProvider>
        <div className="flex min-h-svh flex-col bg-zinc-950">
          <div className="flex-1 pb-24">
            <Active />
          </div>
          <nav className="fixed inset-x-0 bottom-0 flex border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTabId(t.id)}
                className={`flex-1 py-4 text-xs font-medium transition-colors sm:text-sm ${
                  tabId === t.id ? 'text-violet-300' : 'text-zinc-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </RollLogProvider>
    </CharacterProvider>
  );
}
