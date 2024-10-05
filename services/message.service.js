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
		if (limit !== -1 && (limit < 1 || limit > 100)) {
			throw new Error("El 'limit' debe estar entre 1 y 100, o ser -1 para obtener todos los mensajes.");
		}
		if (offset < 0) {
			throw new Error("El 'offset' no puede ser negativo.");
		}

		let messages, total;

		if (limit === -1) {
			// Obtener todos los mensajes sin limitación
			[messages, total] = await Promise.all([
				prisma.message.findMany({
					where: {
						idChat,
					},
					orderBy: {
						created: 'asc',
					},
					include: {
						variants: true, // Esto incluirá variantes para los mensajes que las tengan
						rims: true,
					},
				}),
				prisma.message.count({
					where: {
						idChat,
					},
				}),
			]);
		} else {
			// Obtener mensajes con limit y offset
			[messages, total] = await Promise.all([
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
						variants: true, // Esto incluirá variantes para los mensajes que las tengan
						rims: true,
					},
				}),
				prisma.message.count({
					where: {
						idChat,
					},
				}),
			]);
		}

		// Calcular si hay una página siguiente
		const hasNextPage = offset + limit < total;

		return {
			messages,
			pagination: {
				total,
				limit: limit === -1 ? total : limit,
				offset,
				hasNextPage: limit === -1 ? false : hasNextPage,
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

	/**
	 * Retrieves the message history for a specific chat.
	 *
	 * @param {Object} data - The data for retrieving the message history.
	 * @param {number} data.idChat - The ID of the chat.
	 * @param {number} [data.limit=10] - The maximum number of messages to retrieve. Defaults to 10.
	 * @param {number} [data.offset=0] - The number of messages to skip. Defaults to 0.
	 * @returns {Promise<Array>} - A promise that resolves to an array of message objects.
	 */
	static async getMessageHistory(data) {
		const {uid, limit = 10, offset = 0} = data;

		if (!uid) {
			throw new Error("No chat UID available in the route.");
		}
		if (limit < 1) {
			throw new Error("Limit must be greater than 0.");
		}
		if (offset < 0) {
			throw new Error("Offset must be greater than or equal to 0.");
		}

		return prisma.message.findMany({
			where: {
				chat: {
					uid,
				},
			},
			orderBy: {
				created: 'asc',
			},
			take: limit,
			skip: offset,
		});
	}

}

export default MessageService;
