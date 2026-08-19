import { describe, expect, it } from 'vitest';
import { normalizeComments, getSubstantiveComments } from '../routes/demo.js';
import { processComments } from '../services/commentProcessor.js';

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

  it('rejects generic and off-topic comments as LLM evidence', () => {
    const { comments } = processComments([
      { text: 'nice', author: 'one' },
      { text: 'great video', author: 'two' },
      { text: 'hi', author: 'three' },
      { text: 'Could you compare the battery life with last year?', author: 'four' },
    ]);

    const substantive = getSubstantiveComments(comments);
    expect(substantive).toHaveLength(1);
    expect(substantive[0].clean_text).toContain('battery life');
  });
});
