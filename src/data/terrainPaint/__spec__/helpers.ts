/** Build an alpha bitmap from ASCII art: '#' = solid, anything else = empty. */
export function bitmap(rows: string[]): {
  alpha: Uint8Array;
  width: number;
  height: number;
} {
  const height = rows.length;
  const width = rows[0].length;
  const alpha = new Uint8Array(width * height);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      if (row[x] === "#") alpha[y * width + x] = 1;
    }
  });
  return { alpha, width, height };
}
