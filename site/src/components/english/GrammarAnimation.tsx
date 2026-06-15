import { useEffect, useRef } from "preact/hooks";
import type { AnimationItem } from "lottie-web";
import type { LottieDoc } from "~/english/animations/lottie-types";

type Props = { doc: LottieDoc; reducedMotion?: boolean; label?: string };

function prefersReduced(forced?: boolean): boolean {
  if (forced) return true;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function GrammarAnimation({ doc, reducedMotion, label = "Grammar animation" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = prefersReduced(reducedMotion);
    let anim: AnimationItem | null = null;
    let cancelled = false;

    // Dynamic import keeps lottie-web out of the base bundle; it loads only when
    // an animation island actually mounts.
    import("lottie-web").then((mod) => {
      if (cancelled || !ref.current) return;
      anim = mod.default.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop: !reduced,
        autoplay: !reduced,
        animationData: doc,
      });
      // Reduced motion: hold the final frame instead of animating/looping.
      if (reduced && anim) {
        anim.addEventListener("DOMLoaded", () => anim && anim.goToAndStop(doc.op, true));
      }
    });

    return () => {
      // Guard the async import resolving after unmount, then tear down lottie.
      cancelled = true;
      if (anim) anim.destroy();
    };
  }, [doc, reducedMotion]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      style={{ width: "100%", aspectRatio: `${doc.w} / ${doc.h}` }}
    />
  );
}

export default GrammarAnimation;
