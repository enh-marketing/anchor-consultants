/**
 * Rewrites a Studio URL from one workspace to another.
 *
 * Lives in `src/` rather than in `studio/` for the same reason `slug.ts` does:
 * `npm test` only picks up test files under `src`, and this is logic that
 * fails silently rather than loudly. A wrong result does not throw, it produces a
 * link that goes somewhere plausible and wrong, and only on the deployed
 * Studio, which is the hardest place to notice it.
 *
 * The reason it cannot just be a constant: a workspace `basePath` is the whole
 * path locally (`/content`), but only a suffix on the deployed Studio, which is
 * served under `/@org/studio/<appId>/`. Swapping the segment in place keeps
 * whatever prefix the host uses, so one build works in both.
 */
export function swapBasePath(pathname: string, from: string, to: string): string {
  // `from + '/'` first, so a document id that happens to contain the base path
  // cannot be mistaken for the workspace root. Only then the bare suffix, which
  // is the case where we are sitting at the workspace root with nothing after it.
  const nested = pathname.indexOf(`${from}/`);
  if (nested !== -1) return pathname.slice(0, nested) + to;
  if (pathname.endsWith(from)) return pathname.slice(0, pathname.length - from.length) + to;

  // Nothing matched, so the caller is somewhere unexpected. An absolute path to
  // the target workspace is still a working link on a locally served Studio,
  // and a wrong-but-obvious one elsewhere, which beats returning the current
  // path and appearing to do nothing.
  return to;
}
