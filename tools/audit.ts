/* Lists every content problem in one pass, instead of stopping at the first. */
import { SOUNDS, FAMILIES, PHRASES, type Slot } from '../src/content/words';
import { resolveSpans } from '../src/content/spans';

const problems: string[] = [];
for (const s of SOUNDS) {
  if (!s.practice) continue;
  for (const [kind, raw] of [['words', s.words], ['silly', s.silly]] as const) {
    for (const chunk of (raw ?? '').split('|')) {
      const bits = chunk.trim().split(/\s+/).filter(Boolean);
      const marked = bits.shift();
      if (!marked) continue;
      try { resolveSpans(marked, s.spellings, `${s.id} ${kind}`); }
      catch (e) { problems.push((e as Error).message); }
    }
  }
}
for (const slot of Object.keys(PHRASES) as Slot[]) {
  for (const chunk of PHRASES[slot].split('|')) {
    const raw = chunk.trim();
    const m = /^(.*?)\s*~(\S+)(?:\s*@([1-8]))?$/.exec(raw);
    if (!m) { problems.push(`phrase "${raw}" has no ~sound tag`); continue; }
    const s = SOUNDS.find((x) => x.id === m[2]);
    if (!s) { problems.push(`phrase "${raw}" tags unknown sound ${m[2]}`); continue; }
    try { resolveSpans(m[1], s.spellings, `phrase[${slot}]`); }
    catch (e) { problems.push((e as Error).message); }
  }
}
for (const f of FAMILIES) {
  const s = SOUNDS.find((x) => x.id === f.sound);
  if (!s) { problems.push(`family ${f.id} tags unknown sound ${f.sound}`); continue; }
  for (const p of f.real) {
    const w = f.kind === 'rime' ? p + f.fixed : f.fixed + p;
    try { resolveSpans(w, s.spellings, `family ${f.id}`); }
    catch (e) { problems.push((e as Error).message); }
  }
}
console.log(problems.length ? problems.join('\n') : 'no span problems');
console.log('\ntotal:', problems.length);
