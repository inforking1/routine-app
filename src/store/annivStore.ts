import { create } from "zustand";

export type Anniv = {
  id: string;
  title: string;
  date: string;
  pinned?: boolean;
}

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
