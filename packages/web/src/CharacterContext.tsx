import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createBlankInvestigator, makeId, type Investigator } from './character';

const STORAGE_KEY = 'coc7-characters';

function loadCharacters(): Investigator[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface CharacterContextValue {
  characters: Investigator[];
  createCharacter: () => string;
  updateCharacter: (id: string, updater: (c: Investigator) => Investigator) => void;
  deleteCharacter: (id: string) => void;
  /** Returns an error message, or null on success. */
  importCharacter: (json: string) => string | null;
}

const CharacterContext = createContext<CharacterContextValue | null>(null);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<Investigator[]>(() => loadCharacters());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  }, [characters]);

  const value = useMemo<CharacterContextValue>(
    () => ({
      characters,
      createCharacter() {
        const c = createBlankInvestigator();
        setCharacters((prev) => [c, ...prev]);
        return c.id;
      },
      updateCharacter(id, updater) {
        setCharacters((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
      },
      deleteCharacter(id) {
        setCharacters((prev) => prev.filter((c) => c.id !== id));
      },
      importCharacter(json) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(json);
        } catch {
          return "Couldn't parse that file as JSON.";
        }
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          typeof (parsed as { characteristics?: unknown }).characteristics !== 'object'
        ) {
          return 'Not a valid investigator file.';
        }
        const imported: Investigator = {
          ...createBlankInvestigator(),
          ...(parsed as Investigator),
          id: makeId(),
        };
        setCharacters((prev) => [imported, ...prev]);
        return null;
      },
    }),
    [characters],
  );

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>;
}

export function useCharacters(): CharacterContextValue {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error('useCharacters must be used within a CharacterProvider');
  return ctx;
}
