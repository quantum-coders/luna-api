import { ACTIONS_CORS_HEADERS_MIDDLEWARE } from '@solana/actions';
import cors from 'cors';

import primate from '@thewebchimp/primate';

import { router as ai } from './routes/ai.js';
import { router as blinks } from './routes/blinks.js';
import { router as defaultRouter } from './routes/default.js';

primate.app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
	// If you need to handle pre-flight OPTIONS request, you can respond with status 200
	if(req.method === 'OPTIONS') {
		return res.status(200).end();
	}
	next();
});

primate.setup();
await primate.start();

primate.app.use('/', defaultRouter);
primate.app.use('/ai', ai);
primate.app.use('/blinks', blinks);