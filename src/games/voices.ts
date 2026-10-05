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
import { currentVoice, onVoicesChanged, say, voiceReport, voicesFor } from '../lib/speech';

/* English for the games, Portuguese for the football commentator: the two
   come from different voices, and can sound nothing alike */
const LANGS = [
  { lang: 'en', label: 'English', sample: 'rain, sheep, quick', chosen: () => currentVoice()?.voiceURI },
  { lang: 'pt', label: 'Portuguese', sample: 'Goooool do Brasil!', chosen: () => voicesFor('pt-BR')[0]?.voiceURI },
];

export function mount(root: HTMLElement): () => void {
  const list = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });

  function draw(): void {
    list.replaceChildren();
    for (const { lang, label, sample, chosen } of LANGS) {
      const voices = voiceReport(lang);
      const using = chosen();
      list.append(el('h2', { class: 'tiles-head', text: label }),
        el('p', { class: 'tag', text: `${voices.length} ${label} ${voices.length === 1 ? 'voice' : 'voices'} offered to this page.` }));
      if (!voices.length) {
        list.append(el('p', { class: 'tag', text: `None. This browser gives the page no ${label} voice at all.` }));
        continue;
      }
      for (const v of voices) {
        const row = el('div', { class: 'paper', style: { padding: '10px 12px' } },
          el('div', { style: { fontWeight: '700' }, text: `${v.name} — ${v.lang}${v.uri === using ? '  ✓ the app uses this one' : ''}` }),
          /* the identifier is the part that matters: the tier is read from it */
          el('div', { style: { fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }, text: v.uri }),
          el('div', { style: { fontSize: '13px' }, text: `read as: ${v.quality} · ${v.local ? 'on device' : 'needs network'}` }),
        );
        if (v.uri === using) row.dataset.using = '1';
        const tryIt = el('button', { class: 'btn ghost on-paper small', type: 'button', text: '🔊 Hear it' });
        tryIt.addEventListener('click', () => say(sample, { voiceURI: v.uri }));
        row.append(tryIt);
        list.append(row);
      }
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
    list,
    el('p', { class: 'tag', style: { marginTop: '16px' },
      text: 'This is the whole list the browser hands the page. A voice downloaded in Settings only appears here if the browser chooses to offer it, which it does not always do.' }),
  ));

  return stop;
}
