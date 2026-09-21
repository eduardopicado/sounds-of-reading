/* Working out which letters carry a sound — and refusing to guess.
 *
 * A spelling that appears twice in a word with no brackets to say which one is
 * meant throws. The content test turns that into a failing build rather than a
 * child seeing "in *the* bath" with the wrong th underlined. */

/** where a grapheme sits inside a word — never computed with indexOf at runtime */
export interface Span { at: number; len: number }

export class ContentError extends Error {}

/* ── parsing ─────────────────────────────────────────────────────────────── */

/** Pulls `[bracketed]` pieces out, returning the plain word and where they were. */
export function unmark(marked: string): { text: string; spans: Span[] } {
  let text = '';
  const spans: Span[] = [];
  let i = 0;
  while (i < marked.length) {
    if (marked[i] === '[') {
      const end = marked.indexOf(']', i);
      if (end < 0) throw new ContentError(`unclosed [ in "${marked}"`);
      const inner = marked.slice(i + 1, end);
      if (!inner) throw new ContentError(`empty [] in "${marked}"`);
      spans.push({ at: text.length, len: inner.length });
      text += inner;
      i = end + 1;
    } else {
      if (marked[i] === ']') throw new ContentError(`stray ] in "${marked}"`);
      text += marked[i];
      i += 1;
    }
  }
  return { text, spans };
}

const isSplit = (spelling: string) => spelling.includes('_');

function occurrences(haystack: string, needle: string): number[] {
  const out: number[] = [];
  for (let i = haystack.toLowerCase().indexOf(needle); i > -1; i = haystack.toLowerCase().indexOf(needle, i + 1)) out.push(i);
  return out;
}

/**
 * Decides which letters carry the sound.
 *
 * Bracketed, we check the brackets really do hold the spelling. Unbracketed,
 * we only accept a spelling that appears exactly once — two occurrences is
 * ambiguous and throws, which is the whole point.
 */
export function resolveSpans(marked: string, spellings: string[], where: string): { text: string; spans: Span[] } {
  const { text, spans } = unmark(marked);

  if (spans.length) {
    const got = spans.map((s) => text.slice(s.at, s.at + s.len).toLowerCase()).join('_');
    const ok = spellings.some((sp) => (isSplit(sp) ? sp : sp) === got || sp === got.replace(/_/g, ''));
    if (!ok) {
      throw new ContentError(
        `${where}: brackets in "${marked}" mark "${got.replace(/_/g, '+')}", which is not one of ${spellings.join(', ')}`,
      );
    }
    return { text, spans };
  }

  const split = spellings.find(isSplit);
  if (split) {
    throw new ContentError(
      `${where}: "${marked}" needs brackets — a split digraph like ${split} is two pieces, write it c[a]k[e]`,
    );
  }

  const hits = spellings.map((sp) => ({ sp, at: occurrences(text, sp) }));
  const once = hits.filter((h) => h.at.length === 1);
  if (once.length === 1) return { text, spans: [{ at: once[0].at[0], len: once[0].sp.length }] };

  const many = hits.find((h) => h.at.length > 1);
  if (many) {
    throw new ContentError(
      `${where}: "${text}" contains "${many.sp}" ${many.at.length} times — bracket the one you mean, e.g. ba[th]`,
    );
  }
  if (once.length > 1) {
    throw new ContentError(`${where}: "${text}" matches more than one spelling (${once.map((o) => o.sp).join(', ')}) — bracket the one you mean`);
  }
  throw new ContentError(`${where}: "${text}" does not contain ${spellings.join(' or ')}`);
}
