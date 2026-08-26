import { useRef, useState } from 'react';
import { useCharacters } from './CharacterContext';
import { useLocale } from './i18n/LocaleContext';
import type { Investigator } from './character';

function exportCharacter(investigator: Investigator) {
  const blob = new Blob([JSON.stringify(investigator, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${investigator.name.trim() || 'investigator'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CharacterList({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useLocale();
  const { characters, createCharacter, deleteCharacter, importCharacter } = useCharacters();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleNew() {
    onOpen(createCharacter(t));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setImportError(importCharacter(text, t));
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleNew}
          className="flex-1 border border-brass py-3 text-xs font-semibold uppercase tracking-widest text-brass transition-colors hover:bg-brass hover:text-ink"
        >
          {t.characters.new}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="border border-ink-line px-4 py-3 text-xs uppercase tracking-widest text-paper-dim transition-colors hover:border-brass hover:text-paper"
        >
          {t.characters.import}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {importError && <p className="text-sm text-oxblood">{importError}</p>}

      {characters.length === 0 && (
        <p className="pt-12 text-center text-sm text-paper-dim">{t.characters.empty}</p>
      )}

      <div className="flex flex-col">
        {characters.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 border-b border-ink-line/60 py-3"
          >
            <button type="button" onClick={() => onOpen(c.id)} className="flex-1 text-left">
              <span className="block font-display text-lg text-paper">
                {c.name.trim() || t.characters.unnamed}
              </span>
              <span className="block text-xs text-paper-dim">
                {c.occupation || t.characters.noOccupation}
              </span>
            </button>
            <button
              type="button"
              onClick={() => exportCharacter(c)}
              className="shrink-0 text-[11px] uppercase tracking-wider text-paper-dim transition-colors hover:text-brass"
            >
              {t.characters.export}
            </button>
            <button
              type="button"
              onClick={() => deleteCharacter(c.id)}
              className="shrink-0 text-[11px] uppercase tracking-wider text-oxblood/80 transition-colors hover:text-oxblood"
            >
              {t.characters.delete}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
