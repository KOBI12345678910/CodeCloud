import { create } from "zustand";

export type Theme = "dark" | "light";
export type BottomPanel = "terminal" | "output" | "problems";

export interface PanelSizes {
  left: number;
  center: number;
  right: number;
  bottom: number;
}

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;
  panelSizes: PanelSizes;
  activeBottomPanel: BottomPanel;
  showAIPanel: boolean;
  showCommandPalette: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setPanelSize: (panel: keyof PanelSizes, size: number) => void;
  setPanelSizes: (sizes: Partial<PanelSizes>) => void;
  setActiveBottomPanel: (panel: BottomPanel) => void;
  toggleAIPanel: () => void;
  toggleCommandPalette: () => void;
  resetLayout: () => void;
}

const DEFAULT_PANEL_SIZES: PanelSizes = {
  left: 20,
  center: 50,
  right: 30,
  bottom: 30,
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: "dark",
  panelSizes: { ...DEFAULT_PANEL_SIZES },
  activeBottomPanel: "terminal",
  showAIPanel: false,
  showCommandPalette: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  setPanelSize: (panel, size) =>
    set((state) => ({ panelSizes: { ...state.panelSizes, [panel]: size } })),
  setPanelSizes: (sizes) =>
    set((state) => ({ panelSizes: { ...state.panelSizes, ...sizes } })),
  setActiveBottomPanel: (panel) => set({ activeBottomPanel: panel }),
  toggleAIPanel: () => set((state) => ({ showAIPanel: !state.showAIPanel })),
  toggleCommandPalette: () => set((state) => ({ showCommandPalette: !state.showCommandPalette })),
  resetLayout: () => set({ panelSizes: { ...DEFAULT_PANEL_SIZES }, sidebarOpen: true, showAIPanel: false }),
}));
