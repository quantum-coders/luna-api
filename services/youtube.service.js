import 'dotenv/config';
import { google } from 'googleapis';

const youtube = google.youtube({
	version: 'v3',
	auth: process.env.GOOGLE_API_KEY,
});

/**
 * A service class for interacting with the YouTube API.
 */
class YoutubeService {

    /**
     * Searches for YouTube videos based on a query.
     *
     * @param {string} query - The search query to find videos on YouTube.
     * @param {number} [numResults=5] - The number of results to return (default is 5).
     * @returns {Promise<Array>} A promise that resolves to an array of video items from the search results.
     * @throws {Error} Throws an error if the API request fails.
     */
    static async searchVideo(query, numResults = 5) {
        const response = await youtube.search.list({
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: numResults,
        });

        return response.data.items;
    }
}

export default YoutubeService;
