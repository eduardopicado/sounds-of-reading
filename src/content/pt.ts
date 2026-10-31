/* Portuguese names in sentences, for the games that speak it: a place or a
 * country takes its article, and the article joins the word before it.
 *
 *   "a Austrália"  → "da Austrália", "A Austrália fica aqui."
 *   "Portugal"     → "de Portugal", "Portugal fica aqui."
 *   "os Estados Unidos" → "dos Estados Unidos", "Os Estados Unidos ficam aqui."
 *
 * Each name says its own article, because Portuguese does not follow a
 * rule a program could: "o Brasil" but "Portugal", "a Austrália" but
 * "Nova Gales do Sul". */

export type Lang = 'en' | 'pt';

/** one thing said both ways */
export interface Both { en: string; pt: string }

export interface PtName {
  /** the name itself: "Austrália", "Estados Unidos" */
  name: string;
  /** feminine or masculine, for the article and for "essa" or "esse" */
  g: 'f' | 'm';
  /** said with its article: "a Austrália", but "Portugal" */
  art?: boolean;
  /** plural: "os Estados Unidos ficam" */
  pl?: boolean;
}

export const pt = (name: string, g: 'f' | 'm', art = true, pl = false): PtName => ({ name, g, art, pl });

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

/** the article: a, o, as, os */
const article = (n: PtName): string => (n.g === 'f' ? 'a' : 'o') + (n.pl ? 's' : '');

/** "a Austrália", "Portugal" */
export const the = (n: PtName): string => (n.art ? `${article(n)} ${n.name}` : n.name);
/** the same at the start of a sentence: "A Austrália" */
export const The = (n: PtName): string => cap(the(n));
/** "da Austrália", "do Brasil", "dos Estados Unidos", "de Portugal" */
export const of = (n: PtName): string => (n.art ? `d${article(n)} ${n.name}` : `de ${n.name}`);
/** "fica" or "ficam" */
export const fica = (n: PtName): string => (n.pl ? 'ficam' : 'fica');
/** "é" or "são" */
export const is = (n: PtName): string => (n.pl ? 'são' : 'é');
/** "Essa é a Austrália.", "Esses são os Estados Unidos.", "Esse é Portugal." */
export const thatIs = (n: PtName): string => `Ess${n.g === 'f' ? 'a' : 'e'}${n.pl ? 's' : ''} ${is(n)} ${the(n)}.`;
/** "Esta é a Austrália." */
export const thisIs = (n: PtName): string => `Est${n.g === 'f' ? 'a' : 'e'}${n.pl ? 's' : ''} ${is(n)} ${the(n)}.`;
/** "Essa não é a Austrália." */
export const thatIsNot = (n: PtName): string => `Ess${n.g === 'f' ? 'a' : 'e'}${n.pl ? 's' : ''} não ${is(n)} ${the(n)}.`;
/** "A Austrália fica aqui." */
export const isHere = (n: PtName): string => `${The(n)} ${fica(n)} aqui.`;
/** "Onde fica a Austrália?" */
export const whereIs = (n: PtName): string => `Onde ${fica(n)} ${the(n)}?`;
