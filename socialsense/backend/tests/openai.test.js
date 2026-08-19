import { afterEach, describe, expect, it } from 'vitest';
import { analyzeComments } from '../services/openai.js';
import { resetOpenAIClientForTests, setOpenAIClientForTests } from '../services/aiClient.js';

afterEach(() => resetOpenAIClientForTests());

describe('structured LLM analysis', () => {
  it('maps a validated Responses API result into the existing analysis shape', async () => {
    setOpenAIClientForTests({
      responses: {
        parse: async () => ({
          output_parsed: {
            summary: '## Finding\nThe audience wants clearer comparisons.',
            videoScore: 74,
            priorityImprovement: 'Add a side-by-side comparison.',
            scoreBreakdown: {
              engagement: { score: 30, max: 40, reason: 'Substantive questions' },
              contentFit: { score: 23, max: 30, reason: 'Mostly clear' },
              conversion: { score: 16, max: 20, reason: 'Purchase intent' },
              redFlags: { score: 5, max: 10, reason: 'Price objections' },
            },
            notesAssessment: null,
            marketingInsights: null,
            competitorAnalysis: null,
            actionItems: [{
              title: 'Publish a comparison',
              description: 'Answer the repeated cheaper-alternative question.',
              priority: 'high',
            }],
          },
        }),
      },
    });

    const comments = [
      'Can you compare this with the cheaper version?',
      'The demonstration made the setup clear.',
      'I bought it after seeing the size guide.',
    ].map((clean_text) => ({
      clean_text,
      is_generic_praise: false,
      is_off_topic: false,
      sentiment: { label: 'neutral', score: 0 },
    }));

    const result = await analyzeComments(
      comments, 'youtube', null, null, null, true
    );

    expect(result.videoScore).toBe(64);
    expect(result.scoreBreakdown.engagement.max).toBe(40);
    expect(result.actionItems).toEqual([expect.objectContaining({
      id: 'action_1',
      title: 'Publish a comparison',
      completed: false,
    })]);
    expect(result.summary).toContain('Analysis Transparency');
  });
});
