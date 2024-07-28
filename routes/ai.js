import { auth, getRouter } from '@thewebchimp/primate';
import AIController from '../controllers/ai.controller.js';
const router = getRouter();

router.post('/message', AIController.sendMessage);

router.post('/message/rim', AIController.messageToRIM);

router.post('/audio-to-text', AIController.audioToText);

router.post('/text-to-audio', AIController.textToAudio);

router.post('/image', AIController.createImage);

export { router };

