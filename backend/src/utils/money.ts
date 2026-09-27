/** All money is stored as integer minor units (paise) to avoid floating-point errors. */
export const toMinor = (rupees: number) => Math.round(rupees * 100);
