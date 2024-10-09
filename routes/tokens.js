import { getRouter, setupRoute } from '@thewebchimp/primate';
import TokensController from '../controllers/tokens.controller.js';
const router = getRouter();

router.get('/', TokensController.getTokens);

router.get('/quote', TokensController.getQuote);

export { router };
