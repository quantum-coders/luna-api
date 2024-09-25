import { prisma } from '@thewebchimp/primate';

class BlinkService {

    /**
     * Creates a new blink associated with a user.
     *
     * @param {Object} user - The user to associate the blink with.
     * @param {Object} props - The data for the blink to be created.
     * @returns {Promise<Object>} - A promise that resolves with the created blink.
     */
	static async createBlink(user, props) {
		return prisma.blink.create({
			data: {
				idUser: user.id,
				data: props,
			},
		});
	}

    /**
     * Updates an existing blink if it belongs to the user.
     *
     * @param {Object} user - The user who owns the blink.
     * @param {string} id - The ID of the blink to be updated.
     * @param {Object} props - The new data for the blink.
     * @returns {Promise<Object>} - A promise that resolves with the updated blink.
     * @throws {Error} - Throws an error if the blink is not found or does not belong to the user.
     */
	static async updateBlink(user, id, props) {

		// Check that the blink exists and belongs to the user
		const blink = await prisma.blink.findFirst({
			where: { id },
		});

		if(!blink || blink.idUser !== user.id) {
			throw new Error('Blink not found');
		}

		return prisma.blink.update({
			where: { id },
			data: props,
		});
	}
}

export default BlinkService;
