import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeSlug } from './slug.ts';

const ok = (value: unknown) => isSafeSlug(value) === true;

test('accepts ordinary slugs', () => {
  assert.ok(ok('about'));
  assert.ok(ok('first-time-buyers'));
  assert.ok(ok('guides/first-time-buyers'));
  assert.ok(ok('lease-rental-discounting'));
  assert.ok(ok('2026-outlook'));
});

test('accepts the home page slug', () => {
  assert.ok(ok('/'));
});

test('accepts the path form page documents actually use', () => {
  // Verified against the live dataset: page slugs are stored like this, and a
  // rule that rejected them would have made every existing page invalid.
  for (const slug of ['/about/', '/services/', '/testimonials/', '/blog/', '/404/']) {
    assert.ok(ok(slug), `should accept ${slug}`);
  }
});

test('accepts the bare form every other type uses', () => {
  for (const slug of ['mortgage-solutions', 'commercial-finances', 'hello-world']) {
    assert.ok(ok(slug), `should accept ${slug}`);
  }
});

test('rejects regex metacharacters, which is the point of the rule', () => {
  for (const bad of ['a(b', 'a)b', 'a*', 'a+', 'a?b', 'a[b]', 'a{2}', 'a|b', 'a\\b', 'a.b', 'a$']) {
    assert.equal(ok(bad), false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('rejects the patterns that make path-to-regexp backtrack', () => {
  // Nested quantifiers are the shape the advisory is about.
  assert.equal(ok('(a+)+'), false);
  assert.equal(ok('(a|aa)*'), false);
});

test('rejects doubled separators and a hyphen at an edge', () => {
  for (const bad of ['a--b', 'a//b', '-a', 'a-', '/-a/', '/a-/']) {
    assert.equal(ok(bad), false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('rejects an empty slug once the slashes come off', () => {
  // isSafeSlug returns the message, not false, so assert on it directly
  // rather than through the boolean helper.
  assert.equal(isSafeSlug('//'), 'Enter a slug.');
  assert.equal(isSafeSlug(''), 'Enter a slug.');
});

test('rejects upper case, spaces and other unsafe characters', () => {
  for (const bad of ['About', 'a b', 'a_b', 'café', 'a%20b', '../etc', '<script>']) {
    assert.equal(ok(bad), false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('ignores non-strings, leaving required() to handle an empty slug', () => {
  assert.ok(ok(undefined));
  assert.ok(ok(null));
});
