/**
 * The emoji the toy pops, and the words it says for them.
 *
 * Hand-picked and toddler-safe only: animals, food, friendly faces, vehicles,
 * nature, hearts and stars. Nothing that could read as scary, violent, medical or
 * grown-up. Add to these lists only in those lanes.
 *
 * A letter key picks from that letter's group, which mostly starts with that
 * letter (a: apple, ant, airplane; a few letters with no friendly word borrow
 * one); every other key (a number, space, Enter, an arrow) picks from the
 * general group.
 *
 * `name` is the simple English word a parent would say. It is also the key into
 * `NAME_I18N`, because one picture can carry two words (the cat is also the
 * kitten), so the word, not the picture, names the thing.
 *
 * The spoken words are speech content the toy says aloud, not screen words: every
 * word a person reads lives in `lib/i18n/locales/`.
 *
 * Pure data and pure functions: nothing here touches the page or any storage, so
 * it is safe to load on the server and in checks.
 */

/** @typedef {{ readonly e: string, readonly name: string }} SmashEmoji */

/** @param {ReadonlyArray<readonly [string, string]>} pairs */
function group(pairs) {
  return Object.freeze(pairs.map(([e, name]) => Object.freeze({ e, name })));
}

/** One group for each letter, a to z. @type {Readonly<Record<string, readonly SmashEmoji[]>>} */
export const BY_LETTER = Object.freeze({
  a: group([['🍎', 'apple'], ['🐜', 'ant'], ['✈️', 'airplane'], ['🥑', 'avocado']]),
  b: group([['🍌', 'banana'], ['🐻', 'bear'], ['🦋', 'butterfly'], ['🚌', 'bus'], ['🫐', 'blueberry'], ['🐝', 'bee']]),
  c: group([['🐱', 'cat'], ['🚗', 'car'], ['🐮', 'cow'], ['🍪', 'cookie'], ['🥕', 'carrot'], ['☁️', 'cloud']]),
  d: group([['🐶', 'dog'], ['🦆', 'duck'], ['🍩', 'donut'], ['🐬', 'dolphin'], ['🦕', 'dinosaur']]),
  e: group([['🐘', 'elephant'], ['🥚', 'egg'], ['🦅', 'eagle'], ['🌍', 'earth']]),
  f: group([['🐸', 'frog'], ['🐟', 'fish'], ['🦊', 'fox'], ['🌸', 'flower'], ['🍟', 'fries']]),
  g: group([['🍇', 'grapes'], ['🦒', 'giraffe'], ['🐐', 'goat'], ['🦍', 'gorilla'], ['🎁', 'gift']]),
  h: group([['🐹', 'hamster'], ['❤️', 'heart'], ['🐴', 'horse'], ['🏠', 'house'], ['🍯', 'honey']]),
  i: group([['🍦', 'ice cream'], ['🧊', 'ice'], ['🦎', 'iguana'], ['🏝️', 'island']]),
  j: group([['🤹', 'juggler'], ['🫙', 'jar'], ['🧃', 'juice'], ['👖', 'jeans']]),
  k: group([['🦘', 'kangaroo'], ['🪁', 'kite'], ['🔑', 'key'], ['🐨', 'koala'], ['🐱', 'kitten']]),
  l: group([['🦁', 'lion'], ['🍋', 'lemon'], ['🐞', 'ladybug'], ['🍃', 'leaf'], ['🦎', 'lizard']]),
  m: group([['🐵', 'monkey'], ['🌙', 'moon'], ['🍈', 'melon'], ['🐭', 'mouse']]),
  n: group([['🥜', 'nut'], ['🌃', 'night'], ['👃', 'nose'], ['📒', 'notebook']]),
  o: group([['🍊', 'orange'], ['🐙', 'octopus'], ['🦉', 'owl'], ['🧅', 'onion']]),
  p: group([['🐷', 'pig'], ['🐧', 'penguin'], ['🍐', 'pear'], ['🐼', 'panda'], ['🍍', 'pineapple'], ['🥞', 'pancakes']]),
  q: group([['👑', 'queen'], ['❓', 'question'], ['🪶', 'quill'], ['🦆', 'quack']]),
  r: group([['🐰', 'rabbit'], ['🌈', 'rainbow'], ['🤖', 'robot'], ['🌹', 'rose'], ['🚀', 'rocket']]),
  s: group([['☀️', 'sun'], ['⭐', 'star'], ['🍓', 'strawberry'], ['🚢', 'ship'], ['🐌', 'snail']]),
  t: group([['🐯', 'tiger'], ['🌳', 'tree'], ['🚂', 'train'], ['🐢', 'turtle'], ['🍅', 'tomato']]),
  u: group([['☂️', 'umbrella'], ['🦄', 'unicorn'], ['🆙', 'up'], ['🛸', 'ufo']]),
  v: group([['🚐', 'van'], ['🌷', 'tulip'], ['🎻', 'violin'], ['🥦', 'vegetable']]),
  w: group([['🐳', 'whale'], ['🍉', 'watermelon'], ['🌊', 'wave'], ['🪱', 'worm']]),
  x: group([['🎵', 'music'], ['🦊', 'fox'], ['📦', 'box']]),
  y: group([['🪀', 'yo-yo'], ['💛', 'yellow heart'], ['🧶', 'yarn'], ['🥱', 'yawn']]),
  z: group([['🦓', 'zebra'], ['💤', 'zzz'], ['🌽', 'corn']]),
});

