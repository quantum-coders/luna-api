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

	static async updateBlink(user, id, props) {

		// check that the blink exists and belongs to the user
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