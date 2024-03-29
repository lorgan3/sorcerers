import { mod } from "../../util/math";

export const TAU = Math.PI * 2;

const RESOLUTION = 36;

const slice = TAU / RESOLUTION;
const halfSlice = slice / 2;

export const angles = new Array(RESOLUTION).fill(null).map((_, i) => slice * i);

export const getIndexFromAngle = (angle: number) => {
  const positiveAngle = mod(angle + halfSlice, TAU);

  return Math.floor((positiveAngle / TAU) * RESOLUTION);
};
