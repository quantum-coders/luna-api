import {getRouter, setupRoute} from '@thewebchimp/primate';
import TokensController from '../controllers/tokens.controller.js';
const router = getRouter();

router.get('/:id', TokensController.getTokens);


export { router };

