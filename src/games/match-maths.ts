/* Match Maths — adding up a jiu-jitsu match.
 *
 * His idea: takedown + mount = 2 + 4 = 6. A match plays out move by move on
 * a strip of cards, and he works out the score. First with the points written
 * on the cards, then remembering them (Ref's Call teaches them), then three
 * moves. Year 1 also compares (Blue 6, White 4: how far ahead?) and works
 * backwards (Blue had 2, now has 6: which move was it?).
 *
 * Year 2 adds up a whole match with both fighters scoring, and settles a draw
 * the IBJJF way: level on points, the advantages decide; level on those too,
 * fewer penalties wins.
 *
 * Bilingual like Ref's Call: the flags switch every word and the voice. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { shuffle } from '../lib/random';
import {
  MATCH_STEPS, MOVES, SIDE_NAME, matchQuestion, missingOptions, pointsOf, refCall,
  type Both, type Lang, type MatchQuestion, type MatchStep, type Move, type Side,
} from '../content/bjj';
import { mountMaths, type Kit } from './maths-kit';
import { movePicture, BELTS } from './bjj-art';
import { beltSelect, blueGi, langSwitch, speak } from './bjj-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<MatchStep>({
    id: 'match-maths',
    title: 'Match',
    swash: 'Maths',
    tagline: 'Takedown and mount: 2 + 4 = 6. Add up the jiu-jitsu match.',
    steps: MATCH_STEPS,
    face: '🏅',
    build,
  }, root);
}

const WHITE_GI = { gi: '#FBFAF6', belt: BELTS.white };

/** "a takedown, a sweep and then a mount" / "uma queda, uma raspagem e depois uma montada" */
function listOf(moves: Move[], lang: Lang): string {
  /* the same move again is "another takedown", "outra queda" */
  const words = moves.map((m, i) => {
    const again = i > 0 && moves[i - 1].id === m.id;
    if (lang === 'pt') return `${again ? (m.um === 'um' ? 'outro' : 'outra') : m.um} ${m.name.pt}`;
    return `${again ? 'another' : 'a'} ${m.name.en}`;
  });
  if (words.length === 1) return words[0];
  const then = lang === 'pt' ? ' e depois ' : ', then ';
  return `${words.slice(0, -1).join(', ')}${then}${words.at(-1)}`;
}

/** "2 + 4 = 6" */
const sumOf = (moves: Move[]): string => `${moves.map((m) => m.points).join(' + ')} = ${pointsOf(moves)}`;

