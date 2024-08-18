import { getRouter, setupRoute } from '@thewebchimp/primate';
import Web3Controller from '../controllers/web3.controller.js';
const router = getRouter();

router.get('/public-key', Web3Controller.generatePublicKey);

export { router };