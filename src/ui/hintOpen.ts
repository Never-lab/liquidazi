export type HintOpenAction = { type: "open" } | { type: "close" } | { type: "toggle" };

export const hintOpenReducer = (open: boolean, action: HintOpenAction): boolean => {
  if (action.type === "open") return true;
  if (action.type === "close") return false;
  return !open;
};
