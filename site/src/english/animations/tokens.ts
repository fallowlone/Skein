// Composition constants + palette (0–1 RGBA). One place to restyle every archetype.
export const COMP = { W: 800, H: 450, FR: 30, OP: 90 } as const;

export const COLOR = {
  bg: [0.99, 0.99, 1, 1],
  ink: [0.13, 0.16, 0.22, 1],
  muted: [0.55, 0.58, 0.66, 1],
  line: [0.8, 0.82, 0.88, 1],
  accent: [0.36, 0.4, 0.95, 1],
  good: [0.2, 0.7, 0.45, 1],
  warn: [0.9, 0.45, 0.2, 1],
  surface: [0.95, 0.96, 0.99, 1],
} as const;

export const EASE_IN = { x: [0.34], y: [1] };
export const EASE_OUT = { x: [0.4], y: [0] };

export const FONT = {
  list: [{ fName: "sans", fFamily: "Inter, system-ui, Arial, sans-serif", fStyle: "SemiBold", fWeight: "600", ascent: 72 }],
};