/** The general group, for every key that is not a letter. @type {readonly SmashEmoji[]} */
export const ALL = group([
  ['🍎', 'apple'], ['🍌', 'banana'], ['🍓', 'strawberry'], ['🍊', 'orange'], ['🍇', 'grapes'],
  ['🍉', 'watermelon'], ['🐱', 'cat'], ['🐶', 'dog'], ['🐻', 'bear'], ['🐰', 'rabbit'],
  ['🐼', 'panda'], ['🦊', 'fox'], ['🐸', 'frog'], ['🐷', 'pig'], ['🐧', 'penguin'],
  ['🦁', 'lion'], ['🐘', 'elephant'], ['🦄', 'unicorn'], ['🐝', 'bee'], ['🦋', 'butterfly'],
  ['🐟', 'fish'], ['🐳', 'whale'], ['🚗', 'car'], ['🚌', 'bus'], ['🚂', 'train'],
  ['✈️', 'airplane'], ['🚀', 'rocket'], ['⛵', 'boat'], ['☀️', 'sun'], ['🌙', 'moon'],
  ['⭐', 'star'], ['🌈', 'rainbow'], ['☁️', 'cloud'], ['🌳', 'tree'], ['🌸', 'flower'],
  ['❤️', 'heart'], ['🎈', 'balloon'], ['🍪', 'cookie'], ['🍦', 'ice cream'], ['🎁', 'gift'],
]);

/**
 * The spoken word in Turkish, Spanish, French, German and Italian, keyed by the
 * English word. A missing language or word is said in English. `zzz` is left out
 * on purpose: it sounds the same everywhere. Close pairs get different words so
 * they do not sound alike (the boat and the ship, the ice and the ice cream).
 *
 * @type {Readonly<Record<string, Readonly<Partial<Record<'tr' | 'es' | 'fr' | 'de' | 'it', string>>>>>}
 */
