import primate from '@thewebchimp/primate';

import {router as ai} from './routes/ai.js';
import {router as blinks} from './routes/blinks.js';
import {router as defaultRouter} from './routes/default.js';
import {router as tokens} from './routes/tokens.js';
import {router as web3} from './routes/web3.js';
import bot from './telegram.main.js';

primate.app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
	// If you need to handle pre-flight OPTIONS request, you can respond with status 200
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}
	next();
});

primate.setup();
await primate.start();
primate.app.use('/ai', ai);
primate.app.use('/blinks', blinks);
primate.app.use('/tokens', tokens);
primate.app.use('/web3', web3);
primate.app.use('/', defaultRouter);
console.log("checkpoint 1")
bot.start();

