/* Training Drills — equal groups, sharing, and rows of cones.
 *
 * Training is set out in equal groups: hoops with the same number of balls
 * in each, balls shared fairly between the hoops, cones in rows. "3 hoops
 * with 4 in each" is the start of multiplying, and sharing 12 balls between
 * 3 hoops is the start of dividing — Year 1's equal groups and sharing.
 *
 * Year 2 sets the cones out in rows and columns (an array, 4 rows of 3),
 * counts teams of 2, 5 and 10 players, and puts a pile of cones into rows of
 * so many to find how many rows: grouping, the other half of dividing.
 *
 * Years 3–4 carry the teams on into the rest of the times tables, up to
 * 10 teams of 12, and put a crowd of players into teams of so many. These
 * are for working a fact out rather than knowing it (Times Table Sprint is
 * for knowing them): 7 teams of 8 is 5 teams and 2 more, 40 and 16.
 *
 * A wrong answer counts the groups in steps, 4, 8, 12, the skip counting
 * from Keepy-Uppy, with the running count written under each group; in
 * Years 3–4, from 6 teams on, the first 5 teams are marked off from the
 * rest, with what each part makes written under it (drillWorkOut). */

import { el, prefersReducedMotion } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { DRILL_STEPS, drillChoices, drillQuestion, drillWorkOut, type DrillQuestion, type DrillStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<DrillStep>({
    id: 'training-drills',
    title: 'Training',
    swash: 'Drills',
    tagline: 'Equal groups for training. How many altogether? How many each?',
    steps: DRILL_STEPS,
    face: '🏋️',
    build,
  }, root);
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const field = el('div', { class: 'td-field', role: 'img' });
  const node = el('div', { class: 'mx-stage' }, ask, field);
  let last: DrillQuestion | undefined;

  const ball = (): HTMLElement => el('span', { class: 'td-ball', 'aria-hidden': 'true', text: '⚽' });
  const cone = (): HTMLElement => el('span', { class: 'td-cone', 'aria-hidden': 'true' });
  function fan(): HTMLElement {
    const f = el('span', { class: 'td-fan', 'aria-hidden': 'true' });
    f.style.background = kit.us().colours[0];
    return f;
  }

  /** the groups, each with its things, and a label under each for counting */
  function groups(q: DrillQuestion, step: DrillStep, filled: boolean): HTMLElement[] {
    const kind = step.teams ? 'td-team' : 'td-hoop';
    const out: HTMLElement[] = [];
    for (let g = 0; g < q.groups; g += 1) {
      const inside = el('span', { class: 'td-inside' });
      if (filled) for (let i = 0; i < q.each; i += 1) inside.append(step.teams ? fan() : ball());
      out.push(el('span', { class: `td-group ${kind}` }, inside, el('span', { class: 'td-count' })));
    }
    field.replaceChildren(el('div', { class: 'td-groups' }, ...out));
    return out;
  }

  /** the first `split` teams marked off from the rest, with what each part makes */
  function splitUp(boxes: HTMLElement[], q: DrillQuestion, split: number): void {
    boxes.forEach((b, i) => b.classList.toggle('td-first', i < split));
    const label = (i: number, n: number): void => { const c = boxes[i]?.querySelector('.td-count'); if (c) c.textContent = String(n); };
    label(split - 1, split * q.each);
    label(boxes.length - 1, (boxes.length - split) * q.each);
    field.classList.add('counting');
  }

  /** cones in rows; or loose in a pile, before they are set out */
  function rows(q: DrillQuestion, loose: boolean): HTMLElement[] {
    if (loose) {
      field.replaceChildren(el('div', { class: 'td-pile' }, ...Array.from({ length: q.total }, cone)));
      return [];
    }
    const out = Array.from({ length: q.groups }, () =>
      el('div', { class: 'td-row' }, el('span', { class: 'td-inside' }, ...Array.from({ length: q.each }, cone)), el('span', { class: 'td-count' })));
    field.replaceChildren(el('div', { class: 'td-rows' }, ...out));
    return out;
  }

  /** count the groups in steps, writing the running total under each */
  function countUp(boxes: HTMLElement[], q: DrillQuestion): string {
    const steps = boxes.map((_, i) => (i + 1) * q.each);
    boxes.forEach((b, i) => { const c = b.querySelector('.td-count'); if (c) c.textContent = String(steps[i]); });
    field.classList.add('counting');
    return steps.join(', ');
  }

  /** deal the balls one at a time into the hoops, as sharing is done */
  async function deal(boxes: HTMLElement[], q: DrillQuestion): Promise<void> {
    const pile = field.querySelector('.td-pile');
    const beat = prefersReducedMotion() ? 0 : Math.max(60, Math.round(1600 / q.total));
    for (let i = 0; i < q.total; i += 1) {
      pile?.firstElementChild?.remove();
      boxes[i % q.groups].querySelector('.td-inside')?.append(ball());
      if (beat) await kit.wait(beat);
    }
  }

  return {
    node,
    ask: async (step: DrillStep): Promise<boolean> => {
      const q = drillQuestion(step, last);
      last = q;
      field.classList.remove('counting');
      /* up to 10 teams of 12: smaller players, so they still fit a phone */
      field.classList.toggle('crowded', q.total > 40);
      field.dataset.answer = String(q.answer);
      let boxes: HTMLElement[] = [];
      let text: string;
      if (step.task === 'groups') {
        boxes = groups(q, step, true);
        text = step.teams
          ? `${plural(q.groups, 'team', 'teams')} of ${q.each} players. How many players?`
          : `${plural(q.groups, 'hoop', 'hoops')} with ${plural(q.each, 'ball', 'balls')} in each. How many balls?`;
      } else if (step.task === 'share') {
        boxes = groups(q, step, false);
        field.prepend(el('div', { class: 'td-pile' }, ...Array.from({ length: q.total }, ball)));
        text = `Share ${q.total} balls fairly between ${q.groups} hoops. How many in each hoop?`;
      } else if (step.task === 'rows') {
        boxes = rows(q, false);
        text = `${q.groups} rows of ${q.each} cones. How many cones?`;
      } else if (step.teams) {
        field.replaceChildren(el('div', { class: 'td-pile' }, ...Array.from({ length: q.total }, fan)));
        text = `${q.total} players, in teams of ${q.each}. How many teams?`;
      } else {
        rows(q, true);
        text = `Put ${q.total} cones out in rows of ${q.each}. How many rows?`;
      }
      field.setAttribute('aria-label', text);
      ask.textContent = text;
      say(text);

      const picked = await kit.choices.ask(drillChoices(step, q));
      kit.choices.reveal(q.answer, picked);
      const ok = picked === q.answer;
      let how: string;
      /* what a right answer is told: the working out is for a miss */
      let yes: string | undefined;
      if (step.workOut) {
        /* worked out from facts he knows, the teams marked as it says */
        if (step.task === 'make-rows') boxes = groups(q, step, true);
        const out = drillWorkOut(step, q);
        if (out.split) splitUp(boxes, q, out.split);
        else countUp(boxes, q);
        yes = step.task === 'make-rows'
          ? `${q.total} players in teams of ${q.each} make ${plural(q.groups, 'team', 'teams')}.`
          : `${q.groups} teams of ${q.each} make ${q.total}.`;
        how = `${yes} ${out.text}`;
      } else if (step.task === 'share') {
        await deal(boxes, q);
        how = `${q.total} shared between ${q.groups} is ${q.each} each.`;
      } else if (step.task === 'make-rows') {
        boxes = rows(q, false);
        how = `${q.total} in rows of ${q.each} makes ${plural(q.groups, 'row', 'rows')}: ${countUp(boxes, q)}.`;
      } else {
        const counted = countUp(boxes, q);
        how = `${counted}. ${q.groups} ${step.task === 'rows' ? 'rows' : 'groups'} of ${q.each} make ${q.total}.`;
      }
      if (ok) {
        sfx.cheer();
        kit.note(`Yes! ${yes ?? how}`, true);
        say(`Yes! ${yes ?? how}`);
        await kit.wait(2800);
        return true;
      }
      sfx.wrong();
      kit.note(how);
      say(how);
      await kit.wait(3800);
      return false;
    },
  };
}
