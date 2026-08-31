import { altImage } from './objects/altImage';
import { blockContent } from './objects/blockContent';
import { sectionLink } from './objects/sectionLink';
import { seo } from './objects/seo';
import { serviceFeature } from './objects/serviceFeature';

import { aboutSplit } from './blocks/aboutSplit';
import { emiCalculator } from './blocks/emiCalculator';
import { faqAccordion } from './blocks/faqAccordion';
import { heroCarousel } from './blocks/heroCarousel';
import { leaderProfile } from './blocks/leaderProfile';
import { serviceHighlightRow } from './blocks/serviceHighlightRow';
import { servicesCarousel } from './blocks/servicesCarousel';
import { testimonialCarousel } from './blocks/testimonialCarousel';

import { faq } from './documents/faq';
import { page } from './documents/page';
import { post } from './documents/post';
import { service } from './documents/service';
import { siteSettings } from './documents/siteSettings';
import { teamMember } from './documents/teamMember';
import { testimonial } from './documents/testimonial';

export const schemaTypes = [
  // objects
  altImage,
  blockContent,
  sectionLink,
  seo,
  serviceFeature,
  // section blocks — each maps to one component in src/components/sections/
  heroCarousel,
  serviceHighlightRow,
  aboutSplit,
  servicesCarousel,
  emiCalculator,
  leaderProfile,
  faqAccordion,
  testimonialCarousel,
  // documents
  siteSettings,
  page,
  service,
  post,
  faq,
  testimonial,
  teamMember,
];
