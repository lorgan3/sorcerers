// https://stackoverflow.com/a/1891422
const vowels = ["a", "e", "i", "o", "u"];
const consonants = [
  "b",
  "c",
  "d",
  "f",
  "g",
  "h",
  "j",
  "k",
  "l",
  "m",
  "n",
  "p",
  "q",
  "r",
  "s",
  "t",
  "v",
  "w",
  "x",
  "y",
  "z",
];

const vowel = () => vowels[Math.floor(Math.random() * vowels.length)];
const consonant = () =>
  consonants[Math.floor(Math.random() * consonants.length)];
const cv = () => consonant() + vowel();
const cvc = () => cv() + consonant();

const options = [vowel, cv, cvc];
const syllable = () => options[Math.floor(Math.random() * options.length)]();

export const getWord = () => {
  const syllables: string[] = [];

  const length = Math.random() > 0.5 ? 3 : 2;
  for (let i = 0; i < length; i++) {
    syllables.push(syllable());
  }

  const word = syllables.join("");
  return word[0].toUpperCase() + word.slice(1);
};

const BOT_NAMES = [
  "Sir Clanks-a-Lot",
  "Gandalf.exe",
  "AutoMage",
  "Botric the Bland",
  "Lagron the Grey",
  "YeetBeard the Wise",
  "Elf.exe",
  "The Iron Peasant",
  "QuestBot3000",
  "Dumbldork",
  "Goblin.exe",
  "Beepus the Brave",
  "Knightmare Fuel",
  "Wand Error 404",
  "Sir Miss-a-Lot",
  "Botilda the Slightly Magical",
  "ManaFried",
  "The Looter King",
  "AutoNecroMancer",
  "PotionMotion",
];

export const getBotName = () =>
  BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
