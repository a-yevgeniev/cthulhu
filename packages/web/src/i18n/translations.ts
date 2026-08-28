export type Locale = 'en' | 'uk';

export interface Translations {
  locale: Locale;
  languageName: string;
  tabs: {
    quickRoll: string;
    diceTray: string;
    characters: string;
    rollLog: string;
    table: string;
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
    dice: string;
    noModifierDice: string;
    bonusDice: (n: number) => string;
    penaltyDice: (n: number) => string;
    fewerBonusMorePenalty: string;
    moreBonusFewerPenalty: string;
    tensLabel: string;
    unitsLabel: string;
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
    pregens: string;
    pregensHeading: string;
    usePregen: string;
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
  /** Flavor text for the ready-made investigators (character.ts's PREGEN_TEMPLATES), keyed the
   * same way. Original archetypes — see the Legal note in CLAUDE.md and the comment above
   * PREGEN_TEMPLATES for why these aren't lifted from a published scenario. */
  pregens: Record<
    string,
    { name: string; occupation: string; notes: string; inventory: string[]; weaponName?: string }
  >;
  table: {
    title: string;
    createRoom: string;
    joinRoom: string;
    yourName: string;
    namePlaceholder: string;
    roomCode: string;
    roomCodePlaceholder: string;
    create: string;
    join: string;
    connecting: string;
    roomLabel: string;
    keeperBadge: string;
    players: string;
    leaveRoom: string;
    composerLabel: string;
    composerSkillPlaceholder: string;
    composerNotationPlaceholder: string;
    secret: string;
    rollSkillTab: string;
    rollNotationTab: string;
    send: string;
    empty: string;
    promptFrom: (keeperName: string, skillLabel: string) => string;
    dismiss: string;
    requestRollHeading: string;
    requestRollTarget: string;
    requestRollSkillPlaceholder: string;
    requestRollSend: string;
  };
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
    table: 'Table',
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
    skillValue: 'Skill',
    dice: 'Dice',
    noModifierDice: 'Plain',
    bonusDice: (n) => `+${n} bonus`,
    penaltyDice: (n) => `${n} penalty`,
    fewerBonusMorePenalty: 'Fewer bonus dice / more penalty dice',
    moreBonusFewerPenalty: 'More bonus dice / fewer penalty dice',
    tensLabel: 'tens',
    unitsLabel: 'units',
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
    pregens: 'Pregens',
    pregensHeading: 'Ready-made investigators',
    usePregen: 'Use',
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
  pregens: {
    doctor: {
      name: 'Dr. Elena Voss',
      occupation: 'Physician',
      notes:
        'A calm, methodical doctor who has seen enough death not to flinch from what waits in the old house — but not enough to stop being afraid.',
      inventory: ['Medical bag', 'Flashlight'],
    },
    reporter: {
      name: 'Tommy Reyes',
      occupation: 'Reporter',
      notes: "Chasing the story that finally gets him out of the obituary section. He doesn't believe in ghosts. Yet.",
      inventory: ['Notebook', 'Camera'],
    },
    privateInvestigator: {
      name: 'Marlene Cross',
      occupation: 'Private Investigator',
      notes:
        "Hired to find out why three tenants fled the house in one week. She's found worse reasons to run before.",
      inventory: ['Flashlight', 'Lockpicks'],
      weaponName: '.38 Revolver',
    },
    scholarPriest: {
      name: 'Father Patrick Doyle',
      occupation: 'Parish Priest',
      notes:
        "Called in when the family stopped trusting doctors and started praying instead. He's not sure prayer will be enough either.",
      inventory: ['Bible', 'Rosary'],
    },
    detective: {
      name: 'Det. Sam Whitfield',
      occupation: 'Police Detective',
      notes: "Three missing-persons reports tied to the same address in two years. He's stopped calling it a coincidence.",
      inventory: ['Badge', 'Handcuffs'],
      weaponName: '.38 Revolver',
    },
  },
  table: {
    title: 'Table',
    createRoom: 'Create a room',
    joinRoom: 'Join a room',
    yourName: 'Your name',
    namePlaceholder: 'Name',
    roomCode: 'Room code',
    roomCodePlaceholder: 'ABCDE',
    create: 'Create',
    join: 'Join',
    connecting: 'Connecting…',
    roomLabel: 'Room',
    keeperBadge: 'Keeper',
    players: 'Players',
    leaveRoom: 'Leave room',
    composerLabel: 'Roll',
    composerSkillPlaceholder: 'Skill name (e.g. Spot Hidden)',
    composerNotationPlaceholder: 'Notation (e.g. 1d6+2)',
    secret: 'Secret',
    rollSkillTab: 'Skill',
    rollNotationTab: 'Dice',
    send: 'Roll',
    empty: 'No rolls yet.',
    promptFrom: (keeperName, skillLabel) => `${keeperName} asks for ${skillLabel}`,
    dismiss: 'Dismiss',
    requestRollHeading: 'Request a roll',
    requestRollTarget: 'Player',
    requestRollSkillPlaceholder: 'Skill name',
    requestRollSend: 'Ask',
  },
};

export const uk: Translations = {
  locale: 'uk',
  languageName: 'UA',
  tabs: {
    quickRoll: 'Швидкий кидок',
    diceTray: 'Лоток кубиків',
    characters: 'Персонажі',
    rollLog: 'Журнал кидків',
    table: 'Стіл',
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
    skillValue: 'Навичка',
    dice: 'Кубики',
    noModifierDice: 'Звичайно',
    bonusDice: (n) => `+${n} бонус`,
    penaltyDice: (n) => `${n} штраф`,
    fewerBonusMorePenalty: 'Менше бонусних кубиків / більше штрафних',
    moreBonusFewerPenalty: 'Більше бонусних кубиків / менше штрафних',
    tensLabel: 'десятки',
    unitsLabel: 'одиниці',
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
    pregens: 'Готові слідчі',
    pregensHeading: 'Готові до гри слідчі',
    usePregen: 'Обрати',
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
  pregens: {
    doctor: {
      name: 'Др. Елена Восс',
      occupation: 'Лікарка',
      notes:
        'Спокійна, методична лікарка, яка бачила забагато смертей, щоб здригатися від того, що чекає у старому будинку, — але не настільки багато, щоб перестати боятися.',
      inventory: ['Медична сумка', 'Ліхтарик'],
    },
    reporter: {
      name: 'Томмі Рейес',
      occupation: 'Репортер',
      notes: 'Женеться за історією, яка нарешті витягне його з рубрики некрологів. У привидів він не вірить. Поки що.',
      inventory: ['Блокнот', 'Камера'],
    },
    privateInvestigator: {
      name: 'Марлен Кросс',
      occupation: 'Приватна детективка',
      notes: "Найнята з'ясувати, чому троє мешканців втекли з будинку за один тиждень. Їй траплялися причини втечі й гірші.",
      inventory: ['Ліхтарик', 'Відмички'],
      weaponName: 'Револьвер .38',
    },
    scholarPriest: {
      name: 'Отець Патрік Дойл',
      occupation: 'Парафіяльний священник',
      notes:
        'Покликаний, коли родина перестала довіряти лікарям і почала молитися. Він не впевнений, що й молитви буде достатньо.',
      inventory: ['Біблія', 'Вервиця'],
    },
    detective: {
      name: 'Детектив Сем Вітфілд',
      occupation: 'Поліцейський детектив',
      notes: 'Три заяви про зникнення людей пов\'язані з однією адресою за два роки. Він перестав називати це збігом.',
      inventory: ['Значок', 'Наручники'],
      weaponName: 'Револьвер .38',
    },
  },
  table: {
    title: 'Стіл',
    createRoom: 'Створити кімнату',
    joinRoom: 'Приєднатися до кімнати',
    yourName: "Ваше ім'я",
    namePlaceholder: "Ім'я",
    roomCode: 'Код кімнати',
    roomCodePlaceholder: 'ABCDE',
    create: 'Створити',
    join: 'Приєднатися',
    connecting: "З'єднання…",
    roomLabel: 'Кімната',
    keeperBadge: 'Вартовий',
    players: 'Гравці',
    leaveRoom: 'Покинути кімнату',
    composerLabel: 'Кидок',
    composerSkillPlaceholder: 'Назва навички (напр. Спостережливість)',
    composerNotationPlaceholder: 'Запис (напр. 1d6+2)',
    secret: 'Таємно',
    rollSkillTab: 'Навичка',
    rollNotationTab: 'Кубики',
    send: 'Кинути',
    empty: 'Ще немає кидків.',
    promptFrom: (keeperName, skillLabel) => `${keeperName} просить ${skillLabel}`,
    dismiss: 'Приховати',
    requestRollHeading: 'Запросити кидок',
    requestRollTarget: 'Гравець',
    requestRollSkillPlaceholder: 'Назва навички',
    requestRollSend: 'Запросити',
  },
};

export const TRANSLATIONS: Record<Locale, Translations> = { en, uk };
