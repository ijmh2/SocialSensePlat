import { describe, expect, it } from 'vitest';
import { normalizeComments } from '../routes/demo.js';

describe('LLM demo input', () => {
  it('accepts newline-delimited comments and removes blank lines', () => {
    expect(normalizeComments('First comment\n\n Second comment \nThird')).toEqual([
      'First comment',
      'Second comment',
      'Third',
    ]);
  });

  it('accepts comment objects and caps individual comment length', () => {
    const comments = normalizeComments([
      { text: 'Useful feedback' },
      { text: 'x'.repeat(700) },
    ]);

    expect(comments[0]).toBe('Useful feedback');
    expect(comments[1]).toHaveLength(500);
  });
});
