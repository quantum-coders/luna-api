import { getRouter } from '@thewebchimp/primate';
import SolanaActionController from '../controllers/solana-action.controller.js';

const router = getRouter();

// Dynamic route for handling all Solana actions
router.all('/*', SolanaActionController.handleAction);

export { router };
