export interface DefaultMap {
  // Path to the map. Should point to the maps folder.
  path: string;

  // Your name or names of people you want to credit.
  author: string;

  // An estimation of for how many characters the map is made.
  recommendedCharacterCount: number;

  // Theme of the map.
  theme?: string;
}

export const defaultMaps: Record<string, DefaultMap> = {
  Playground: {
    path: `${import.meta.env.BASE_URL}maps/playground.png`,
    author: "Lorgan3",
    recommendedCharacterCount: 4,
  },
  Castle: {
    path: `${import.meta.env.BASE_URL}maps/castle.png`,
    author: "Lorgan3",
    recommendedCharacterCount: 16,
    theme: "Medieval",
  },
  Stadium: {
    path: `${import.meta.env.BASE_URL}maps/stadium.png`,
    author: "Lorgan3",
    recommendedCharacterCount: 8,
  },
  Mario_World: {
    path: `${import.meta.env.BASE_URL}maps/mario.png`,
    author: "JordyDeGroeve",
    recommendedCharacterCount: 12,
    theme: "Mario",
  },
  Office: {
    path: `${import.meta.env.BASE_URL}maps/office.png`,
    author: "Lorgan3",
    recommendedCharacterCount: 16,
  },
};