function build(kit: Kit) {
  const langs = langSwitch();
  const belt = beltSelect();
  const ask = el('p', { class: 'mx-ask' });
  const story = el('p', { class: 'bj-story' });
  const scoreboard = el('div', { class: 'bj-scoreboard' });
  const strip = el('div', { class: 'bj-strip' });
  const sum = el('p', { class: 'mx-sum' });
  const node = el('div', { class: 'mx-stage' }, langs.node, story, strip, scoreboard, sum, ask);
  let last: MatchQuestion | undefined;
  let retext: () => void = () => undefined;
  langs.onChange(() => { retext(); });
  const lang = (): Lang => langs.lang();
  const side = (s: Side): string => SIDE_NAME[s][lang()];

  /** a move on the strip: whose it is, its picture, its name, its points or a ? */
  function card(move: Move | null, who: Side, points: 'shown' | 'hidden' | 'unknown'): HTMLElement {
    const c = el('div', { class: `bj-step ${who.toLowerCase()}`, dataset: { move: move?.id ?? '' } });
    if (move) c.append(movePicture(move, who === 'Blue' ? blueGi(belt) : WHITE_GI, who === 'Blue' ? WHITE_GI : blueGi(belt)), el('span', { class: 'bj-step-name' }));
    else c.append(el('span', { class: 'bj-step-mystery', text: '?' }));
    c.append(el('span', { class: 'bj-step-points', text: points === 'shown' && move ? `+${move.points}` : '?' }));
    return c;
  }

  /** reveal the points on every card */
  const reveal = (): void => strip.querySelectorAll<HTMLElement>('.bj-step').forEach((c) => {
    const m = MOVES.find((x) => x.id === c.dataset.move);
    if (m) c.querySelector('.bj-step-points')!.textContent = `+${m.points}`;
  });

  /** names on the cards in the chosen language */
  const nameCards = (): void => strip.querySelectorAll<HTMLElement>('.bj-step').forEach((c) => {
    const m = MOVES.find((x) => x.id === c.dataset.move);
    const n = c.querySelector('.bj-step-name');
    if (m && n) n.textContent = m.name[lang()];
  });

  /** the scoreboard: points (or ?), advantages and penalties, IBJJF style */
  function board(q: MatchQuestion, points: { Blue: number | '?'; White: number | '?' }, extras = false): void {
    scoreboard.replaceChildren(...(['Blue', 'White'] as Side[]).map((s) =>
      el('div', { class: `bj-score-row ${s.toLowerCase()}`, dataset: { side: s } },
        el('span', { class: 'bj-score-name' }),
        el('span', { class: 'bj-score-points', text: String(points[s]) }),
        extras ? el('span', { class: 'bj-score-extra adv', text: String(q.advantages[s]) }) : '',
        extras ? el('span', { class: 'bj-score-extra pen', text: String(q.penalties[s]) }) : '')));
    if (extras) {
      scoreboard.prepend(el('div', { class: 'bj-score-row head' }, el('span', {}), el('span', { class: 'bj-score-head pts' }),
        el('span', { class: 'bj-score-head adv' }), el('span', { class: 'bj-score-head pen' })));
    }
  }
  const nameBoard = (): void => {
    scoreboard.querySelectorAll<HTMLElement>('.bj-score-row[data-side]').forEach((r) => {
      r.querySelector('.bj-score-name')!.textContent = side(r.dataset.side as Side);
    });
    const heads: Both[] = [{ en: 'Points', pt: 'Pontos' }, { en: 'Adv.', pt: 'Vant.' }, { en: 'Pen.', pt: 'Pun.' }];
    scoreboard.querySelectorAll('.bj-score-head').forEach((h, i) => { h.textContent = heads[i][lang()]; });
  };

  async function finish(ok: boolean, how: Both): Promise<boolean> {
    if (ok) sfx.cheer(); else sfx.wrong();
    const show = (): void => kit.note(`${ok ? (lang() === 'pt' ? 'Isso! ' : 'Yes! ') : ''}${how[lang()]}`, ok);
    show();
    retext = () => { nameCards(); nameBoard(); show(); };
    speak(how, lang());
    await kit.wait(ok ? 2800 : 4000);
    return ok;
  }

  async function total(step: MatchStep, q: MatchQuestion): Promise<boolean> {
    const asked = q.side === 'Blue' ? q.blue : q.white;
    if (step.both) {
      /* the whole match, both fighters' moves in the order they happened */
      const order = shuffle([...q.blue.map((m) => ({ m, s: 'Blue' as Side })), ...q.white.map((m) => ({ m, s: 'White' as Side }))]);
      strip.replaceChildren(...order.map(({ m, s }) => card(m, s, 'hidden')));
      board(q, { Blue: '?', White: '?' });
    } else {
      strip.replaceChildren(...q.blue.map((m) => card(m, 'Blue', step.shown ? 'shown' : 'hidden')));
      board(q, { Blue: '?', White: 0 });
    }
    const words = (l: Lang): string => step.both
      ? (l === 'pt' ? `Essa foi a luta. Quantos pontos o ${SIDE_NAME[q.side].pt} fez?` : `That was the match. How many points did ${q.side} score?`)
      : (l === 'pt' ? `O Azul faz ${listOf(q.blue, 'pt')}. Quantos pontos o Azul tem?` : `Blue scores ${listOf(q.blue, 'en')}. How many points has Blue got?`);
    retext = () => { story.textContent = words(lang()); nameCards(); nameBoard(); };
    retext();
    sum.textContent = `${asked.map(() => '?').join(' + ')} = ?`;
    speak({ en: words('en'), pt: words('pt') }, lang());
    const picked = await kit.choices.ask(q.options as number[]);
    kit.choices.reveal(q.answer as number, picked);
    reveal();
    sum.textContent = sumOf(asked);
    board(q, { Blue: pointsOf(q.blue), White: pointsOf(q.white) });
    nameBoard();
    const calls = (l: Lang): string => asked.map((m) => refCall(m, l)).join(' ');
    return finish(picked === q.answer, {
      en: `${calls('en')} ${asked.map((m) => m.points).join(' and ')} make ${q.answer}.`,
      pt: `${calls('pt')} ${asked.map((m) => m.points).join(' mais ')} são ${q.answer}.`,
    });
  }

  async function ahead(q: MatchQuestion): Promise<boolean> {
    const order = [...q.blue.map((m) => card(m, 'Blue', 'shown')), ...q.white.map((m) => card(m, 'White', 'shown'))];
    strip.replaceChildren(...order);
    const blue = pointsOf(q.blue);
    const white = pointsOf(q.white);
    board(q, { Blue: blue, White: white });
    const leader: Side = blue > white ? 'Blue' : 'White';
    const words = (l: Lang): string => (l === 'pt'
      ? `O ${SIDE_NAME[leader].pt} está ganhando. Por quantos pontos?`
      : `${leader} is winning. By how many points?`);
    retext = () => { story.textContent = words(lang()); nameCards(); nameBoard(); };
    retext();
    const [hi, lo] = [Math.max(blue, white), Math.min(blue, white)];
    sum.textContent = `${hi} − ${lo} = ?`;
    speak({ en: words('en'), pt: words('pt') }, lang());
    const picked = await kit.choices.ask(q.options as number[]);
    kit.choices.reveal(q.answer as number, picked);
    sum.textContent = `${hi} − ${lo} = ${q.answer}`;
    return finish(picked === q.answer, {
      en: `${hi} take away ${lo} is ${q.answer}. ${leader} is ${q.answer} ahead.`,
      pt: `${hi} menos ${lo} são ${q.answer}. O ${SIDE_NAME[leader].pt} está ${q.answer} na frente.`,
    });
  }

  async function missing(q: MatchQuestion): Promise<boolean> {
    const [first, second] = q.blue;
    strip.replaceChildren(card(first, 'Blue', 'shown'), card(null, 'Blue', 'unknown'));
    const before = first.points;
    const after = pointsOf(q.blue);
    board(q, { Blue: after, White: 0 });
    const words = (l: Lang): string => (l === 'pt'
      ? `O Azul tinha ${before} pontos e pontuou de novo. Agora tem ${after}. Qual foi o golpe?`
      : `Blue had ${before} points, then scored again. Now Blue has ${after}. Which move was it?`);
    sum.textContent = `${before} + ? = ${after}`;
    const options = missingOptions(second);
    const label = (id: string): string => MOVES.find((m) => m.id === id)!.name[lang()];
    retext = () => { story.textContent = words(lang()); nameCards(); nameBoard(); kit.choices.relabel(label); };
    speak({ en: words('en'), pt: words('pt') }, lang());
    const chosen = kit.choices.askWords(options.map((m) => m.id), label);
    retext();
    const picked = await chosen;
    kit.choices.revealWord(second.id, picked);
    strip.replaceChildren(card(first, 'Blue', 'shown'), card(second, 'Blue', 'shown'));
    nameCards();
    sum.textContent = `${before} + ${second.points} = ${after}`;
    const pickedMove = MOVES.find((m) => m.id === picked)!;
    /* any move worth the same points is right: the score cannot tell them apart */
    const ok = pickedMove.points === second.points;
    return finish(ok, {
      en: `${before} and ${second.points} make ${after}: a move worth ${second.points}, like a ${second.name.en}.`,
      pt: `${before} mais ${second.points} são ${after}: um golpe de ${second.points} pontos, como ${second.um} ${second.name.pt}.`,
    });
  }

  async function tiebreak(q: MatchQuestion): Promise<boolean> {
    strip.replaceChildren(...q.blue.map((m) => card(m, 'Blue', 'shown')), ...q.white.map((m) => card(m, 'White', 'shown')));
    const pts = pointsOf(q.blue);
    board(q, { Blue: pts, White: pts }, true);
    const words = (l: Lang): string => (l === 'pt' ? 'Os pontos estão iguais. Quem ganha?' : 'The points are the same. Who wins?');
    sum.textContent = `${pts} = ${pts}`;
    const label = (s: string): string => SIDE_NAME[s as Side][lang()];
    retext = () => { story.textContent = words(lang()); nameCards(); nameBoard(); kit.choices.relabel(label); };
    speak({ en: words('en'), pt: words('pt') }, lang());
    const chosen = kit.choices.askWords(['Blue', 'White'], label);
    retext();
    const picked = await chosen;
    const winner = q.answer as Side;
    kit.choices.revealWord(winner, picked);
    const a = q.advantages;
    const p = q.penalties;
    const how: Both = a.Blue !== a.White
      ? {
        en: `Same points, so the advantages decide: Blue has ${a.Blue}, White has ${a.White}. ${winner} wins!`,
        pt: `Mesmos pontos, então as vantagens decidem: o Azul tem ${a.Blue}, o Branco tem ${a.White}. O ${SIDE_NAME[winner].pt} ganha!`,
      }
      : {
        en: `Same points and advantages, so fewer penalties wins: Blue has ${p.Blue}, White has ${p.White}. ${winner} wins!`,
        pt: `Mesmos pontos e vantagens, então ganha quem tem menos punições: o Azul tem ${p.Blue}, o Branco tem ${p.White}. O ${SIDE_NAME[winner].pt} ganha!`,
      };
    return finish(picked === winner, how);
  }

  return {
    node,
    setup: belt,
    ask: async (step: MatchStep): Promise<boolean> => {
      const q = matchQuestion(step, last);
      last = q;
      sum.textContent = '';
      story.dataset.answer = step.task === 'missing' ? String(q.blue[1].points) : String(q.answer);
      if (step.task === 'ahead') return ahead(q);
      if (step.task === 'missing') return missing(q);
      if (step.task === 'tiebreak') return tiebreak(q);
      return total(step, q);
    },
  };
}
