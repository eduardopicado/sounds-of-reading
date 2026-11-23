/* Beat Your Time's content: the stories offered, how a time is shown and
 * compared, the race places, and what is kept and said.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  MEDALS, READS, SAYS, afterSays, beatLines, cleanBests, clockText, compareText, outcome, perMinute, places, storiesUpTo, timeText,
  wordCount,
} from '../../src/content/beat-time';
import { ALL_STORIES } from '../../src/content/index';

describe('Beat Your Time', () => {
  it('reads a story three times', () => {
    expect(READS).toBe(3);
    expect(MEDALS).toHaveLength(READS);
  });

  it('offers every story up to his level, his own level and the one below first', () => {
    const offered = storiesUpTo(5);
    expect(new Set(offered)).toEqual(new Set(ALL_STORIES.filter((s) => s.level <= 5)));
    const near = offered.findIndex((s) => s.level < 4);
    expect(offered.slice(0, near).every((s) => s.level >= 4)).toBe(true);
    expect(offered.slice(near).every((s) => s.level < 4)).toBe(true);
    expect(storiesUpTo(1).every((s) => s.level === 1)).toBe(true);
  });

  it('counts the words of the story, not its title or its marks', () => {
    const ants = ALL_STORIES.find((s) => s.title === 'Ants')!;
    expect(wordCount(ants)).toBe(ants.text.split(/\s+/).length);
    for (const s of ALL_STORIES) expect(wordCount(s)).toBeGreaterThan(15);
  });

  it('says a time in words, and shows the clock', () => {
    expect(timeText(48_200)).toBe('48 seconds');
    expect(timeText(1_000)).toBe('1 second');
    expect(timeText(60_000)).toBe('1 minute');
    expect(timeText(65_400)).toBe('1 minute 5 seconds');
    expect(timeText(125_000)).toBe('2 minutes 5 seconds');
    expect(clockText(0)).toBe('0:00');
    expect(clockText(9_999)).toBe('0:09');
    expect(clockText(72_000)).toBe('1:12');
  });

  it('works out words read right in a minute, the stuck words left out', () => {
    expect(perMinute(40, 0, 30_000)).toBe(80);
    expect(perMinute(40, 4, 30_000)).toBe(72);
    expect(perMinute(40, 50, 30_000)).toBe(0);
    expect(perMinute(40, 0, 0)).toBe(0);
  });

  it('compares a read with the one before, half a second either way being the same', () => {
    expect(outcome(null, 30_000)).toBe('first');
    expect(outcome(30_000, 25_000)).toBe('faster');
    expect(outcome(30_000, 30_400)).toBe('same');
    expect(outcome(30_000, 29_600)).toBe('same');
    expect(outcome(30_000, 33_000)).toBe('slower');
    expect(compareText(null, 30_000)).toBe('30 seconds. Now read it again!');
    expect(compareText(30_000, 25_000)).toBe('5 seconds faster!');
    expect(compareText(30_000, 29_200)).toBe('1 second faster!');
    expect(compareText(30_000, 30_000)).toBe('Just the same time!');
    expect(compareText(30_000, 40_000)).toBe('A little slower this time. That is OK!');
  });

  it('says something kind whichever way it went, and asks for another read only when there is one', () => {
    expect(afterSays(null, 30_000, false)).toBe(SAYS.first);
    expect(afterSays(30_000, 25_000, false)).toBe(SAYS.faster);
    expect(afterSays(30_000, 30_000, false)).toBe(SAYS.same);
    expect(afterSays(30_000, 40_000, false)).toBe(SAYS.slower);
    expect(afterSays(null, 30_000, true)).not.toBe(SAYS.first);
  });

  it('places the reads in the race, the same time sharing a place', () => {
    expect(places([30_000, 25_000, 20_000])).toEqual([3, 2, 1]);
    expect(places([20_000, 25_000, 30_000])).toEqual([1, 2, 3]);
    expect(places([30_000, 25_000, 25_200])).toEqual([3, 1, 1]);
    expect(places([30_000])).toEqual([1]);
  });

  it('keeps a best time only for a story there is, and only as a time', () => {
    expect(cleanBests({ 'The Goal': 31_000, 'No Such Story': 5_000, Ants: 'fast', 'I Spin': -3, 'The Duck': NaN })).toEqual({ 'The Goal': 31_000 });
    expect(cleanBests(null)).toEqual({});
    expect(cleanBests([1, 2])).toEqual({});
    expect(cleanBests('fast')).toEqual({});
  });

  it('has a short list of lines to record, each a sentence', () => {
    const lines = beatLines();
    expect(lines.length).toBe(Object.keys(SAYS).length);
    for (const line of lines) expect(line).toMatch(/^[A-Z].*[.!?]$/);
  });
});
