export const assertNumber = (value: any, min?: number, max?: number) => {
  const parsed = Number(value);

  if (isNaN(parsed) || (min && parsed < min)) {
    return min ?? 0;
  }

  if (max && parsed > max) {
    return max;
  }

  return parsed;
};
