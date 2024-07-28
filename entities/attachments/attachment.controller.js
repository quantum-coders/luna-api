import AttachmentService from './attachment.service.js';

class AttachmentController {

	/**
	 * Views an attachment by redirecting to its URL.
	 *
	 * @param {object} req - The request object containing the attachment ID.
	 * @param {object} res - The response object for sending the results.
	 * @returns {void}
	 * @throws {Error} - Throws an error if parameters are invalid or if there is a service error.
	 */
	static async viewAttachment(req, res) {
		try {
			const { id } = req.params;

			// Validate input parameter
			if(!id) {
				return res.respond({
					status: 400,
					message: 'Attachment ID is required.',
				});
			}

			// Fetch the URL of the attachment by ID
			const url = await AttachmentService.viewFile(id);

			// Validate output from AttachmentService
			if(!url) {
				return res.respond({
					status: 404,
					message: 'Attachment not found.',
				});
			}

			// Redirect to the URL
			res.redirect(url);

		} catch(error) {
			// Handle errors and send appropriate response
			console.error('Error viewing attachment:', error);
			res.respond({
				status: 500,
				message: 'Error viewing attachment: ' + error.message,
			});
		}
	}
}

export default AttachmentController;