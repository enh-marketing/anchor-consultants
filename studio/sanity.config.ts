import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';
import { structure } from './structure';
import { documentActions } from './previewAction';

export default defineConfig({
  name: 'anchor',
  title: 'Anchor Consultants',

  projectId: 'ld89i91d',
  dataset: 'production',

  plugins: [structureTool({ structure }), visionTool()],

  document: {
    actions: documentActions,
  },

  schema: {
    types: schemaTypes,
    /**
     * Site Settings is a singleton edited through the structure below, so it
     * must not appear in the "create new document" menu.
     */
    templates: (prev) => prev.filter((t) => t.schemaType !== 'siteSettings'),
  },
});
