export type Locale = 'en' | 'uk';

export interface Translations {
  locale: Locale;
  languageName: string;
  tabs: {
    quickRoll: string;
    diceTray: string;
    characters: string;
    rollLog: string;
  };
  difficulty: {
    regular: string;
    hard: string;
    extreme: string;
  };
  successLevel: {
    critical: string;
    extreme: string;
    hard: string;
    regular: string;
    failure: string;
    fumble: string;
    /** e.g. "Success (needed Hard)" — a real success tier that fell short of the demand. */
    needed: (label: string, difficulty: string) => string;
  };
  quickRoll: {
    title: string;
    skillValue: string;
    noModifierDice: string;
    bonusDice: (n: number) => string;
    penaltyDice: (n: number) => string;
    fewerBonusMorePenalty: string;
    moreBonusFewerPenalty: string;
    thresholds: (regular: number, hard: number, extreme: number) => string;
    candidates: (list: string) => string;
    roll: string;
  };
  diceTray: {
    title: string;
    notation: string;
    notationPlaceholder: string;
    roll: string;
    cantParse: string;
  };
  rollLog: {
    title: string;
    clear: string;
    empty: string;
    push: string;
    spendLuck: string;
    luckPlaceholder: string;
    enterPositiveWholeNumber: string;
    skillLine: (skill: number, difficulty: string) => string;
    modifierDice: (n: number) => string;
    pushed: string;
    luckSpent: (n: number) => string;
  };
  characters: {
    title: string;
    new: string;
    import: string;
    export: string;
    delete: string;
    unnamed: string;
    noOccupation: string;
    empty: string;
    notAValidFile: string;
    couldNotParseJson: string;
  };
  sheet: {
    back: string;
    delete: string;
    notFound: string;
    namePlaceholder: string;
    occupationPlaceholder: string;
    agePlaceholder: string;
    characteristics: string;
    derivedHeading: string;
    derived: (build: number, damageBonus: string, move: number) => string;
    hp: string;
    mp: string;
    san: string;
    luck: string;
    sanityCheck: string;
    sanLossPlaceholder: string;
    check: string;
    startingSan: (n: number) => string;
    lostThisSession: (n: number) => string;
    setStartingToCurrent: string;
    resetSession: string;
    skills: string;
    newSkillPlaceholder: string;
    add: string;
    roll: string;
    removeSkill: (name: string) => string;
    weapons: string;
    weaponNamePlaceholder: string;
    weaponSkillPlaceholder: string;
    weaponDamagePlaceholder: string;
    newWeaponPlaceholder: string;
    removeWeapon: (name: string) => string;
    attack: string;
    damage: string;
    dmg: string;
    inventory: string;
    addItemPlaceholder: string;
    removeItem: (name: string) => string;
    notes: string;
  };
  /** Localized display names for the default 7e skill list, keyed by the stable skill key. */
  skills: Record<string, string>;
}

const enSkills: Record<string, string> = {
  accounting: 'Accounting',
  anthropology: 'Anthropology',
  appraise: 'Appraise',
  archaeology: 'Archaeology',
  artCraft: 'Art/Craft',
  charm: 'Charm',
  climb: 'Climb',
  creditRating: 'Credit Rating',
  cthulhuMythos: 'Cthulhu Mythos',
  disguise: 'Disguise',
  dodge: 'Dodge',
  driveAuto: 'Drive Auto',
  electricalRepair: 'Electrical Repair',
  electronics: 'Electronics',
  fastTalk: 'Fast Talk',
  fightingBrawl: 'Fighting (Brawl)',
  firearmsHandgun: 'Firearms (Handgun)',
  firearmsRifleShotgun: 'Firearms (Rifle/Shotgun)',
  firstAid: 'First Aid',
  history: 'History',
  intimidate: 'Intimidate',
  jump: 'Jump',
  languageOwn: 'Language (Own)',
  languageOther: 'Language (Other)',
  law: 'Law',
  libraryUse: 'Library Use',
  listen: 'Listen',
  locksmith: 'Locksmith',
  mechanicalRepair: 'Mechanical Repair',
  medicine: 'Medicine',
  naturalWorld: 'Natural World',
  navigate: 'Navigate',
  occult: 'Occult',
  operateHeavyMachinery: 'Operate Heavy Machinery',
  persuade: 'Persuade',
  pilot: 'Pilot',
  psychology: 'Psychology',
  psychoanalysis: 'Psychoanalysis',
  ride: 'Ride',
  science: 'Science',
  sleightOfHand: 'Sleight of Hand',
  spotHidden: 'Spot Hidden',
  stealth: 'Stealth',
  survival: 'Survival',
  swim: 'Swim',
  throwSkill: 'Throw',
  track: 'Track',
};

