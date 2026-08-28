import { gsap } from 'gsap';

/**
 * GSAP entry point.
 *
 * Loaded only by the components that genuinely need a tween engine: the hero
 * crossfade, the services and testimonial carousels, and the FAQ accordion.
 * In practice that is the homepage only.
 *
 * Scroll reveals and the skill bars used to live here, which pulled GSAP and
 * ScrollTrigger onto all fourteen pages to run a fade and a width change.
 * Both are now plain CSS transitions driven by an IntersectionObserver in
 * `lib/reveal.ts`, and ScrollTrigger is no longer imported at all — nothing
 * left needs scroll-linked tweening.
 */

/** Re-exported so callers do not need a second import for the media query. */
export { prefersReducedMotion } from './reveal';

export { gsap };
