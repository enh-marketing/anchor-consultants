import test from 'node:test';
import assert from 'node:assert/strict';
import { swapBasePath } from './studio-workspace.ts';

const FROM = '/content';
const TO = '/submissions';

test('swaps at the workspace root, served locally', () => {
  assert.equal(swapBasePath('/content', FROM, TO), '/submissions');
});

test('swaps from a nested pane, served locally', () => {
  assert.equal(swapBasePath('/content/page;abc123', FROM, TO), '/submissions');
});

test('keeps the host prefix on the deployed Studio', () => {
  assert.equal(
    swapBasePath('/@oDg3W903n/studio/scvm4hhcsyyjl4e2jgho46to/content', FROM, TO),
    '/@oDg3W903n/studio/scvm4hhcsyyjl4e2jgho46to/submissions',
  );
});

test('keeps the host prefix from a nested pane on the deployed Studio', () => {
  assert.equal(
    swapBasePath('/@oDg3W903n/studio/scvm4hhcsyyjl4e2jgho46to/content/page;abc', FROM, TO),
    '/@oDg3W903n/studio/scvm4hhcsyyjl4e2jgho46to/submissions',
  );
});

test('a document id containing the base path does not become the split point', () => {
  // The real workspace root is the first `/content/`, not the one inside the id.
  assert.equal(swapBasePath('/content/page;/content/x', FROM, TO), '/submissions');
});

test('falls back to the target when the base path is absent', () => {
  assert.equal(swapBasePath('/somewhere/else', FROM, TO), '/submissions');
});

test('does not match a longer segment that merely starts with the base path', () => {
  // `/contentious` is a different workspace, not `/content`.
  assert.equal(swapBasePath('/contentious', FROM, TO), '/submissions');
});
