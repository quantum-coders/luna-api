import {prisma} from "@thewebchimp/primate";

class ChatService {
	/**
	 * Retrieves an existing chat by its external ID or creates a new one if it doesn't exist.
	 * @param {Object} data - The data object containing information about the chat.
	 * @param {string|number} data.idExternal - The external ID of the chat.
	 * @param {string} data.type - The type of the chat.
	 * @param {string} [data.title] - The title of the chat. Defaults to 'Telegram Chat' if not provided.
	 * @param {string|number} data.idUser - The ID of the user associated with the chat.
	 * @returns {Promise<Object>} The chat object, either existing or newly created.
	 */
	static async getOrCreateTelegram(data) {
		let chat = await prisma.chat.findUnique({
			where: {
				idExternal: String(data.idExternal),
			},
		});
		if (!chat) {
			chat = prisma.chat.create({
				data: {
					idExternal: String(data.idExternal),
					type: data.type,
					title: data.title || 'Telegram Chat',
					idUser: data.idUser,
				},
			});
		}
		return chat;
	}

	/**
	 * Saves a message to a specific chat.
	 * @param {Object} data - The data object containing information about the message.
	 * @param {string|number} data.idChat - The ID of the chat where the message is sent.
	 * @param {string|number} [data.responseTo] - The ID of the message this message is responding to.
	 * @param {string} data.content - The content of the message.
	 * @param {string} [data.messageType='text'] - The type of the message, defaults to 'text'.
	 * @param {string|number} data.idUser - The ID of the user who sent the message.
	 * @returns {Promise<Object>} The newly created message object.
	 */
	static async saveMessage(data) {
		const {idChat, responseTo, content, messageType = 'text', idUser, role = 'user'} = data;
		return prisma.message.create({
			data: {
				idChat,
				role,
				idUser,
				content,
				messageType,
				responseTo,
			},
		});
	}

	static async get(idChat) {
		try {
			return await prisma.chat.findUnique({
				where: {
					id: idChat,
				},
			});
		} catch (e) {
			console.error(e);
		}
	}

	static async getByUid(uid) {
		try {
			return await prisma.chat.findUnique({
				where: {
					uid: uid,
				},
			});
		} catch (e) {
			console.error
		}
	}

	static async create(data) {
		try {
			return await prisma.chat.create({
				data,
			});
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Retrieves paginated chats for a specific user, optionally filtered by chat type.
	 * @param {Object} params - The parameters for fetching chats.
	 * @param {number} params.userId - The ID of the user whose chats to retrieve.
	 * @param {string} [params.type] - The type of chats to retrieve (optional).
	 * @param {number} [params.page=1] - The page number to retrieve (default: 1).
	 * @param {number} [params.pageSize=10] - The number of chats per page (default: 10).
	 * @param {string} [params.orderBy='created'] - The field to order the results by (default: 'created').
	 * @param {string} [params.orderDirection='desc'] - The direction to order the results (default: 'desc').
	 * @returns {Promise<Object>} An object containing the paginated chats and metadata.
	 */
	static async getUserChats({
		                          userId,
		                          type,
		                          page = 1,
		                          pageSize = 10,
		                          orderBy = 'created',
		                          orderDirection = 'desc'
	                          }) {
		try {
			const skip = (page - 1) * pageSize;
			const where = {idUser: userId};

			if (type) {
				where.type = type;
			}

			const [chats, totalCount] = await Promise.all([
				prisma.chat.findMany({
					where,
					skip,
					take: pageSize,
					orderBy: {[orderBy]: orderDirection},
					include: {
						user: {
							select: {
								id: true,
								username: true,
								firstname: true,
								lastname: true
							}
						},
						messages: {
							take: 1,
							orderBy: {created: 'desc'},
							select: {
								content: true,
								created: true
							}
						}
					}
				}),
				prisma.chat.count({where})
			]);

			const totalPages = Math.ceil(totalCount / pageSize);

			return {
				chats: chats.map(chat => ({
					...chat,
					lastMessage: chat.messages[0] || null
				})),
				metadata: {
					currentPage: page,
					pageSize,
					totalCount,
					totalPages,
					hasNextPage: page < totalPages,
					hasPreviousPage: page > 1
				}
			};
		} catch (error) {
			console.error('Error fetching user chats:', error);
			throw new Error('Failed to fetch user chats');
		}
	}

}

export default ChatService;