export const NAME_I18N = Object.freeze(Object.fromEntries(Object.entries({
  apple: { tr: 'elma', es: 'manzana', fr: 'pomme', de: 'apfel', it: 'mela' },
  ant: { tr: 'karınca', es: 'hormiga', fr: 'fourmi', de: 'ameise', it: 'formica' },
  airplane: { tr: 'uçak', es: 'avión', fr: 'avion', de: 'flugzeug', it: 'aereo' },
  avocado: { tr: 'avokado', es: 'aguacate', fr: 'avocat', de: 'avocado', it: 'avocado' },
  banana: { tr: 'muz', es: 'plátano', fr: 'banane', de: 'banane', it: 'banana' },
  bear: { tr: 'ayı', es: 'oso', fr: 'ours', de: 'bär', it: 'orso' },
  butterfly: { tr: 'kelebek', es: 'mariposa', fr: 'papillon', de: 'schmetterling', it: 'farfalla' },
  bus: { tr: 'otobüs', es: 'autobús', fr: 'bus', de: 'bus', it: 'autobus' },
  blueberry: { tr: 'yaban mersini', es: 'arándano', fr: 'myrtille', de: 'blaubeere', it: 'mirtillo' },
  bee: { tr: 'arı', es: 'abeja', fr: 'abeille', de: 'biene', it: 'ape' },
  cat: { tr: 'kedi', es: 'gato', fr: 'chat', de: 'katze', it: 'gatto' },
  car: { tr: 'araba', es: 'coche', fr: 'voiture', de: 'auto', it: 'macchina' },
  cow: { tr: 'inek', es: 'vaca', fr: 'vache', de: 'kuh', it: 'mucca' },
  cookie: { tr: 'kurabiye', es: 'galleta', fr: 'biscuit', de: 'keks', it: 'biscotto' },
  carrot: { tr: 'havuç', es: 'zanahoria', fr: 'carotte', de: 'karotte', it: 'carota' },
  cloud: { tr: 'bulut', es: 'nube', fr: 'nuage', de: 'wolke', it: 'nuvola' },
  dog: { tr: 'köpek', es: 'perro', fr: 'chien', de: 'hund', it: 'cane' },
  duck: { tr: 'ördek', es: 'pato', fr: 'canard', de: 'ente', it: 'anatra' },
  donut: { tr: 'donut', es: 'rosquilla', fr: 'beignet', de: 'donut', it: 'ciambella' },
  dolphin: { tr: 'yunus', es: 'delfín', fr: 'dauphin', de: 'delfin', it: 'delfino' },
  dinosaur: { tr: 'dinozor', es: 'dinosaurio', fr: 'dinosaure', de: 'dinosaurier', it: 'dinosauro' },
  elephant: { tr: 'fil', es: 'elefante', fr: 'éléphant', de: 'elefant', it: 'elefante' },
  egg: { tr: 'yumurta', es: 'huevo', fr: 'œuf', de: 'ei', it: 'uovo' },
  eagle: { tr: 'kartal', es: 'águila', fr: 'aigle', de: 'adler', it: 'aquila' },
  earth: { tr: 'dünya', es: 'tierra', fr: 'terre', de: 'erde', it: 'terra' },
  frog: { tr: 'kurbağa', es: 'rana', fr: 'grenouille', de: 'frosch', it: 'rana' },
  fish: { tr: 'balık', es: 'pez', fr: 'poisson', de: 'fisch', it: 'pesce' },
  fox: { tr: 'tilki', es: 'zorro', fr: 'renard', de: 'fuchs', it: 'volpe' },
  flower: { tr: 'çiçek', es: 'flor', fr: 'fleur', de: 'blume', it: 'fiore' },
  fries: { tr: 'patates kızartması', es: 'patatas fritas', fr: 'frites', de: 'pommes', it: 'patatine' },
  grapes: { tr: 'üzüm', es: 'uvas', fr: 'raisin', de: 'trauben', it: 'uva' },
  giraffe: { tr: 'zürafa', es: 'jirafa', fr: 'girafe', de: 'giraffe', it: 'giraffa' },
  goat: { tr: 'keçi', es: 'cabra', fr: 'chèvre', de: 'ziege', it: 'capra' },
  gorilla: { tr: 'goril', es: 'gorila', fr: 'gorille', de: 'gorilla', it: 'gorilla' },
  gift: { tr: 'hediye', es: 'regalo', fr: 'cadeau', de: 'geschenk', it: 'regalo' },
  hamster: { tr: 'hamster', es: 'hámster', fr: 'hamster', de: 'hamster', it: 'criceto' },
  heart: { tr: 'kalp', es: 'corazón', fr: 'cœur', de: 'herz', it: 'cuore' },
  horse: { tr: 'at', es: 'caballo', fr: 'cheval', de: 'pferd', it: 'cavallo' },
  house: { tr: 'ev', es: 'casa', fr: 'maison', de: 'haus', it: 'casa' },
  honey: { tr: 'bal', es: 'miel', fr: 'miel', de: 'honig', it: 'miele' },
  'ice cream': { tr: 'dondurma', es: 'helado', fr: 'glace', de: 'eiscreme', it: 'gelato' },
  ice: { tr: 'buz', es: 'hielo', fr: 'glaçon', de: 'eis', it: 'ghiaccio' },
  iguana: { tr: 'iguana', es: 'iguana', fr: 'iguane', de: 'leguan', it: 'iguana' },
  island: { tr: 'ada', es: 'isla', fr: 'île', de: 'insel', it: 'isola' },
  juggler: { tr: 'jonglör', es: 'malabarista', fr: 'jongleur', de: 'jongleur', it: 'giocoliere' },
  jar: { tr: 'kavanoz', es: 'tarro', fr: 'bocal', de: 'glas', it: 'barattolo' },
  juice: { tr: 'meyve suyu', es: 'zumo', fr: 'jus', de: 'saft', it: 'succo' },
  jeans: { tr: 'kot', es: 'vaqueros', fr: 'jean', de: 'jeans', it: 'jeans' },
  kangaroo: { tr: 'kanguru', es: 'canguro', fr: 'kangourou', de: 'känguru', it: 'canguro' },
  kite: { tr: 'uçurtma', es: 'cometa', fr: 'cerf-volant', de: 'drachen', it: 'aquilone' },
  key: { tr: 'anahtar', es: 'llave', fr: 'clé', de: 'schlüssel', it: 'chiave' },
  koala: { tr: 'koala', es: 'koala', fr: 'koala', de: 'koala', it: 'koala' },
  kitten: { tr: 'kedi yavrusu', es: 'gatito', fr: 'chaton', de: 'kätzchen', it: 'gattino' },
  lion: { tr: 'aslan', es: 'león', fr: 'lion', de: 'löwe', it: 'leone' },
  lemon: { tr: 'limon', es: 'limón', fr: 'citron', de: 'zitrone', it: 'limone' },
  ladybug: { tr: 'uğur böceği', es: 'mariquita', fr: 'coccinelle', de: 'marienkäfer', it: 'coccinella' },
  leaf: { tr: 'yaprak', es: 'hoja', fr: 'feuille', de: 'blatt', it: 'foglia' },
  lizard: { tr: 'kertenkele', es: 'lagarto', fr: 'lézard', de: 'eidechse', it: 'lucertola' },
  monkey: { tr: 'maymun', es: 'mono', fr: 'singe', de: 'affe', it: 'scimmia' },
  moon: { tr: 'ay', es: 'luna', fr: 'lune', de: 'mond', it: 'luna' },
  melon: { tr: 'kavun', es: 'melón', fr: 'melon', de: 'melone', it: 'melone' },
  mouse: { tr: 'fare', es: 'ratón', fr: 'souris', de: 'maus', it: 'topo' },
  nut: { tr: 'fıstık', es: 'cacahuete', fr: 'cacahuète', de: 'erdnuss', it: 'arachide' },
  night: { tr: 'gece', es: 'noche', fr: 'nuit', de: 'nacht', it: 'notte' },
  nose: { tr: 'burun', es: 'nariz', fr: 'nez', de: 'nase', it: 'naso' },
  notebook: { tr: 'defter', es: 'cuaderno', fr: 'cahier', de: 'heft', it: 'quaderno' },
  orange: { tr: 'portakal', es: 'naranja', fr: 'orange', de: 'orange', it: 'arancia' },
  octopus: { tr: 'ahtapot', es: 'pulpo', fr: 'pieuvre', de: 'oktopus', it: 'polpo' },
  owl: { tr: 'baykuş', es: 'búho', fr: 'hibou', de: 'eule', it: 'gufo' },
  onion: { tr: 'soğan', es: 'cebolla', fr: 'oignon', de: 'zwiebel', it: 'cipolla' },
  pig: { tr: 'domuz', es: 'cerdo', fr: 'cochon', de: 'schwein', it: 'maiale' },
  penguin: { tr: 'penguen', es: 'pingüino', fr: 'pingouin', de: 'pinguin', it: 'pinguino' },
  pear: { tr: 'armut', es: 'pera', fr: 'poire', de: 'birne', it: 'pera' },
  panda: { tr: 'panda', es: 'panda', fr: 'panda', de: 'panda', it: 'panda' },
  pineapple: { tr: 'ananas', es: 'piña', fr: 'ananas', de: 'ananas', it: 'ananas' },
  pancakes: { tr: 'krep', es: 'tortitas', fr: 'crêpes', de: 'pfannkuchen', it: 'frittelle' },
  queen: { tr: 'kraliçe', es: 'reina', fr: 'reine', de: 'königin', it: 'regina' },
  question: { tr: 'soru', es: 'pregunta', fr: 'question', de: 'frage', it: 'domanda' },
  quill: { tr: 'tüy', es: 'pluma', fr: 'plume', de: 'feder', it: 'piuma' },
  quack: { tr: 'vak vak', es: 'cua cua', fr: 'coin coin', de: 'quak quak', it: 'qua qua' },
  rabbit: { tr: 'tavşan', es: 'conejo', fr: 'lapin', de: 'hase', it: 'coniglio' },
  rainbow: { tr: 'gökkuşağı', es: 'arcoíris', fr: 'arc-en-ciel', de: 'regenbogen', it: 'arcobaleno' },
  robot: { tr: 'robot', es: 'robot', fr: 'robot', de: 'roboter', it: 'robot' },
  rose: { tr: 'gül', es: 'rosa', fr: 'rose', de: 'rose', it: 'rosa' },
  rocket: { tr: 'roket', es: 'cohete', fr: 'fusée', de: 'rakete', it: 'razzo' },
  sun: { tr: 'güneş', es: 'sol', fr: 'soleil', de: 'sonne', it: 'sole' },
  star: { tr: 'yıldız', es: 'estrella', fr: 'étoile', de: 'stern', it: 'stella' },
  strawberry: { tr: 'çilek', es: 'fresa', fr: 'fraise', de: 'erdbeere', it: 'fragola' },
  ship: { tr: 'gemi', es: 'barco', fr: 'bateau', de: 'schiff', it: 'nave' },
  snail: { tr: 'salyangoz', es: 'caracol', fr: 'escargot', de: 'schnecke', it: 'lumaca' },
  tiger: { tr: 'kaplan', es: 'tigre', fr: 'tigre', de: 'tiger', it: 'tigre' },
  tree: { tr: 'ağaç', es: 'árbol', fr: 'arbre', de: 'baum', it: 'albero' },
  train: { tr: 'tren', es: 'tren', fr: 'train', de: 'zug', it: 'treno' },
  turtle: { tr: 'kaplumbağa', es: 'tortuga', fr: 'tortue', de: 'schildkröte', it: 'tartaruga' },
  tomato: { tr: 'domates', es: 'tomate', fr: 'tomate', de: 'tomate', it: 'pomodoro' },
  umbrella: { tr: 'şemsiye', es: 'paraguas', fr: 'parapluie', de: 'regenschirm', it: 'ombrello' },
  unicorn: { tr: 'tek boynuzlu at', es: 'unicornio', fr: 'licorne', de: 'einhorn', it: 'unicorno' },
  up: { tr: 'yukarı', es: 'arriba', fr: 'en haut', de: 'oben', it: 'su' },
  ufo: { tr: 'ufo', es: 'ovni', fr: 'ovni', de: 'ufo', it: 'ufo' },
  van: { tr: 'minibüs', es: 'furgoneta', fr: 'camionnette', de: 'lieferwagen', it: 'furgone' },
  tulip: { tr: 'lale', es: 'tulipán', fr: 'tulipe', de: 'tulpe', it: 'tulipano' },
  violin: { tr: 'keman', es: 'violín', fr: 'violon', de: 'geige', it: 'violino' },
  vegetable: { tr: 'sebze', es: 'verdura', fr: 'légume', de: 'gemüse', it: 'verdura' },
  whale: { tr: 'balina', es: 'ballena', fr: 'baleine', de: 'wal', it: 'balena' },
  watermelon: { tr: 'karpuz', es: 'sandía', fr: 'pastèque', de: 'wassermelone', it: 'anguria' },
  wave: { tr: 'dalga', es: 'ola', fr: 'vague', de: 'welle', it: 'onda' },
  worm: { tr: 'solucan', es: 'gusano', fr: 'ver', de: 'wurm', it: 'verme' },
  music: { tr: 'müzik', es: 'música', fr: 'musique', de: 'musik', it: 'musica' },
  box: { tr: 'kutu', es: 'caja', fr: 'boîte', de: 'schachtel', it: 'scatola' },
  'yo-yo': { tr: 'yoyo', es: 'yoyó', fr: 'yo-yo', de: 'jojo', it: 'yo-yo' },
  'yellow heart': { tr: 'sarı kalp', es: 'corazón amarillo', fr: 'cœur jaune', de: 'gelbes herz', it: 'cuore giallo' },
  yarn: { tr: 'yün', es: 'lana', fr: 'laine', de: 'wolle', it: 'lana' },
  yawn: { tr: 'esneme', es: 'bostezo', fr: 'bâillement', de: 'gähnen', it: 'sbadiglio' },
  zebra: { tr: 'zebra', es: 'cebra', fr: 'zèbre', de: 'zebra', it: 'zebra' },
  corn: { tr: 'mısır', es: 'maíz', fr: 'maïs', de: 'mais', it: 'mais' },
  boat: { tr: 'tekne', es: 'velero', fr: 'voilier', de: 'boot', it: 'barca' },
  balloon: { tr: 'balon', es: 'globo', fr: 'ballon', de: 'luftballon', it: 'palloncino' },
}).map(([name, words]) => [name, Object.freeze(words)])));

