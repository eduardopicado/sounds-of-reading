/* Drawing a word with its sound marked.
 *
 * The rule from the brief, learned the hard way: colour identifies a sound, it
 * never carries text. Sentence Smash first shipped with mustard and mint
 * letters on cream and was unreadable. So the letters stay dark ink and the
 * sound colour becomes a thick underline plus a translucent wash behind them.
 *
 * Positions come from the content file. Nothing here searches the word. */

import { el } from './dom';
import type { Span } from '../content/index';
import type { Tones } from './colour';

export interface MarkOptions {
  /** false draws the word plainly — the puzzle in Sound Sort and Real or Silly
   *  is working out where the sound is, so it must be hidden until answered */
  show?: boolean;
  tones?: Tones;
}

export function marked(text: string, spans: Span[], options: MarkOptions = {}): DocumentFragment {
  const frag = document.createDocumentFragment();
  const { show = true, tones } = options;
  if (!show || !spans.length || !tones) {
    frag.append(document.createTextNode(text));
    return frag;
  }
  const ordered = [...spans].sort((a, b) => a.at - b.at);
  let cursor = 0;
  for (const span of ordered) {
    if (span.at > cursor) frag.append(document.createTextNode(text.slice(cursor, span.at)));
    frag.append(el('b', {
      class: 'gr',
      text: text.slice(span.at, span.at + span.len),
      vars: { '--deep': tones.deep, '--wash': tones.wash },
    }));
    cursor = span.at + span.len;
  }
  if (cursor < text.length) frag.append(document.createTextNode(text.slice(cursor)));
  return frag;
}

/** replaces a node's contents with the marked-up word */
export function setMarked(node: Element, text: string, spans: Span[], options: MarkOptions = {}): void {
  node.replaceChildren(marked(text, spans, options));
}
