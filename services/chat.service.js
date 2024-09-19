import { prisma } from "@thewebchimp/primate";

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
  static async getOrCreate(data) {
    let chat = await prisma.chat.findUnique({
      where: {
        idExternal: String(data.idExternal),
      },
    });
    console.log('Chat:', chat);
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
    const { idChat, responseTo, content, messageType = 'text', idUser } = data;
    return prisma.message.create({
      data: {
        idChat,
        idUser,
        content,
        messageType,
        responseTo,
      },
    });
  }
}

export default ChatService;
