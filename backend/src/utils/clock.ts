/**
 * Indirection over the system clock so business logic can be tested at any
 * point in a competition's lifecycle without fake timers (which would also
 * freeze the MongoDB driver's internal timers).
 */
let override: (() => Date) | null = null;

export const clock = {
  now: (): Date => (override ? override() : new Date()),
  /** Test-only helper. */
  set(fn: (() => Date) | null) {
    override = fn;
  },
};
