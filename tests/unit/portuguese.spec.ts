/* The geography games in Portuguese (src/content/pt.ts and the three content
 * files): the articles join the words before them, every question has its
 * Portuguese, nothing English is left in it, and every line is on the list
 * to record in the teacher's voice.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import { The, of, pt, thatIs, thatIsNot, isHere, whereIs } from '../../src/content/pt';
import { MAP_STEPS, PLACES, mapLines, mapQuestion } from '../../src/content/world';
import { COUNTRIES, FLAG_STEPS, flagLines, flagQuestion } from '../../src/content/flags';
import { CAPITAL_STEPS, STATES, capitalLines, capitalQuestion, cityIn } from '../../src/content/capitals';
import { clips } from '../../tools/make-audio';
import { speakable } from '../../src/lib/clip-id';

const nameOf = (code: string): string => COUNTRIES.find((c) => c.id === code)!.name;
const ptOf = (code: string) => COUNTRIES.find((c) => c.id === code)!.pt;

const ALL_PT = [...mapLines('pt'), ...flagLines('pt'), ...capitalLines(nameOf, ptOf)];

/** what would give a line away as English, or as Portuguese written wrong:
    an article left apart from "de" or "em", or an English word */
const WRONG = /\b(de|em) (o|a|os|as) |\b(the|is|of|Which|What|Where|That|This|flag|and)\b/;

describe('names in Portuguese sentences', () => {
  it('join the article to "de", and leave it out where the name has none', () => {
    expect(of(pt('Austrália', 'f'))).toBe('da Austrália');
    expect(of(pt('Brasil', 'm'))).toBe('do Brasil');
    expect(of(pt('Estados Unidos', 'm', true, true))).toBe('dos Estados Unidos');
    expect(of(pt('Portugal', 'm', false))).toBe('de Portugal');
  });

  it('agree with the name: feminine, masculine, plural', () => {
    expect(thatIs(pt('Austrália', 'f'))).toBe('Essa é a Austrália.');
    expect(thatIs(pt('Oceano Pacífico', 'm'))).toBe('Esse é o Oceano Pacífico.');
    expect(thatIsNot(pt('Estados Unidos', 'm', true, true))).toBe('Esses não são os Estados Unidos.');
    expect(isHere(pt('Estados Unidos', 'm', true, true))).toBe('Os Estados Unidos ficam aqui.');
    expect(whereIs(pt('Portugal', 'm', false))).toBe('Onde fica Portugal?');
    expect(The(pt('Cairo', 'm'))).toBe('O Cairo');
  });
});

describe('the geography games in Portuguese', () => {
  it('have a Portuguese name for every place, country and state', () => {
    for (const p of PLACES) expect(p.pt.name && p.factPt, p.id).toBeTruthy();
    for (const c of COUNTRIES) expect(c.pt.name && c.looksPt, c.id).toBeTruthy();
    for (const s of STATES) expect(s.pt.name && s.factPt, s.id).toBeTruthy();
  });

  it('ask every question in Portuguese too, with nothing English left in it', () => {
    for (let i = 0; i < 40; i += 1) {
      const qs = [
        ...MAP_STEPS.map((s) => mapQuestion(s)),
        ...FLAG_STEPS.map((s) => flagQuestion(s)),
        ...CAPITAL_STEPS.map((s) => capitalQuestion(s, nameOf, [], ptOf)),
      ];
      for (const q of qs) {
        expect(q.pt.ask, q.ask).toBeTruthy();
        expect(q.pt.why, q.why).toBeTruthy();
        expect(`${q.pt.ask} ${q.pt.why}`, q.ask).not.toMatch(WRONG);
      }
    }
  });

  it('say no line with an article left apart or an English word', () => {
    for (const line of ALL_PT) expect(line).not.toMatch(WRONG);
  });

  it('call the capitals by their Portuguese names, and keep the ones that are the same', () => {
    expect(cityIn('Canberra', 'pt')).toBe('Camberra');
    expect(cityIn('Beijing', 'pt')).toBe('Pequim');
    expect(cityIn('Sydney', 'pt')).toBe('Sydney');
    expect(cityIn('Canberra', 'en')).toBe('Canberra');
  });

  it('has every Portuguese line on the list to record, in the teacher\'s voice', () => {
    const voiceOf = new Map(clips().map((c) => [speakable(c.text), c.voice]));
    for (const line of ALL_PT) expect(voiceOf.get(speakable(line)), line).toBe('pt');
  });
});
