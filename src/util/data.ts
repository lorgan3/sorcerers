export const base64ToBytes = (base64: string) => {
  const binString = window.atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0)!);
};

export const bytesToBase64 = (bytes: ArrayBuffer) => {
  const binString = String.fromCodePoint(...new Uint8Array(bytes));
  return window.btoa(binString);
};
