import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { motionEnabled } from "./motion-flag";

let registered = false;

export function setupGsap(): boolean {
  if (registered) return motionEnabled();
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  registered = true;
  if (!motionEnabled()) {
    ScrollTrigger.getAll().forEach((t) => t.kill());
  }
  return motionEnabled();
}
