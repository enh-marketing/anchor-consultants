import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Reveal logic, exercised against a hand-rolled DOM.
 *
 * The browser preview used during this rebuild never delivers
 * IntersectionObserver callbacks, so the observer path could not be verified
 * there. These tests stand in for that: they drive both the observer path and
 * the scroll-sweep fallback directly, and assert the one property that
 * matters most — that nothing is ever left invisible.
 */

type Listener = () => void;

class FakeElement {
  classList: {
    _s: Set<string>;
    add: (c: string) => void;
    contains: (c: string) => boolean;
  };
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  private rect: { top: number; bottom: number };

  constructor(top: number, height = 100, revealDelay?: string) {
    const s = new Set<string>();
    this.classList = {
      _s: s,
      add: (c: string) => void s.add(c),
      contains: (c: string) => s.has(c),
    };
    this.rect = { top, bottom: top + height };
    if (revealDelay) this.dataset['revealDelay'] = revealDelay;
  }
  getBoundingClientRect() {
    return this.rect;
  }
  scrollTo(top: number) {
    const h = this.rect.bottom - this.rect.top;
    this.rect = { top, bottom: top + h };
  }
  get revealed() {
    return this.classList.contains('is-revealed');
  }
}

let observers: FakeObserver[] = [];
class FakeObserver {
  cb: (entries: Array<{ target: unknown; isIntersecting: boolean }>) => void;
  observed = new Set<unknown>();
  disconnected = false;
  constructor(cb: FakeObserver['cb']) {
    this.cb = cb;
    observers.push(this);
  }
  observe(el: unknown) {
    this.observed.add(el);
  }
  unobserve(el: unknown) {
    this.observed.delete(el);
  }
  disconnect() {
    this.disconnected = true;
    this.observed.clear();
  }
  /** Simulate the browser delivering an intersection. */
  fire(el: unknown, isIntersecting = true) {
    this.cb([{ target: el, isIntersecting }]);
  }
}

let listeners: Record<string, Listener[]>;
let elements: FakeElement[];

function setup(opts: { reduced?: boolean; withIO?: boolean; viewport?: number } = {}) {
  const { reduced = false, withIO = true, viewport = 1000 } = opts;
  observers = [];
  listeners = {};
  const g = globalThis as Record<string, unknown>;
  g['window'] = {
    innerHeight: viewport,
    matchMedia: () => ({ matches: reduced }),
    addEventListener: (t: string, fn: Listener) => {
      (listeners[t] ??= []).push(fn);
    },
    removeEventListener: (t: string, fn: Listener) => {
      listeners[t] = (listeners[t] ?? []).filter((f) => f !== fn);
    },
    ...(withIO ? { IntersectionObserver: FakeObserver } : {}),
  };
  if (withIO) g['IntersectionObserver'] = FakeObserver;
  else delete g['IntersectionObserver'];
}

function root() {
  return { querySelectorAll: () => elements.filter((e) => !e.revealed) } as unknown as ParentNode;
}

const fire = (type: string) => (listeners[type] ?? []).slice().forEach((f) => f());

describe('reveal', () => {
  let initReveals: (root?: ParentNode) => void;
  let ensureRevealed: (root?: ParentNode) => void;

  beforeEach(async () => {
    setup();
    const mod = await import(`./reveal.ts?t=${Math.random()}`);
    initReveals = mod.initReveals;
    ensureRevealed = mod.ensureRevealed;
  });

  afterEach(() => {
    const g = globalThis as Record<string, unknown>;
    delete g['window'];
    delete g['IntersectionObserver'];
  });

  test('reveals an element already inside the trigger zone on init', () => {
    elements = [new FakeElement(200)];
    initReveals(root());
    assert.equal(elements[0]!.revealed, true);
  });

  test('leaves an element below the trigger zone hidden', () => {
    elements = [new FakeElement(5000)];
    initReveals(root());
    assert.equal(elements[0]!.revealed, false);
  });

  test('the observer path reveals when the browser reports an intersection', () => {
    elements = [new FakeElement(5000)];
    initReveals(root());
    assert.equal(elements[0]!.revealed, false);
    observers[0]!.fire(elements[0]);
    assert.equal(elements[0]!.revealed, true);
  });

  test('a non-intersecting observer entry does not reveal', () => {
    elements = [new FakeElement(5000)];
    initReveals(root());
    observers[0]!.fire(elements[0], false);
    assert.equal(elements[0]!.revealed, false);
  });

  test('the scroll sweep reveals even when the observer never fires', () => {
    elements = [new FakeElement(5000)];
    initReveals(root());
    assert.equal(elements[0]!.revealed, false, 'precondition: still hidden');
    elements[0]!.scrollTo(300); // user scrolls it into view
    fire('scroll');
    assert.equal(elements[0]!.revealed, true);
  });

  test('works with no IntersectionObserver at all', async () => {
    setup({ withIO: false });
    elements = [new FakeElement(5000)];
    const mod = await import(`./reveal.ts?t=${Math.random()}`);
    mod.initReveals(root());
    elements[0]!.scrollTo(100);
    fire('scroll');
    assert.equal(elements[0]!.revealed, true);
  });

  test('reduced motion reveals everything immediately and applies no delay', async () => {
    setup({ reduced: true });
    elements = [new FakeElement(5000, 100, '0.4'), new FakeElement(9000)];
    const mod = await import(`./reveal.ts?t=${Math.random()}`);
    mod.initReveals(root());
    assert.ok(elements.every((e) => e.revealed));
    assert.equal(elements[0]!.style['transitionDelay'], undefined);
  });

  test('applies data-reveal-delay as a transition delay', () => {
    elements = [new FakeElement(200, 100, '0.1')];
    initReveals(root());
    assert.equal(elements[0]!.style['transitionDelay'], '0.1s');
  });

  test('unbinds its listeners once every element is revealed', () => {
    elements = [new FakeElement(200)];
    initReveals(root());
    assert.equal(listeners['scroll']?.length ?? 0, 0);
    assert.equal(observers[0]!.disconnected, true);
  });

  test('keeps listening while anything is still hidden', () => {
    elements = [new FakeElement(200), new FakeElement(5000)];
    initReveals(root());
    assert.equal(listeners['scroll']?.length, 1);
  });

  test('revealing twice is a no-op', () => {
    elements = [new FakeElement(200)];
    initReveals(root());
    const before = elements[0]!.classList._s.size;
    observers.forEach((o) => o.fire(elements[0]));
    assert.equal(elements[0]!.classList._s.size, before);
  });

  test('ensureRevealed shows everything unconditionally', () => {
    elements = [new FakeElement(9000), new FakeElement(20000)];
    ensureRevealed({ querySelectorAll: () => elements } as unknown as ParentNode);
    assert.ok(elements.every((e) => e.revealed));
  });

  test('does nothing, and binds nothing, when there are no targets', () => {
    elements = [];
    initReveals(root());
    assert.equal(observers.length, 0);
    assert.equal(listeners['scroll']?.length ?? 0, 0);
  });
});
