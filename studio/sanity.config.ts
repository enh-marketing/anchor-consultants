import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes, submissionSchemaTypes } from './schemaTypes';
import { structure } from './structure';
import { documentActions } from './previewAction';

/**
 * Two workspaces, because there are two datasets.
 *
 * `production` holds the content and is public-read: that is what lets the static
 * build fetch pages without a credential, and it is fine for content that is
 * published anyway.
 *
 * `submissions` holds form enquiries and is private. They carry names, emails and
 * phone numbers, and the project id is on a public repository, so anything in a
 * public dataset is readable by anyone (defect #29). Reading this dataset
 * requires a token, which is what the separation buys.
 *
 * The split is also why `submission` is not in the content workspace's schema:
 * the content Studio should not be able to create one by hand, because a
 * submission is a record of what somebody sent rather than something anyone
 * authors.
 */
export default defineConfig([
  {
    name: 'content',
    title: 'Anchor Consultants',
    // Both workspaces need the same number of path segments, so content lives
    // at /content rather than at the root.
    basePath: '/content',

    projectId: 'ld89i91d',
    dataset: 'production',

    plugins: [structureTool({ structure }), visionTool()],

    document: {
      actions: documentActions,
    },

    schema: {
      types: schemaTypes,
      /**
       * Site Settings is a singleton edited through the structure, so it must
       * not appear in the "create new document" menu.
       */
      templates: (prev) => prev.filter((t) => t.schemaType !== 'siteSettings'),
    },
  },
  {
    name: 'submissions',
    title: 'Form submissions',
    basePath: '/submissions',

    projectId: 'ld89i91d',
    dataset: 'submissions',

    plugins: [structureTool()],

    schema: {
      types: submissionSchemaTypes,
      // Nothing is authored here. Submissions arrive from the form endpoint, and
      // every field on the document is read-only.
      templates: () => [],
    },
  },
]);
