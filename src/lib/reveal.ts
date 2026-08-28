/**
 * Scroll reveals.
 *
 * Deliberately dependency-free. The effect is a 30px rise and a fade, which a
 * CSS transition does natively, so this only has to decide *when* to add a
 * class. Routing it through GSAP + ScrollTrigger meant all fourteen pages
 * downloaded 112 KB (43 KB gzipped) to fade a heading in. GSAP now loads only
 * on the homepage, for the hero, the carousels and the accordion.
 *
 * Two independent paths add the class, because content must never be lost:
 *
 *   1. An IntersectionObserver, which is the cheap, correct primary.
 *   2. A scroll/resize/load sweep, which does the same viewport test by hand.
 *
 * The second exists because IntersectionObserver callbacks are delivered
 * during the browser's rendering steps, so a throttled or non-rendering tab
 * can defer them indefinitely — the same class of problem that made
 * ScrollTrigger unreliable. Revealing twice is a no-op, so the two paths
 * cannot conflict, and the sweep unbinds itself once everything is shown.
 *
 * Degradation is unchanged: the base state is visible, and `.reveal` only
 * hides an element once the document carries the `js` class, which BaseLayout
 * sets before first paint. If this module never loads, everything is readable.
 */

/** True when the visitor has asked for reduced motion. */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const REVEALED = 'is-revealed';

/** Fraction of the viewport an element must rise past before it reveals. */
const TRIGGER_RATIO = 0.88;

function reveal(el: HTMLElement, withDelay: boolean) {
  if (el.classList.contains(REVEALED)) return;
  const delay = withDelay ? el.dataset['revealDelay'] : undefined;
  if (delay) el.style.transitionDelay = `${Number(delay)}s`;
  el.classList.add(REVEALED);
}

/** Is any part of the element above the trigger line and not yet scrolled past? */
function inTriggerZone(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight * TRIGGER_RATIO && r.bottom > 0;
}

/**
 * Run `onEnter` once for each element, when it first rises past the trigger
 * line. Shared by the scroll reveals and the skill bars so both get the
 * observer *and* the sweep fallback rather than one having a weaker copy.
 */
export function onEnterViewport(targets: HTMLElement[], onEnter: (el: HTMLElement) => void) {
  if (!targets.length) return;

  const remaining = new Set(targets);

  const enter = (el: HTMLElement) => {
    if (!remaining.delete(el)) return;
    observer?.unobserve(el);
    onEnter(el);
  };

  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) enter(entry.target as HTMLElement);
            }
            if (!remaining.size) stop();
          },
          // Equivalent to the previous ScrollTrigger start of "top 88%".
          { rootMargin: `0px 0px -${Math.round((1 - TRIGGER_RATIO) * 100)}% 0px`, threshold: 0 },
        )
      : null;

  const sweep = () => {
    for (const el of [...remaining]) if (inTriggerZone(el)) enter(el);
    if (!remaining.size) stop();
  };

  function stop() {
    window.removeEventListener('scroll', sweep);
    window.removeEventListener('resize', sweep);
    window.removeEventListener('load', sweep);
    observer?.disconnect();
  }

  targets.forEach((el) => observer?.observe(el));
  window.addEventListener('scroll', sweep, { passive: true });
  window.addEventListener('resize', sweep, { passive: true });
  window.addEventListener('load', sweep);
  sweep();
}

export function initReveals(root: ParentNode = document) {
  const targets = [...root.querySelectorAll<HTMLElement>(`.reveal:not(.${REVEALED})`)];
  if (!targets.length) return;

  // Reduced motion: show everything at once, with no transition and no delay.
  if (prefersReducedMotion()) {
    targets.forEach((el) => reveal(el, false));
    return;
  }

  onEnterViewport(targets, (el) => reveal(el, true));
}

/**
 * Last-resort safety net: make sure nothing is left permanently invisible.
 * Called from the layout's catch block.
 */
export function ensureRevealed(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    el.style.transitionDelay = '';
    el.classList.add(REVEALED);
  });
}
