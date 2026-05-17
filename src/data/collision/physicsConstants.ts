// Single source of truth for the body simulation's tuning constants.
// Imported by Body itself, by the bot's `physics.ts` (which derives jump
// reachability from these), and by physics tests.
export const GRAVITY = 0.2;
export const AIR_CONTROL = 0.4;
export const GROUND_FRICTION = 0.88;
export const AIR_FRICTION = 0.98;
export const SPEED = 0.09;
export const JUMP_STRENGTH = 3.3;
