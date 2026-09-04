export const MOTION_KEY = "skein.motion";

export function motionEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const override = localStorage.getItem(MOTION_KEY);
  if (override === "off") return false;
  if (override === "on") return true;
  return !reduce;
}

export function toggleMotion(): boolean {
  const next = motionEnabled() ? "off" : "on";
  localStorage.setItem(MOTION_KEY, next);
  return next === "on";
}
