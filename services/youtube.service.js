import 'dotenv/config';
import { google } from 'googleapis';

const youtube = google.youtube({
	version: 'v3',
	auth: process.env.GOOGLE_API_KEY,
});

class YoutubeService {

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