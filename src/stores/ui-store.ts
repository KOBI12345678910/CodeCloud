import { create } from "zustand";
import type { Language, Direction } from "@shared/types";

interface UIState {
  language: Language;
  direction: Direction;
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";

  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: "he",
  direction: "rtl",
  sidebarOpen: true,
  theme: "system",

  setLanguage: (language) => {
    const direction: Direction = language === "en" ? "ltr" : "rtl";
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    set({ language, direction });
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setTheme: (theme) => {
    set({ theme });
    if (theme === "dark") document.documentElement.classList.add("dark");
    else if (theme === "light") document.documentElement.classList.remove("dark");
  },
}));
