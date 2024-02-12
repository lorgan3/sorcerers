export const mod = (value: number, modulo: number) =>
  ((value % modulo) + modulo) % modulo;

export const dot = (v1x: number, v1y: number, v2x: number, v2y: number) => {
  return v1x * v2x + v1y * v2y;
};

// https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
export const getRayDistance = (
  rayX: number,
  rayY: number,
  rayDirection: number,
  pointX: number,
  pointY: number
) => {
  const v1x = rayX - pointX;
  const v1y = rayY - pointY;
  const v2x = Math.cos(rayDirection);
  const v2y = Math.sin(rayDirection);

  // Only consider points that are 'in front' of the ray
  const product = dot(v1x, v1y, v2x, v2y);
  if (product < 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(v1y * v2x - v1x * v2y);
};

export const getSquareDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  return (x1 - x2) ** 2 + (y1 - y2) ** 2;
};

export const getDistance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt(getSquareDistance(x1, y1, x2, y2));

export const map = (from: number, to: number, t: number) => {
  return from * (1 - t) + to * t;
};
