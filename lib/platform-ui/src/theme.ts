export const theme = {
  colors: {
    background: "hsl(222 47% 11%)",
    foreground: "hsl(210 40% 98%)",
    accent: "hsl(224 76% 48%)",
    muted: "hsl(217 33% 17%)",
    border: "hsl(217 33% 24%)",
  },
  radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem" },
} as const;

export type Theme = typeof theme;
