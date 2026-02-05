import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const apiKey = process.env.YOUTUBE_API_KEY;
console.log('API Key present:', !!apiKey);
if (apiKey) {
    console.log('API Key prefix:', apiKey.substring(0, 5));
}

const youtube = google.youtube({
    version: 'v3',
    auth: apiKey,
});

async function testYouTube() {
    try {
        const videoId = 'aqz-KE-bpKQ'; // A sample video
        console.log(`Testing YouTube API for video: ${videoId}`);
        const response = await youtube.videos.list({
            part: ['statistics', 'snippet'],
            id: [videoId],
        });

        if (!response.data.items || response.data.items.length === 0) {
            console.log('Video not found');
        } else {
            console.log('Video Title:', response.data.items[0].snippet.title);
            console.log('Comment Count:', response.data.items[0].statistics.commentCount);
        }
    } catch (error) {
        console.error('Test Error:', error.message);
        if (error.response) {
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testYouTube();
