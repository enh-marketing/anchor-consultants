import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** True when the visitor has asked for reduced motion. */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Reveal elements on scroll.
 *
 * The base state is visible; `.reveal` only hides an element once the
 * document has the `js` class (set in BaseLayout before first paint). So if
 * this module fails to load, content is still readable — the failure mode the
 * WordPress build gets wrong, where animated content stays invisible forever.
 */
export function initReveals(root: ParentNode = document) {
  const targets = [...root.querySelectorAll<HTMLElement>('.reveal')];
  if (!targets.length) return;

  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 1, y: 0, clearProps: 'transform' });
    return;
  }

  targets.forEach((el) => {
    const delay = Number(el.dataset['revealDelay'] ?? 0);
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      delay,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  /**
   * Safety net. ScrollTrigger depends on requestAnimationFrame, which browsers
   * throttle in background tabs. If a trigger never fires, anything already
   * scrolled into view would sit at opacity 0 indefinitely. After a short
   * grace period, force-show anything at or above the fold that is still
   * hidden. Elements further down keep their animation.
   */
  window.setTimeout(() => {
    targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      const inOrAboveView = r.top < window.innerHeight;
      if (inOrAboveView && Number(getComputedStyle(el).opacity) < 0.99) {
        gsap.set(el, { opacity: 1, y: 0 });
      }
    });
  }, 3000);
}

/**
 * Safety net: if anything above throws, or ScrollTrigger never fires, make
 * sure nothing is left permanently invisible.
 */
export function ensureRevealed(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}

export { gsap, ScrollTrigger };
