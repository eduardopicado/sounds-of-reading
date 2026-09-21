/* A quick count of what the content file holds, for sanity after an edit. */
import { REAL_WORDS, SILLY_WORDS, ALL_PHRASES, ALL_FAMILIES, PRACTICE_SOUNDS, picturable } from '../src/content/index';

const byLevel: Record<number, number> = {};
for (const w of REAL_WORDS) byLevel[w.level] = (byLevel[w.level] ?? 0) + 1;
console.log('practice sounds', PRACTICE_SOUNDS.length);
console.log('real words', REAL_WORDS.length, '(with a picture:', picturable(REAL_WORDS).length + ')');
console.log('silly words', SILLY_WORDS.length);
console.log('families', ALL_FAMILIES.length, ' phrases', ALL_PHRASES.length);
console.log('real words per level', byLevel);
