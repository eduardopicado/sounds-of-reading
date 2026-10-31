/* The sorts Sound Sort offers: two spellings of one sound, or a set of
 * sounds taught together. Kept with the content so the content test can
 * check every one still has words that fit exactly one bin. */

export interface SortSet { id: string; label: string; sounds: string[] }

/** contrasts worth offering: two spellings of one sound, or a set taught together */
export const SORT_SETS: SortSet[] = [
  { id: 'ai-ay', label: 'ai vs ay', sounds: ['ai', 'ay'] },
  { id: 'ee-ea', label: 'ee vs ea', sounds: ['ee', 'ea'] },
  { id: 'sh-ch', label: 'sh vs ch', sounds: ['sh', 'ch'] },
  { id: 'th', label: 'th (them) vs th (thin)', sounds: ['th-voiced', 'th-unvoiced'] },
  { id: 'wh-ph', label: 'wh vs ph', sounds: ['wh', 'ph'] },
  { id: 'g-c', label: 'soft g vs soft c', sounds: ['soft-g', 'soft-c'] },
  { id: 'digraphs', label: 'sh · ch · th · wh', sounds: ['sh', 'ch', 'th-unvoiced', 'wh'] },
  { id: 'trickies', label: 'ph · qu · g · c', sounds: ['ph', 'qu', 'soft-g', 'soft-c'] },
  { id: 'long-i', label: 'ie vs igh', sounds: ['ie', 'igh'] },
  { id: 'long-o', label: 'oa vs ow', sounds: ['oa', 'ow-slow'] },
  { id: 'oi-oy', label: 'oi vs oy', sounds: ['oi', 'oy'] },
  { id: 'ou-ow', label: 'ou vs ow (cow)', sounds: ['ou-loud', 'ow-cow'] },
  { id: 'oo', label: 'oo (moon) vs oo (book)', sounds: ['oo-moon', 'oo-book'] },
  { id: 'er-ir-ur', label: 'er · ir · ur', sounds: ['er', 'ir', 'ur'] },
  { id: 'vowel-teams', label: 'ai · ay · ee · ea', sounds: ['ai', 'ay', 'ee', 'ea'] },
  { id: 'l8', label: 'air · are · ear · eer', sounds: ['air', 'are', 'ear', 'eer'] },
  /* levels 9 and 10: the same letters saying another sound, and another
     way to write a sound he knows */
  { id: 'ea-ea', label: 'ea (beach) vs ea (head)', sounds: ['ea', 'ea-head'] },
  { id: 'ie-ie', label: 'ie (pie) vs ie (field)', sounds: ['ie', 'ie-field'] },
  { id: 'ue-ue', label: 'ue (cue) vs ue (blue)', sounds: ['ue-cue', 'ue-blue'] },
  { id: 'long-e', label: 'ee · ea · ey', sounds: ['ee', 'ea', 'ey-key'] },
  { id: 'long-a', label: 'ai · ay · eigh', sounds: ['ai', 'ay', 'eigh'] },
  { id: 'aw-au', label: 'aw vs au', sounds: ['aw', 'au'] },
  { id: 'oa-oe', label: 'oa · ow · oe', sounds: ['oa', 'ow-slow', 'oe'] },
  { id: 'silent', label: 'kn · wr · mb', sounds: ['kn', 'wr', 'mb'] },
  { id: 'ch-ch', label: 'ch (chip) vs ch (school)', sounds: ['ch', 'ch-school'] },
  { id: 'y-vowel', label: 'y (funny) · y (sky) · y (gym)', sounds: ['y-funny', 'y-sky', 'y-gym'] },
  { id: 'a-a', label: 'a (ant) vs a (wasp)', sounds: ['a', 'a-wasp'] },
  { id: 'o-o', label: 'o (dog) vs o (son)', sounds: ['o', 'o-son'] },
];
