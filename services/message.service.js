import { prisma } from "@thewebchimp/primate";

/**
 * Service for handling message-related operations.
 */
class MessageService {
	/**
	 * Retrieves a list of messages for a specific chat.
	 *
	 * @param {Object} data - The data for retrieving messages.
	 * @param {number} data.idChat - The ID of the chat.
	 * @param {number} [data.limit=10] - The maximum number of messages to retrieve. Defaults to 10.
	 * @param {number} [data.offset=0] - The number of messages to skip. Defaults to 0.
	 * @returns {Promise<Array>} - A promise that resolves to an array of message objects.
	 */
	static async getMessages(data) {
		const { idChat, limit = 10, offset = 0 } = data;
		return prisma.message.findMany({
			where: {
				idChat,
			},
			orderBy: {
				created: 'desc',
			},
			take: limit,
			skip: offset,
		});
	}

	/**
	 * Retrieves the latest message sent by a user in a specific chat.
	 *
	 * @param {Object} data - The data for retrieving the latest user message.
	 * @param {number} data.idChat - The ID of the chat.
	 * @returns {Promise<Object|null>} - A promise that resolves to the latest user message object, or null if none exists.
	 */
	static async getLatestUserMessage(data) {
		const { idChat } = data;
		return prisma.message.findFirst({
			where: {
				idChat,
				role: 'user',
			},
			orderBy: {
				created: 'desc',
			},
		});
	}
}

export default MessageService;