/**
 * The six languages the toy can speak, in the order the picker lists them.
 * `tag` is handed to the speech voice; `wordsKey` names the language's own name
 * in the locale files.
 *
 * @type {ReadonlyArray<{ readonly code: string, readonly tag: string, readonly wordsKey: string }>}
 */
export const VOICE_LANGUAGES = Object.freeze([
  Object.freeze({ code: 'en', tag: 'en-US', wordsKey: 'smash.language.en' }),
  Object.freeze({ code: 'tr', tag: 'tr-TR', wordsKey: 'smash.language.tr' }),
  Object.freeze({ code: 'es', tag: 'es-ES', wordsKey: 'smash.language.es' }),
  Object.freeze({ code: 'fr', tag: 'fr-FR', wordsKey: 'smash.language.fr' }),
  Object.freeze({ code: 'de', tag: 'de-DE', wordsKey: 'smash.language.de' }),
  Object.freeze({ code: 'it', tag: 'it-IT', wordsKey: 'smash.language.it' }),
]);

/** The six tags, for checking a saved choice. */
export const VOICE_TAGS = Object.freeze(VOICE_LANGUAGES.map((language) => language.tag));

/**
 * The word to say for an English name in a language. `tag` may be a full tag
 * (`tr-TR`) or only its first part (`tr`). English, a language the toy does not
 * translate, and a word with no translation all give the English name.
 *
 * @param {string} name
 * @param {string} tag
 * @returns {string}
 */
