import { useRef, useState } from 'react';
import { useCharacters } from './CharacterContext';
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
  const { characters, createCharacter, deleteCharacter, importCharacter } = useCharacters();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleNew() {
    onOpen(createCharacter());
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setImportError(importCharacter(text));
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold text-zinc-100">Characters</h1>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleNew}
          className="flex-1 rounded-xl bg-violet-500 py-3 font-semibold text-white active:bg-violet-600"
        >
          + New
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-200 active:bg-zinc-800"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {importError && <p className="text-sm text-red-400">{importError}</p>}

      {characters.length === 0 && (
        <p className="pt-12 text-center text-sm text-zinc-500">No investigators yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {characters.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
          >
            <button type="button" onClick={() => onOpen(c.id)} className="flex-1 text-left">
              <span className="block font-semibold text-zinc-100">
                {c.name.trim() || 'Unnamed investigator'}
              </span>
              <span className="block text-xs text-zinc-500">{c.occupation || 'No occupation'}</span>
            </button>
            <button
              type="button"
              onClick={() => exportCharacter(c)}
              className="shrink-0 text-xs text-zinc-500 underline active:text-zinc-300"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => deleteCharacter(c.id)}
              className="shrink-0 text-xs text-red-400 underline active:text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
