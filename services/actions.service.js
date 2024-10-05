import {prisma} from "@thewebchimp/primate";

class ActionsService {
  static async create(data) {
    try {
      this.validateActionData(data);

      const latestAction = await prisma.actionSolved.findFirst({
        where: { idMessage: data.idMessage },
        orderBy: { order: 'desc' },
      });

      const order = latestAction ? latestAction.order + 1 : 1;

      return await prisma.actionSolved.create({
        data: { ...data, order },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('A unique constraint would be violated.');
      }
      throw error;
    }
  }

  static async findById(id) {
    return await prisma.actionSolved.findUnique({ where: { id } });
  }

  static async findByMessageId(messageId) {
    return await prisma.actionSolved.findMany({
      where: { idMessage: messageId },
      orderBy: { order: 'asc' },
    });
  }

  static async update(id, data) {
    try {
      this.validateActionData(data, true);
      return await prisma.actionSolved.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Record to update not found.');
      }
      throw error;
    }
  }

  static async delete(id) {
    try {
      await prisma.actionSolved.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Record to delete not found.');
      }
      throw error;
    }
  }

  static validateActionData(data, isUpdate = false) {
    if (!isUpdate) {
      if (!data.idMessage) throw new Error('idMessage is required');
      if (!data.actionName) throw new Error('actionName is required');
      if (!data.actionArgs) throw new Error('actionArgs is required');
    }

    if (data.idMessage !== undefined && typeof data.idMessage !== 'number') {
      throw new Error('idMessage must be a number');
    }

    if (data.actionName !== undefined && typeof data.actionName !== 'string') {
      throw new Error('actionName must be a string');
    }

    if (data.actionArgs !== undefined && typeof data.actionArgs !== 'object') {
      throw new Error('actionArgs must be an object');
    }

    if (data.order !== undefined && typeof data.order !== 'number') {
      throw new Error('order must be a number');
    }
  }
}

export default ActionsService;
