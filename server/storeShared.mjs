/** @typedef {"local" | "volume" | "postgres"} StorageMode */

export const emptySlots = () => [
  { label: "Slot 1", game: null, updatedAt: null },
  { label: "Slot 2", game: null, updatedAt: null },
  { label: "Slot 3", game: null, updatedAt: null },
];

export const emptySaves = () => ({
  slots: emptySlots(),
  activeSlot: 0,
  preferredDifficulty: "normal",
  coachOn: true,
});

/** @param {() => Promise<unknown>} fn */
export const createLock = () => {
  /** @type {Promise<unknown>} */
  let chain = Promise.resolve();
  return (fn) => {
    const next = chain.then(fn, fn);
    chain = next.catch(() => {});
    return next;
  };
};
