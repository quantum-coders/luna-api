import { prisma } from '@thewebchimp/primate';

class BlinkService {

	static async createBlink(user, props) {

		return prisma.blink.create({
			data: {
				idUser: user.id,
				data: props,
			},
		});
	}
}

export default BlinkService;