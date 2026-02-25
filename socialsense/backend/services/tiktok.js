import axios from 'axios';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/**
 * Extract video ID from TikTok URL
 */
export async function extractTikTokVideoId(url) {
  try {
    // First try to extract directly from URL
    let match = url.match(/\/video\/(\d+)/);
    if (match) return match[1];
    
    // Try photo/slideshow format
    match = url.match(/\/photo\/(\d+)/);
    if (match) return match[1];

    // Handle shortened URLs (vm.tiktok.com, vt.tiktok.com)
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      const response = await axios.get(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: { 
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml',
        },
        validateStatus: () => true,
      });
      
      const finalUrl = response.request?.res?.responseUrl || response.headers?.location || url;
      match = finalUrl.match(/\/video\/(\d+)/);
      if (match) return match[1];
      
      const bodyMatch = response.data?.toString().match(/video\/(\d+)/);
      if (bodyMatch) return bodyMatch[1];
    }
    
    throw new Error('Could not extract TikTok video ID from URL');
  } catch (error) {
    console.error('TikTok URL resolution error:', error.message);
    throw new Error(`Failed to resolve TikTok URL: ${error.message}`);
  }
}

/**
 * Get TikTok video details (views, likes, shares, etc.) by scraping the page
 * @returns {Promise<{viewCount, likeCount, commentCount, shareCount, title, channelTitle}>}
 */
export async function getTikTokVideoDetails(videoId) {
  try {
    // Try the detail API endpoint first
    const apiUrl = `https://www.tiktok.com/api/item/detail/?aid=1988&itemId=${videoId}`;

    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'application/json',
        'Referer': `https://www.tiktok.com/@user/video/${videoId}`,
      },
      timeout: 15000,
    });

    const itemInfo = response.data?.itemInfo?.itemStruct;
    if (itemInfo) {
      const stats = itemInfo.stats || {};
      return {
        id: videoId,
        title: itemInfo.desc || 'TikTok Video',
        channelTitle: itemInfo.author?.nickname || itemInfo.author?.uniqueId || 'Unknown',
        viewCount: stats.playCount || 0,
        likeCount: stats.diggCount || 0,
        commentCount: stats.commentCount || 0,
        shareCount: stats.shareCount || 0,
        hasMetrics: (stats.playCount || 0) > 0,
      };
    }
  } catch (error) {
    console.warn('[TikTok] Detail API failed:', error.message);
  }

  // Fallback: Try scraping the video page HTML for embedded JSON
  try {
    const pageUrl = `https://www.tiktok.com/@user/video/${videoId}`;
    const response = await axios.get(pageUrl, {
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    });

    const html = response.data;

    // Look for __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON
    const jsonMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      const itemModule = data?.['__DEFAULT_SCOPE__']?.['webapp.video-detail']?.itemInfo?.itemStruct;

      if (itemModule) {
        const stats = itemModule.stats || {};
        return {
          id: videoId,
          title: itemModule.desc || 'TikTok Video',
          channelTitle: itemModule.author?.nickname || itemModule.author?.uniqueId || 'Unknown',
          viewCount: stats.playCount || 0,
          likeCount: stats.diggCount || 0,
          commentCount: stats.commentCount || 0,
          shareCount: stats.shareCount || 0,
          hasMetrics: (stats.playCount || 0) > 0,
        };
      }
    }

    // Try SIGI_STATE format (older TikTok pages)
    const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>([^<]+)<\/script>/);
    if (sigiMatch) {
      const data = JSON.parse(sigiMatch[1]);
      const itemModule = data?.ItemModule?.[videoId];

      if (itemModule) {
        const stats = itemModule.stats || {};
        return {
          id: videoId,
          title: itemModule.desc || 'TikTok Video',
          channelTitle: itemModule.author || 'Unknown',
          viewCount: stats.playCount || 0,
          likeCount: stats.diggCount || 0,
          commentCount: stats.commentCount || 0,
          shareCount: stats.shareCount || 0,
          hasMetrics: (stats.playCount || 0) > 0,
        };
      }
    }
  } catch (error) {
    console.warn('[TikTok] Page scraping failed:', error.message);
  }

  // Return empty metrics if all methods fail
  console.log('[TikTok] Could not fetch video metrics, using comment-only analysis');
  return {
    id: videoId,
    title: 'TikTok Video',
    channelTitle: 'Unknown',
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    hasMetrics: false,
  };
}

