import { getRouter, setupRoute } from '@thewebchimp/primate';
import Web3Controller from '../controllers/web3.controller.js';
const router = getRouter();

router.get('/public-key', Web3Controller.generatePublicKey);

router.post('/decode-wallet', Web3Controller.decodeWalletPayload);

export { router };