const ukSkills: Record<string, string> = {
  accounting: 'Бухгалтерія',
  anthropology: 'Антропологія',
  appraise: 'Оцінка',
  archaeology: 'Археологія',
  artCraft: 'Мистецтво/Ремесло',
  charm: 'Чарівність',
  climb: 'Лазіння',
  creditRating: 'Кредитний рейтинг',
  cthulhuMythos: 'Міфи Ктулху',
  disguise: 'Маскування',
  dodge: 'Ухилення',
  driveAuto: 'Керування автомобілем',
  electricalRepair: 'Електроремонт',
  electronics: 'Електроніка',
  fastTalk: 'Швидка балачка',
  fightingBrawl: 'Бійка (Рукопашний бій)',
  firearmsHandgun: 'Вогнепальна зброя (Пістолет)',
  firearmsRifleShotgun: 'Вогнепальна зброя (Гвинтівка/Рушниця)',
  firstAid: 'Перша допомога',
  history: 'Історія',
  intimidate: 'Залякування',
  jump: 'Стрибки',
  languageOwn: 'Мова (рідна)',
  languageOther: 'Мова (інша)',
  law: 'Право',
  libraryUse: 'Робота з бібліотекою',
  listen: 'Слух',
  locksmith: 'Зламування замків',
  mechanicalRepair: 'Механічний ремонт',
  medicine: 'Медицина',
  naturalWorld: 'Природознавство',
  navigate: 'Орієнтування',
  occult: 'Окультизм',
  operateHeavyMachinery: 'Керування важкою технікою',
  persuade: 'Переконання',
  pilot: 'Пілотування',
  psychology: 'Психологія',
  psychoanalysis: 'Психоаналіз',
  ride: 'Верхова їзда',
  science: 'Наука',
  sleightOfHand: 'Спритність рук',
  spotHidden: 'Спостережливість',
  stealth: 'Непомітність',
  survival: 'Виживання',
  swim: 'Плавання',
  throwSkill: 'Метання',
  track: 'Вистежування',
};

