import { useRef, useState } from 'react';
import { useCharacters } from './CharacterContext';
import { useLocale } from './i18n/LocaleContext';
import { PREGEN_TEMPLATES, type Investigator } from './character';
import CompassRose from './CompassRose';

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
  const { characters, createCharacter, createPregenCharacter, deleteCharacter, importCharacter } =
    useCharacters();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showPregens, setShowPregens] = useState(false);

  function handleNew() {
    onOpen(createCharacter(t));
  }

  function handlePregen(template: (typeof PREGEN_TEMPLATES)[number]) {
    onOpen(createPregenCharacter(template, t));
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
          onClick={() => setShowPregens((v) => !v)}
          className={`border px-4 py-3 text-xs uppercase tracking-widest transition-colors ${
            showPregens ? 'border-brass text-brass' : 'border-ink-line text-paper-dim hover:border-brass hover:text-paper'
          }`}
        >
          {t.characters.pregens}
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

      {showPregens && (
        <div className="flex flex-col border border-ink-line">
          <h2 className="border-b border-ink-line px-4 py-2 text-[10px] uppercase tracking-widest text-paper-dim">
            {t.characters.pregensHeading}
          </h2>
          {PREGEN_TEMPLATES.map((template) => {
            const flavor = t.pregens[template.key];
            return (
              <div key={template.key} className="flex items-center gap-2 border-b border-ink-line/60 px-4 py-3 last:border-b-0">
                <div className="flex-1">
                  <span className="block font-display text-base text-paper">{flavor.name}</span>
                  <span className="block text-xs text-paper-dim">{flavor.occupation}</span>
                  <span className="mt-1 block text-xs text-paper-dim/80">{flavor.notes}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePregen(template)}
                  className="shrink-0 border border-ink-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-paper-dim transition-colors hover:border-brass hover:text-brass"
                >
                  {t.characters.usePregen}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {characters.length === 0 && (
        <div className="flex flex-col items-center pt-8">
          <CompassRose size={160} className="text-brass opacity-20" />
          <p className="-mt-6 text-center text-sm text-paper-dim">{t.characters.empty}</p>
        </div>
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
