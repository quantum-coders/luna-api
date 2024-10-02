import {prisma} from "@thewebchimp/primate";

/**
 * Service class for managing Variant entities
 */
class VariantService {

  /**
   * Creates a new Variant
   * @param {Object} variantData - The data for the new Variant
   * @returns {Promise<Object>} The created Variant
   */
  async createVariant(variantData) {
    try {
      return await prisma.variant.create({
        data: variantData,
      });
    } catch (error) {
      console.error('Error creating variant:', error);
      throw error;
    }
  }

  /**
   * Retrieves a Variant by its ID
   * @param {number} id - The ID of the Variant
   * @returns {Promise<Object|null>} The Variant if found, null otherwise
   */
  async getVariantById(id) {
    try {
      return await prisma.variant.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('Error getting variant by ID:', error);
      throw error;
    }
  }

  /**
   * Updates an existing Variant
   * @param {number} id - The ID of the Variant to update
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} The updated Variant
   */
  async updateVariant(id, updateData) {
    try {
      return await prisma.variant.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating variant:', error);
      throw error;
    }
  }

  /**
   * Deletes a Variant by its ID
   * @param {number} id - The ID of the Variant to delete
   * @returns {Promise<Object>} The deleted Variant
   */
  async deleteVariant(id) {
    try {
      return await prisma.variant.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting variant:', error);
      throw error;
    }
  }

  /**
   * Retrieves all Variants for a specific Message
   * @param {number} messageId - The ID of the Message
   * @returns {Promise<Array<Object>>} An array of Variants
   */
  async getVariantsByMessageId(messageId) {
    try {
      return await prisma.variant.findMany({
        where: { idMessage: messageId },
      });
    } catch (error) {
      console.error('Error getting variants by message ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all Variants with optional filtering and pagination
   * @param {Object} options - The options for filtering and pagination
   * @param {number} [options.skip] - The number of records to skip
   * @param {number} [options.take] - The number of records to take
   * @param {Object} [options.where] - The filter conditions
   * @returns {Promise<Array<Object>>} An array of Variants
   */
  async getAllVariants(options = {}) {
    try {
      return await prisma.variant.findMany(options);
    } catch (error) {
      console.error('Error getting all variants:', error);
      throw error;
    }
  }

  /**
 * Creates a new Variant for an audio attachment and associates it with a message
 * @param {string} messageUid - The UID of the Message
 * @param {Object} audioAttachment - The audio attachment data
 * @param {string} audioAttachment.url - The URL of the audio file
 * @param {string} audioAttachment.mimeType - The MIME type of the audio file
 * @param {number} audioAttachment.size - The size of the audio file in bytes
 * @param {string} originalText - The original text used to generate the audio
 * @returns {Promise<Object>} The created Variant
 */
static async createAudioVariant(messageUid, audioAttachment) {
  try {
    // First, find the Message ID using the UID
    const message = await prisma.message.findUnique({
      where: { uid: messageUid },
      select: { id: true }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Create the new Variant
    const newVariant = await prisma.variant.create({
      data: {
        idMessage: message.id,
        type: 'audio',
        url: audioAttachment.url,
        mimeType: audioAttachment.mime,
        size: audioAttachment.size,
        metadata: { }
      }
    });


    return newVariant;
  } catch (error) {
    console.error('Error creating audio variant:', error);
    throw error;
  }
}
}

export default VariantService;
