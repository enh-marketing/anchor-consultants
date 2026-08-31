import { altImage } from './objects/altImage';
import { blockContent } from './objects/blockContent';
import { captionedImage } from './objects/captionedImage';
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

import { author } from './documents/author';
import { category } from './documents/category';
import { faq } from './documents/faq';
import { form } from './documents/form';
import { page } from './documents/page';
import { post } from './documents/post';
import { redirect } from './documents/redirect';
import { service } from './documents/service';
import { siteSettings } from './documents/siteSettings';
import { submission } from './documents/submission';
import { tag } from './documents/tag';
import { teamMember } from './documents/teamMember';
import { testimonial } from './documents/testimonial';

export const schemaTypes = [
  // objects
  altImage,
  blockContent,
  captionedImage,
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
  author,
  category,
  tag,
  faq,
  form,
  submission,
  redirect,
  testimonial,
  teamMember,
];