/**
 * Get estimated comment count for a TikTok video
 * @returns {Promise<{count: number, estimated: boolean}>}
 */
export async function getTikTokCommentCount(videoId) {
  try {
    const response = await axios.get('https://www.tiktok.com/api/comment/list/', {
      params: {
        aid: 1988,
        aweme_id: videoId,
        count: 1,
        cursor: 0,
      },
      headers: {
        'User-Agent': getRandomUA(),
        'Referer': `https://www.tiktok.com/@user/video/${videoId}`,
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    const total = response.data?.total || 0;
    const hasComments = (response.data?.comments?.length || 0) > 0;

    if (total === 0 && hasComments) {
      return { count: 100, estimated: true };
    }

    return { count: total, estimated: false };
  } catch (error) {
    console.error('TikTok comment count error:', error.message);
    // Return estimated count with flag so callers know it's not accurate
    return { count: 50, estimated: true, error: error.message };
  }
}

/**
 * Scrape comments from a TikTok video
 */
export async function scrapeTikTokComments(videoId, maxComments = 500, onProgress = null) {
  const comments = [];
  let cursor = 0;
  let consecutiveFailures = 0;
  const maxRetries = 3;
  const maxEmptyResponses = 3;
  let emptyResponses = 0;
  
  console.log(`Starting TikTok scrape for video ${videoId}, max ${maxComments} comments`);
  
  try {
    while (comments.length < maxComments && consecutiveFailures < maxRetries) {
      try {
        const response = await axios.get('https://www.tiktok.com/api/comment/list/', {
          params: {
            aid: 1988,
            aweme_id: videoId,
            count: 50,
            cursor: cursor,
          },
          headers: {
            'User-Agent': getRandomUA(),
            'Referer': `https://www.tiktok.com/@user/video/${videoId}`,
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 15000,
        });
        
        consecutiveFailures = 0;
        const data = response.data;
        
        if (data.status_code && data.status_code !== 0) {
          console.warn('TikTok API returned error status:', data.status_code);
          break;
        }
        
        const newComments = data.comments || [];
        
        if (newComments.length === 0) {
          emptyResponses++;
          if (emptyResponses >= maxEmptyResponses) {
            console.log('Multiple empty responses, ending scrape');
            break;
          }
          cursor += 50;
          continue;
        }
        
        emptyResponses = 0;
        
        for (const comment of newComments) {
          const text = comment.text?.trim();
          if (text && text !== '[sticker]' && text.length > 0) {
            comments.push({
              user: comment.user?.nickname || comment.user?.unique_id || 'Unknown',
              text: text,
              likes: comment.digg_count || 0,
              publishedAt: comment.create_time 
                ? new Date(comment.create_time * 1000).toISOString() 
                : null,
            });
          }
          
          if (comments.length >= maxComments) break;
        }
        
        if (onProgress) {
          onProgress(comments.length);
        }
        
        console.log(`TikTok scrape progress: ${comments.length} comments`);
        
        if (!data.has_more || data.has_more === false) {
          console.log('No more comments available');
          break;
        }
        
        cursor = data.cursor || cursor + 50;
        
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
        
      } catch (error) {
        consecutiveFailures++;
        console.warn(`TikTok request failed (attempt ${consecutiveFailures}/${maxRetries}):`, error.message);
        
        if (consecutiveFailures >= maxRetries) {
          console.error('TikTok API not responding after retries');
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, consecutiveFailures) * 1000));
      }
    }
    
    console.log(`TikTok scrape complete: ${comments.length} comments collected`);
    
    if (comments.length > 0) {
      return comments.slice(0, maxComments);
    }
    
    throw new Error('Could not retrieve comments. TikTok may be blocking requests or comments are disabled.');
    
  } catch (error) {
    console.error('TikTok scraping error:', error.message);
    
    if (comments.length > 0) {
      return comments.slice(0, maxComments);
    }
    
    throw error;
  }
}

export default {
  extractTikTokVideoId,
  getTikTokVideoDetails,
  getTikTokCommentCount,
  scrapeTikTokComments,
};
