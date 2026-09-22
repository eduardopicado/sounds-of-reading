/* A diagnostics screen at #/voices, linked from nowhere.
 *
 * Which voices a device really offers a web page turns out not to match what
 * the documentation says, and guessing from the outside cost several wrong
 * fixes. This prints exactly what speechSynthesis reports — the identifier
 * especially, since that is what the tier is read from — so a screenshot
 * settles it instead of another inference.
 *
 * Not reachable from the app: a child cannot wander into it. */

import { el } from '../lib/dom';
import { go } from '../lib/router';
import { onVoicesChanged, say, voiceReport } from '../lib/speech';

export function mount(root: HTMLElement): () => void {
  const list = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
  const summary = el('p', { class: 'tag' });

  function draw(): void {
    const voices = voiceReport();
    summary.textContent = `${voices.length} English ${voices.length === 1 ? 'voice' : 'voices'} offered to this page.`;
    list.replaceChildren();
    if (!voices.length) {
      list.append(el('p', { class: 'tag', text: 'None. This browser gives the page no English voice at all.' }));
      return;
    }
    for (const v of voices) {
      const row = el('div', { class: 'paper', style: { padding: '10px 12px' } },
        el('div', { style: { fontWeight: '700' }, text: `${v.name} — ${v.lang}` }),
        /* the identifier is the part that matters: the tier is read from it */
        el('div', { style: { fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }, text: v.uri }),
        el('div', { style: { fontSize: '13px' }, text: `read as: ${v.quality} · ${v.local ? 'on device' : 'needs network'}` }),
      );
      const tryIt = el('button', { class: 'btn ghost on-paper small', type: 'button', text: '🔊 Hear it' });
      tryIt.addEventListener('click', () => say('rain, sheep, quick', { voiceURI: v.uri }));
      row.append(tryIt);
      list.append(row);
    }
  }

  draw();
  const stop = onVoicesChanged(draw);

  root.append(el('div', { class: 'wrap' },
    el('div', { class: 'topbar' },
      el('button', {
        class: 'icon-btn', type: 'button', text: '←', 'aria-label': 'Back to the games',
        on: { click: () => go('home') },
      }),
      el('div', { class: 'titles' },
        el('h1', {}, 'Voices ', el('span', { class: 'swash', text: 'here' })),
        el('p', { class: 'tag', text: 'What this device actually offers the app.' })),
      el('span', { class: 'icon-btn', style: { visibility: 'hidden' }, 'aria-hidden': 'true' }),
    ),
    summary,
    list,
    el('p', { class: 'tag', style: { marginTop: '16px' },
      text: 'This is the whole list the browser hands the page. A voice downloaded in Settings only appears here if the browser chooses to offer it, which it does not always do.' }),
  ));

  return stop;
}
