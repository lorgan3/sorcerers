export const getRandom = <T>(arr: T[]) => {
  return arr[Math.floor(arr.length * Math.random())];
};
