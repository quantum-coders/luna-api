import {prisma} from "@thewebchimp/primate";

/**
 * Service for handling message-related operations.
 */
class MessageService {
	/**
	 * Retrieves a paginated list of messages for a specific chat.
	 *
	 * @param {Object} data - The data for retrieving messages.
	 * @param {number} data.idChat - The ID of the chat.
	 * @param {number} [data.limit=10] - The maximum number of messages to retrieve. Defaults to 10.
	 * @param {number} [data.offset=0] - The number of messages to skip. Defaults to 0.
	 * @returns {Promise<Object>} - A promise that resolves to an object containing messages and pagination info.
	 */
	static async getPaginatedMessages(data) {
		const {idChat, limit = 10, offset = 0} = data;

		// Validar los parámetros de entrada
		if (!idChat) {
			throw new Error("El campo 'idChat' es obligatorio.");
		}
		if (limit < 1 || limit > 100) {
			throw new Error("El 'limit' debe estar entre 1 y 100.");
		}
		if (offset < 0) {
			throw new Error("El 'offset' no puede ser negativo.");
		}

		const [messages, total] = await Promise.all([
			prisma.message.findMany({
				where: {
					idChat,
				},
				orderBy: {
					created: 'asc',
				},
				take: limit,
				skip: offset,
				include: {
					variants: true, // This will include variants for messages that have them
				},
			}),
			prisma.message.count({
				where: {
					idChat,
				},
			}),
		]);

		// print all mesasges
		// Calcular si hay una página siguiente
		const hasNextPage = offset + limit < total;

		return {
			messages,
			pagination: {
				total,
				limit,
				offset,
				hasNextPage,
			},
		};
	}

	/**
	 * Retrieves the latest message sent by a user in a specific chat.
	 *
	 * @param {Object} data - The data for retrieving the latest user message.
	 * @param {number} data.idChat - The ID of the chat.
	 * @returns {Promise<Object|null>} - A promise that resolves to the latest user message object, or null if none exists.
	 */
	static async getLatestUserMessage(data) {
		const {idChat} = data;
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

	/**
	 * Saves a new message to the database.
	 *
	 * @param {Object} data - The data for the new message.
	 * @param {number} data.idChat - The ID of the chat.
	 * @param {string} data.content - The content of the message.
	 * @param {number} data.idUser - The ID of the user sending the message.
	 * @returns {Promise<Object>} - A promise that resolves to the created message object.
	 */
	static async saveMessage(data) {
		const {idChat, content, idUser} = data;
		if (!idChat || !content || !idUser) {
			throw new Error(`Falta el campo requerido: ${!idChat ? 'idChat' : !content ? 'content' : 'idUser'}`);
		}

		// Guardar el mensaje
		return prisma.message.create({
			data,
		});
	}

	// create a function to update a message using its uid
	// create a function to delete a message using its uid

	static async updateMessageByUid(uid, data) {
		return prisma.message.update({
			where: {
				uid,
			},
			data,
		});
	}

	/**
	 * Creates a new variant for a message.
	 *
	 * @param {string} messageUid - The UID of the message.
	 * @param {Object} variantData - The data for the new variant.
	 * @param {string} variantData.type - The type of the variant (e.g., "audio", "image").
	 * @param {string} [variantData.url] - The URL of the variant content (if applicable).
	 * @param {Object} [variantData.data] - Additional data for the variant (as JSON).
	 * @param {string} [variantData.mimeType] - The MIME type of the variant content.
	 * @param {number} [variantData.size] - The size of the variant content in bytes.
	 * @param {Object} [variantData.metadata] - Additional metadata for the variant (as JSON).
	 * @returns {Promise<Object>} - A promise that resolves to the created variant object.
	 * @throws {Error} - If the message with the given UID is not found or if required fields are missing.
	 */
	static async createVariant(messageUid, variantData) {
		// Validate required fields
		if (!messageUid || !variantData.type) {
			throw new Error("messageUid and variantData.type are required.");
		}

		// Find the message by UID
		const message = await prisma.message.findUnique({
			where: {uid: messageUid}
		});

		if (!message) {
			throw new Error(`Message with UID ${messageUid} not found.`);
		}

		// Create the variant
		return prisma.variant.create({
			data: {
				...variantData,
				message: {connect: {id: message.id}}
			}
		});
	}

}

export default MessageService;
