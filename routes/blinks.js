import { getRouter, auth } from '@thewebchimp/primate';
import SolanaActionController from '../controllers/solana-action.controller.js';

const router = getRouter();

router.post('/', auth, SolanaActionController.createBlink);

// Dynamic route for handling all Solana actions
router.all('/*', SolanaActionController.handleAction);

export { router };
