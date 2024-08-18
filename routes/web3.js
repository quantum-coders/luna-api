import { getRouter, setupRoute } from '@thewebchimp/primate';
import Web3Controller from '../controllers/web3.controller.js';
const router = getRouter();

router.get('/deeplink', Web3Controller.createDeepLink);

export { router };