import { defineType } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The embedded map.
 *
 * No content fields on purpose: the location comes from Site Settings, so the
 * address, the map link and this embed cannot disagree. Three copies of an
 * address is how the WordPress site ended up with three different phone
 * numbers.
 *
 * The block exists so the section can be hidden and reordered like any other.
 * To move the pin, change the "Google Maps search text" under Site Settings.
 */
export const mapEmbed = defineType({
  name: 'mapEmbed',
  title: 'Map',
  type: 'object',
  fields: [hiddenField],
  preview: sectionPreview('Map'),
});
