import { altImage } from './objects/altImage';
import { blockContent } from './objects/blockContent';
import { sectionLink } from './objects/sectionLink';
import { seo } from './objects/seo';
import { serviceFeature } from './objects/serviceFeature';

import { aboutIntro } from './blocks/aboutIntro';
import { aboutSplit } from './blocks/aboutSplit';
import { blogIndex } from './blocks/blogIndex';
import { copyWithImage } from './blocks/copyWithImage';
import { errorPanel } from './blocks/errorPanel';
import { emiCalculator } from './blocks/emiCalculator';
import { faqAccordion } from './blocks/faqAccordion';
import { heroCarousel } from './blocks/heroCarousel';
import { leaderProfile } from './blocks/leaderProfile';
import { pageBanner } from './blocks/pageBanner';
import { richTextSection } from './blocks/richTextSection';
import { serviceCardGrid } from './blocks/serviceCardGrid';
import { serviceHighlightRow } from './blocks/serviceHighlightRow';
import { servicesCarousel } from './blocks/servicesCarousel';
import { skillsPanel } from './blocks/skillsPanel';
import { testimonialCarousel } from './blocks/testimonialCarousel';
import { testimonialGrid } from './blocks/testimonialGrid';

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
  // inner-page blocks
  pageBanner,
  aboutIntro,
  copyWithImage,
  skillsPanel,
  serviceCardGrid,
  testimonialGrid,
  blogIndex,
  richTextSection,
  errorPanel,
  // documents
  siteSettings,
  page,
  service,
  post,
  faq,
  testimonial,
  teamMember,
];
