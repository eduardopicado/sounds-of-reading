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
];
