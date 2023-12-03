export interface Controller {
  isKeyDown(key: Key): boolean;
  getMouse(): [number, number];
  pressedKeys: number;
  deserialize(buffer: [number, number, number]): void;
  destroy(): void;
  // addKeyListener(key: Key, fn: () => void): () => void;
}

export enum Key {
  Shift = "Shift",
  Control = "Control",
  Meta = "Meta",
  Plus = "+",
  Minus = "-",
  Equals = "=",
  Up = "ArrowUp",
  Left = "ArrowLeft",
  Right = "ArrowRight",
  Down = "ArrowDown",
  Escape = "Escape",
  W = "w",
  A = "a",
  S = "s",
  D = "d",
  Z = "z",
  Q = "q",
  B = "b",
  E = "e",
  F = "f",
  M1 = "M1",
  M2 = "M2",
}

export const keys = Object.values(Key);
export const keySet = new Set<string>(keys);

if (keys.length >= 32) {
  throw new Error(
    "Can only serialize up to 32 keys, this will need some fixing!"
  );
}

export const keyMap = {} as Record<Key, number>;
for (let i = 0; i < keys.length; i++) {
  keyMap[keys[i]] = 2 ** i;
}

export function isKey(key: string): key is Key {
  return keySet.has(key);
}
