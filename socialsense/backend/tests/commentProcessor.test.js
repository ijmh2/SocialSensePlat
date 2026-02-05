import { describe, it, expect } from 'vitest';
import { isEmojiOnly, isSpamOrPromo, isGenericShortPraise, cleanCommentText, processComments } from '../services/commentProcessor.js';

describe('Comment Processor Service', () => {
    describe('isEmojiOnly', () => {
        it('should identify emoji-only text', () => {
            expect(isEmojiOnly('🔥🔥🔥')).toBe(true);
            expect(isEmojiOnly('❤️')).toBe(true);
            expect(isEmojiOnly('nice video')).toBe(false);
            expect(isEmojiOnly('nice video 🔥')).toBe(false);
        });
    });

    describe('isSpamOrPromo', () => {
        it('should identify spam or promotional content', () => {
            expect(isSpamOrPromo('Check out my channel! http://example.com')).toBe(true);
            expect(isSpamOrPromo('Subscribe to me for free gifts')).toBe(true);
            expect(isSpamOrPromo('This video was very informative')).toBe(false);
        });
    });

    describe('isGenericShortPraise', () => {
        it('should identify generic short praise', () => {
            expect(isGenericShortPraise('nice')).toBe(true);
            expect(isGenericShortPraise('great video')).toBe(true);
            expect(isGenericShortPraise('This video was absolutely amazing and I learned a lot')).toBe(false);
        });
    });

    describe('cleanCommentText', () => {
        it('should remove mentions and trim text', () => {
            expect(cleanCommentText('  @user123 Great video!  ')).toBe('Great video!');
        });

        it('should truncate long comments', () => {
            const longText = 'a'.repeat(300);
            expect(cleanCommentText(longText).length).toBe(200);
        });
    });

    describe('processComments', () => {
        it('should process and filter a list of comments', () => {
            const comments = [
                { text: '🔥🔥🔥', author: 'user1' },
                { text: 'Spam http://link.com', author: 'user2' },
                { text: 'Unique comment', author: 'user3' },
                { text: 'Unique comment', author: 'user4' }, // Duplicate
                { text: 'nice', author: 'user5' },
            ];

            const result = processComments(comments);
            expect(result.comments.length).toBe(2); // Unique comment + nice (soft filtered but kept)
            expect(result.stats.emoji_only).toBe(1);
            expect(result.stats.spam_promo).toBe(1);
            expect(result.stats.duplicates).toBe(1);
            expect(result.stats.generic_praise).toBe(1);
        });
    });
});
