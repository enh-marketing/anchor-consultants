import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: 'ld89i91d',
    dataset: 'production',
  },
  /**
   * TypeGen reads the queries the site actually runs and writes types next to
   * the site's own source, so a schema change that breaks a query shows up as
   * a type error rather than at runtime.
   */
  graphql: [],
});