export function spokenName(name, tag) {
  if (typeof name !== 'string' || name.length === 0) return '';
  const base = String(tag || 'en').split('-')[0].toLowerCase();
  if (base === 'en') return name;
  const words = Object.hasOwn(NAME_I18N, name) ? NAME_I18N[name] : undefined;
  const word = words !== undefined && Object.hasOwn(words, base) ? words[base] : undefined;
  return typeof word === 'string' && word.length > 0 ? word : name;
}

/**
 * @param {readonly SmashEmoji[]} list
 * @param {() => number} random
 */
function pickFrom(list, random) {
  const roll = Number(random());
  const spot = Number.isFinite(roll) ? Math.floor(roll * list.length) : 0;
  return list[Math.min(list.length - 1, Math.max(0, spot))];
}

/**
 * One emoji for a key. A single letter a to z, in either case, picks from that
 * letter's group; anything else (Enter, an arrow, space, a digit, punctuation, an
 * empty value) picks from the general group.
 *
 * @param {unknown} key
 * @param {() => number} [random]
 * @returns {SmashEmoji}
 */
export function pickForKey(key, random = Math.random) {
  if (typeof key === 'string' && key.length === 1) {
    const lower = key.toLowerCase();
    if (lower >= 'a' && lower <= 'z' && Object.hasOwn(BY_LETTER, lower)) return pickFrom(BY_LETTER[lower], random);
  }
  return pickFrom(ALL, random);
}

/**
 * The language the toy speaks: the saved choice when it is one of the six, else
 * Turkish for a Turkish app, else English.
 *
 * @param {unknown} savedTag
 * @param {unknown} appLocale
 * @returns {string}
 */
export function voiceTagFor(savedTag, appLocale) {
  if (typeof savedTag === 'string' && VOICE_TAGS.includes(savedTag)) return savedTag;
  return appLocale === 'tr' ? 'tr-TR' : 'en-US';
}