export const en: Translations = {
  locale: 'en',
  languageName: 'EN',
  tabs: {
    quickRoll: 'Quick Roll',
    diceTray: 'Dice Tray',
    characters: 'Characters',
    rollLog: 'Roll Log',
  },
  difficulty: {
    regular: 'Regular',
    hard: 'Hard',
    extreme: 'Extreme',
  },
  successLevel: {
    critical: 'Critical',
    extreme: 'Extreme success',
    hard: 'Hard success',
    regular: 'Success',
    failure: 'Failure',
    fumble: 'Fumble',
    needed: (label, difficulty) => `${label} (needed ${difficulty})`,
  },
  quickRoll: {
    title: 'Quick Roll',
    skillValue: 'Skill value',
    noModifierDice: 'No modifier dice',
    bonusDice: (n) => `${n} bonus ${n === 1 ? 'die' : 'dice'}`,
    penaltyDice: (n) => `${n} penalty ${n === 1 ? 'die' : 'dice'}`,
    fewerBonusMorePenalty: 'Fewer bonus dice / more penalty dice',
    moreBonusFewerPenalty: 'More bonus dice / fewer penalty dice',
    thresholds: (r, h, e) => `Regular ${r} · Hard ${h} · Extreme ${e}`,
    candidates: (list) => `candidates: ${list}`,
    roll: 'Roll',
  },
  diceTray: {
    title: 'Dice Tray',
    notation: 'Notation',
    notationPlaceholder: '2d6+3, 4d6kh3, (1d6+2)*2...',
    roll: 'Roll',
    cantParse: "Can't parse that expression.",
  },
  rollLog: {
    title: 'Roll Log',
    clear: 'Clear',
    empty: 'No rolls yet. Roll something on Quick Roll or Dice Tray.',
    push: 'Push',
    spendLuck: 'Spend Luck',
    luckPlaceholder: 'Luck',
    enterPositiveWholeNumber: 'Enter a positive whole number.',
    skillLine: (skill, difficulty) => `skill ${skill} · ${difficulty}`,
    modifierDice: (n) => ` · ${n > 0 ? '+' : ''}${n} dice`,
    pushed: ' · pushed',
    luckSpent: (n) => ` · ${n} luck spent`,
  },
  characters: {
    title: 'Characters',
    new: '+ New',
    import: 'Import',
    export: 'Export',
    delete: 'Delete',
    unnamed: 'Unnamed investigator',
    noOccupation: 'No occupation',
    empty: 'No investigators yet.',
    notAValidFile: 'Not a valid investigator file.',
    couldNotParseJson: "Couldn't parse that file as JSON.",
  },
  sheet: {
    back: '← Characters',
    delete: 'Delete',
    notFound: 'Investigator not found.',
    namePlaceholder: 'Investigator name',
    occupationPlaceholder: 'Occupation',
    agePlaceholder: 'Age',
    characteristics: 'Characteristics',
    derivedHeading: 'Derived',
    derived: (build, damageBonus, move) =>
      `Build ${build} · Damage Bonus ${damageBonus} · MOV ${move}`,
    hp: 'HP',
    mp: 'MP',
    san: 'SAN',
    luck: 'Luck',
    sanityCheck: 'Sanity check',
    sanLossPlaceholder: '1/1d6',
    check: 'Check',
    startingSan: (n) => `Starting SAN ${n}`,
    lostThisSession: (n) => `Lost this session: ${n}`,
    setStartingToCurrent: 'Set starting = current',
    resetSession: 'Reset session',
    skills: 'Skills',
    newSkillPlaceholder: 'New skill name',
    add: 'Add',
    roll: 'Roll',
    removeSkill: (name) => `Remove ${name}`,
    weapons: 'Weapons',
    weaponNamePlaceholder: 'Weapon name',
    weaponSkillPlaceholder: 'Skill (e.g. Fighting (Brawl))',
    weaponDamagePlaceholder: 'Damage (e.g. 1d6)',
    newWeaponPlaceholder: 'New weapon name',
    removeWeapon: (name) => `Remove ${name}`,
    attack: 'Attack',
    damage: 'Damage',
    dmg: 'dmg',
    inventory: 'Inventory',
    addItemPlaceholder: 'Add item',
    removeItem: (name) => `Remove ${name}`,
    notes: 'Notes',
  },
  skills: enSkills,
};

