import {prisma} from "@thewebchimp/primate";

class MessageService {
	static async getMessages(data){
		const {idChat, limit = 10, offset = 0} = data;
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
}

export default MessageService;
