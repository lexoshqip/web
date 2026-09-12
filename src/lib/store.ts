import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FormatKind } from "./types";

export interface HistoryEntry {
  bookId: string;
  format: FormatKind;
  at: number;
}

interface LibraryState {
  favorites: string[];
  history: HistoryEntry[];
  ratings: Record<string, number>; // bookId → 1–5, absent = unrated
  toggleFavorite: (bookId: string) => void;
  isFavorite: (bookId: string) => boolean;
  addHistory: (bookId: string, format: FormatKind) => void;
  clearHistory: () => void;
  setRating: (bookId: string, stars: number) => void;
  getRating: (bookId: string) => number; // 0 = unrated
}

const MAX_HISTORY = 50;

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      history: [],
      ratings: {},
      toggleFavorite: (bookId) =>
        set((s) => ({
          favorites: s.favorites.includes(bookId)
            ? s.favorites.filter((id) => id !== bookId)
            : [bookId, ...s.favorites],
        })),
      isFavorite: (bookId) => get().favorites.includes(bookId),
      addHistory: (bookId, format) =>
        set((s) => ({
          history: [
            { bookId, format, at: Date.now() },
            ...s.history.filter((h) => !(h.bookId === bookId && h.format === format)),
          ].slice(0, MAX_HISTORY),
        })),
      clearHistory: () => set({ history: [] }),
      setRating: (bookId, stars) =>
        set((s) => {
          const next = { ...s.ratings };
          if (stars === 0) delete next[bookId];
          else next[bookId] = stars;
          return { ratings: next };
        }),
      getRating: (bookId) => get().ratings[bookId] ?? 0,
    }),
    { name: "lexoshqip-library" }
  )
);