export const uk: Translations = {
  locale: 'uk',
  languageName: 'UA',
  tabs: {
    quickRoll: 'Швидкий кидок',
    diceTray: 'Лоток кубиків',
    characters: 'Персонажі',
    rollLog: 'Журнал кидків',
  },
  difficulty: {
    regular: 'Звичайна',
    hard: 'Складна',
    extreme: 'Екстремальна',
  },
  successLevel: {
    critical: 'Критичний успіх',
    extreme: 'Екстремальний успіх',
    hard: 'Складний успіх',
    regular: 'Успіх',
    failure: 'Провал',
    fumble: 'Фумбл',
    needed: (label, difficulty) => `${label} (потрібно: ${difficulty})`,
  },
  quickRoll: {
    title: 'Швидкий кидок',
    skillValue: 'Значення навички',
    noModifierDice: 'Без модифікаторних кубиків',
    bonusDice: (n) => `${n} ${n === 1 ? 'бонусний кубик' : 'бонусні кубики'}`,
    penaltyDice: (n) => `${n} ${n === 1 ? 'штрафний кубик' : 'штрафні кубики'}`,
    fewerBonusMorePenalty: 'Менше бонусних кубиків / більше штрафних',
    moreBonusFewerPenalty: 'Більше бонусних кубиків / менше штрафних',
    thresholds: (r, h, e) => `Звичайна ${r} · Складна ${h} · Екстремальна ${e}`,
    candidates: (list) => `варіанти: ${list}`,
    roll: 'Кинути',
  },
  diceTray: {
    title: 'Лоток кубиків',
    notation: 'Запис',
    notationPlaceholder: '2d6+3, 4d6kh3, (1d6+2)*2...',
    roll: 'Кинути',
    cantParse: 'Не вдалося розпізнати цей вираз.',
  },
  rollLog: {
    title: 'Журнал кидків',
    clear: 'Очистити',
    empty: 'Ще немає кидків. Киньте щось у Швидкому кидку або Лотку кубиків.',
    push: 'Форсувати',
    spendLuck: 'Витратити удачу',
    luckPlaceholder: 'Удача',
    enterPositiveWholeNumber: 'Введіть додатне ціле число.',
    skillLine: (skill, difficulty) => `навичка ${skill} · ${difficulty}`,
    modifierDice: (n) => ` · ${n > 0 ? '+' : ''}${n} кубик(и)`,
    pushed: ' · форсовано',
    luckSpent: (n) => ` · витрачено удачі: ${n}`,
  },
  characters: {
    title: 'Персонажі',
    new: '+ Новий',
    import: 'Імпорт',
    export: 'Експорт',
    delete: 'Видалити',
    unnamed: 'Безіменний слідчий',
    noOccupation: 'Без професії',
    empty: 'Ще немає слідчих.',
    notAValidFile: 'Це не файл слідчого.',
    couldNotParseJson: 'Не вдалося розпізнати файл як JSON.',
  },
  sheet: {
    back: '← Персонажі',
    delete: 'Видалити',
    notFound: 'Слідчого не знайдено.',
    namePlaceholder: "Ім'я слідчого",
    occupationPlaceholder: 'Професія',
    agePlaceholder: 'Вік',
    characteristics: 'Характеристики',
    derivedHeading: 'Похідні характеристики',
    derived: (build, damageBonus, move) =>
      `Статура ${build} · Бонус шкоди ${damageBonus} · Швидкість ${move}`,
    hp: 'ОЗ',
    mp: 'ОМ',
    san: 'Розсудок',
    luck: 'Удача',
    sanityCheck: 'Перевірка розсудку',
    sanLossPlaceholder: '1/1d6',
    check: 'Перевірити',
    startingSan: (n) => `Початковий розсудок ${n}`,
    lostThisSession: (n) => `Втрачено за сесію: ${n}`,
    setStartingToCurrent: 'Початковий = поточний',
    resetSession: 'Скинути сесію',
    skills: 'Навички',
    newSkillPlaceholder: 'Назва нової навички',
    add: 'Додати',
    roll: 'Кинути',
    removeSkill: (name) => `Видалити ${name}`,
    weapons: 'Зброя',
    weaponNamePlaceholder: 'Назва зброї',
    weaponSkillPlaceholder: 'Навичка (напр. Бійка (Рукопашний бій))',
    weaponDamagePlaceholder: 'Шкода (напр. 1d6)',
    newWeaponPlaceholder: 'Назва нової зброї',
    removeWeapon: (name) => `Видалити ${name}`,
    attack: 'Атака',
    damage: 'Шкода',
    dmg: 'шк.',
    inventory: 'Інвентар',
    addItemPlaceholder: 'Додати предмет',
    removeItem: (name) => `Видалити ${name}`,
    notes: 'Нотатки',
  },
  skills: ukSkills,
};

export const TRANSLATIONS: Record<Locale, Translations> = { en, uk };
