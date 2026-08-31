import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: 'ld89i91d',
    dataset: 'production',
  },

  /**
   * Where `sanity deploy` publishes the Studio: `anchor-consultants.sanity.studio`.
   *
   * Recorded here rather than answered at a prompt, so a redeploy from another
   * machine cannot quietly claim a different hostname and leave two Studios
   * pointing at the same content.
   *
   * The two workspaces sit under it: `/content` for the site, `/submissions` for
   * form enquiries, which are in a separate private dataset.
   */
  studioHost: 'anchor-consultants',

  /**
   * Pinned so a deploy never prompts for it. Without this, a deploy from another
   * machine can create a second application pointing at the same content.
   */
  deployment: {
    appId: 'scvm4hhcsyyjl4e2jgho46to',
  },
  /**
   * TypeGen reads the queries the site actually runs and writes types next to
   * the site's own source, so a schema change that breaks a query shows up as
   * a type error rather than at runtime.
   */
  graphql: [],
});
