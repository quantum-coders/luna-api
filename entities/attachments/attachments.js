import { getRouter, auth, setupRoute } from '@thewebchimp/primate';
import AttachmentController from './attachment.controller.js';
const router = getRouter();

const options = {};

// Functions -----------------------------------------------------------------------------------------------------------

// register
router.get('/:id', AttachmentController.viewAttachment);

// ---------------------------------------------------------------------------------------------------------------------

setupRoute('attachment', router, options);

export { router };