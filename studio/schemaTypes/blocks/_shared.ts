import { defineField } from 'sanity';

/**
 * Shared pieces of every section block.
 *
 * A block models content and nothing else. There is no colour, font size,
 * margin or spacing field anywhere in this directory, because the section
 * components own their layout and were measured against the original site.
 * Where a section genuinely varies, it varies by a named variant that the
 * component translates into its own classes.
 */

/** The section visibility toggle. Read by `SectionRenderer`, not by components. */
export const hiddenField = defineField({
  name: 'hidden',
  title: 'Hide this section',
  type: 'boolean',
  description: 'Keeps the section in the page but stops it rendering. Nothing is lost.',
  initialValue: false,
});

/**
 * Builds a preview that names the section and flags a hidden one, so the page's
 * section list reads as a page outline rather than a column of type names.
 *
 * `select` always has the same two keys so the config has one concrete type.
 * Blocks with no single heading (the hero carousel, the highlight row) point
 * `heading` at a field they do not have, and Sanity returns undefined for it,
 * which `prepare` already handles.
 */
export const sectionPreview = (label: string, titleField = 'noHeadingField') => ({
  select: { heading: titleField, hidden: 'hidden' },
  prepare(value: Record<'heading' | 'hidden', unknown>) {
    const heading = typeof value['heading'] === 'string' ? value['heading'] : undefined;
    // `subtitle` is spread in rather than set to undefined: the Studio's
    // PreviewValue has it as an optional property, and this repo builds with
    // `exactOptionalPropertyTypes`, so an explicit undefined is a type error.
    return {
      title: heading ? `${label}: ${heading}` : label,
      ...(value['hidden'] ? { subtitle: 'Hidden' } : {}),
    };
  },
});
