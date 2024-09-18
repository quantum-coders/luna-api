import {prisma} from "@thewebchimp/primate";
class ChatService {
	static async getOrCreate(data) {
		let chat = await prisma.chat.findUnique({
			where: {
				idExternal: String(data.idExternal),
			},
		});
		console.log('Chat:', chat)
		if (!chat) {
			chat =  prisma.chat.create({
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

	static async saveMessage(data) {

	}
}

export default ChatService;
