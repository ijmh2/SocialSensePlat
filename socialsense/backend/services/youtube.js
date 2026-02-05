import { google } from 'googleapis';

console.log('Initializing YouTube API client...');
if (!process.env.YOUTUBE_API_KEY) {
  console.error('CRITICAL: YOUTUBE_API_KEY is missing in backend environment!');
} else {
  console.log('YOUTUBE_API_KEY is present (starts with:', process.env.YOUTUBE_API_KEY.substring(0, 5) + ')');
}

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([0-9A-Za-z_-]{11})/,
    /youtube\.com\/embed\/([0-9A-Za-z_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Get video details including comment count
 */
export async function getVideoDetails(videoId) {
  try {
    const response = await youtube.videos.list({
      part: ['statistics', 'snippet'],
      id: [videoId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    return {
      id: videoId,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      description: video.snippet.description,
      publishedAt: video.snippet.publishedAt,
      commentCount: parseInt(video.statistics.commentCount || '0'),
      viewCount: parseInt(video.statistics.viewCount || '0'),
      likeCount: parseInt(video.statistics.likeCount || '0'),
    };
  } catch (error) {
    console.error('YouTube API error:', error);
    throw error;
  }
}

/**
 * Scrape comments from a YouTube video
 */
export async function scrapeYouTubeComments(videoId, maxComments = 1000, onProgress = null) {
  const comments = [];
  let nextPageToken = null;

  try {
    while (comments.length < maxComments) {
      const response = await youtube.commentThreads.list({
        part: ['snippet'],
        videoId: videoId,
        maxResults: 100,
        pageToken: nextPageToken,
        textFormat: 'plainText',
      });

      for (const item of response.data.items || []) {
        const comment = item.snippet.topLevelComment.snippet;
        const text = comment.textDisplay?.trim();

        if (text && text !== '[sticker]') {
          comments.push({
            user: comment.authorDisplayName,
            text: text,
            likes: comment.likeCount || 0,
            publishedAt: comment.publishedAt,
          });
        }

        if (comments.length >= maxComments) break;
      }

      if (onProgress) {
        onProgress(comments.length);
      }

      nextPageToken = response.data.nextPageToken;
      if (!nextPageToken) break;

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return comments.slice(0, maxComments);
  } catch (error) {
    console.error('[YOUTUBE] Scrape error:', error.message);
    if (error.response?.data) {
      console.error('[YOUTUBE] API Details:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.code === 403) {
      throw new Error('YouTube API quota exceeded or comments are disabled');
    }
    if (error.code === 404) {
      throw new Error('Video not found or comments are disabled');
    }
    throw error;
  }
}

export default {
  extractVideoId,
  getVideoDetails,
  scrapeYouTubeComments,
};
