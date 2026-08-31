import { altImage } from './objects/altImage';
import { blockContent } from './objects/blockContent';
import { seo } from './objects/seo';
import { serviceFeature } from './objects/serviceFeature';

import { faq } from './documents/faq';
import { post } from './documents/post';
import { service } from './documents/service';
import { siteSettings } from './documents/siteSettings';
import { teamMember } from './documents/teamMember';
import { testimonial } from './documents/testimonial';

export const schemaTypes = [
  // objects
  altImage,
  blockContent,
  seo,
  serviceFeature,
  // documents
  siteSettings,
  service,
  post,
  faq,
  testimonial,
  teamMember,
];
