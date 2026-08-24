import { useState } from 'react';
import CharacterList from './CharacterList';
import CharacterSheet from './CharacterSheet';

export default function CharactersTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <CharacterSheet id={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <CharacterList onOpen={setSelectedId} />;
}
