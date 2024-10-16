import {prisma} from "@thewebchimp/primate";

/**
 * Service class for handling AnalysisRequest operations.
 */
class AnalysisRequestService {
	/**
	 * Creates a new AnalysisRequest.
	 * @param {Object} data - The data required to create the AnalysisRequest.
	 * @returns {Promise<Object>} The created AnalysisRequest.
	 */
	static async createAnalysisRequest(data) {
		// Validate input data
		if (!data.idUser || !data.idMessage) {
			throw new Error('idUser and idMessage are required.');
		}

		// Create the AnalysisRequest
		return await prisma.analysisRequest.create({
			data,
			include: {
				tokens: true,
				AnalysisRequestStrategy: true,
				AnalysisReport: true,
			},
		});
	}

	/**
	 * Retrieves an AnalysisRequest by its ID.
	 * @param {number} id - The ID of the AnalysisRequest.
	 * @returns {Promise<Object|null>} The AnalysisRequest found or null if not found.
	 */
	static async getAnalysisRequestById(id) {
		// Validate the ID
		if (!id) {
			throw new Error('ID is required.');
		}

		return await prisma.analysisRequest.findUnique({
			where: {id},
			include: {
				tokens: true,
				AnalysisRequestStrategy: true,
				AnalysisReport: true,
			},
		});
	}

	/**
	 * Updates an AnalysisRequest entirely.
	 * @param {number} id - The ID of the AnalysisRequest to update.
	 * @param {Object} data - The data to update the AnalysisRequest.
	 * @returns {Promise<Object>} The updated AnalysisRequest.
	 */
	static async updateAnalysisRequest(id, data) {
		// Validate inputs
		if (!id) {
			throw new Error('ID is required.');
		}
		if (!data) {
			throw new Error('Update data is required.');
		}

		return await prisma.analysisRequest.update({
			where: {id},
			data,
			include: {
				tokens: true,
				AnalysisRequestStrategy: true,
				AnalysisReport: true,
			},
		});
	}

	/**
	 * Partially updates (patches) an AnalysisRequest.
	 * @param {number} id - The ID of the AnalysisRequest to patch.
	 * @param {Object} data - The data to patch the AnalysisRequest.
	 * @returns {Promise<Object>} The patched AnalysisRequest.
	 */
	static async patchAnalysisRequest(id, data) {
		// Validate inputs
		if (!id) {
			throw new Error('ID is required.');
		}
		if (!data) {
			throw new Error('Patch data is required.');
		}

		// Partial update
		return await prisma.analysisRequest.update({
			where: {id},
			data,
			include: {
				tokens: true,
				AnalysisRequestStrategy: true,
				AnalysisReport: true,
			},
		});
	}

	/**
	 * Deletes an AnalysisRequest by its ID.
	 * @param {number} id - The ID of the AnalysisRequest to delete.
	 * @returns {Promise<Object>} The deleted AnalysisRequest.
	 */
	static async deleteAnalysisRequest(id) {
		// Validate the ID
		if (!id) {
			throw new Error('ID is required.');
		}

		return await prisma.analysisRequest.delete({
			where: {id},
		});
	}
}
