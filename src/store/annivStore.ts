import { create } from "zustand";
import type { Anniv } from "../data/anniversaries";

type S = {
  items: Anniv[];
  ready: boolean;
  set: (items: Anniv[]) => void;
  setReady: (v: boolean) => void;
};

export const useAnnivStore = create<S>((set) => ({
  items: [],
  ready: false,
  set: (items) => set({ items }),
  setReady: (v) => set({ ready: v }),
}));
