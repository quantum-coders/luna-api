import mailchimpTx from '@mailchimp/mailchimp_transactional';
import 'dotenv/config';

const mailchimp = mailchimpTx(process.env.MANDRILL_API_KEY);

class MandrillService {
	/**
	 * Ping the Mandrill API to check the connection.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if the ping fails.
	 */
	static async ping() {
		try {
			return await mailchimp.users.ping();
		} catch(error) {
			console.error('Error pinging Mandrill API:', error);
			throw error;
		}
	}

	/**
	 * Add a sender domain to Mandrill.
	 * @param {string} domain - The domain to add.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if adding the domain fails.
	 */
	static async addSenderDomain(domain) {
		try {
			return await mailchimp.senders.addDomain({ domain });
		} catch(error) {
			console.error('Error adding sender domain:', error);
			throw error;
		}
	}

	/**
	 * List all sender domains added to Mandrill.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if listing sender domains fails.
	 */
	static async listSenderDomains() {
		try {
			return await mailchimp.senders.domains();
		} catch(error) {
			console.error('Error listing sender domains:', error);
			throw error;
		}
	}

	/**
	 * Check the settings of a specific sender domain.
	 * @param {string} domain - The domain to check.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if checking domain settings fails.
	 */
	static async checkDomainSettings(domain) {
		try {
			return await mailchimp.senders.checkDomain({ domain });
		} catch(error) {
			console.error('Error checking domain settings:', error);
			throw error;
		}
	}

	/**
	 * Verify a sender domain by sending a verification email.
	 * @param {string} domain - The domain to verify.
	 * @param {string} mailbox - The email address to send the verification to.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if domain verification fails.
	 */
	static async verifyDomain(domain, mailbox) {
		try {
			return await mailchimp.senders.verifyDomain({
				domain,
				mailbox,
			});
		} catch(error) {
			console.error('Error verifying domain:', error);
			throw error;
		}
	}

	/**
	 * Get information about the IPs associated with the account.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if getting IP info fails.
	 */
	static async getIpInfo() {
		try {
			return await mailchimp.ips.info();
		} catch(error) {
			console.error('Error getting IP info:', error);
			throw error;
		}
	}

	/**
	 * Request an additional IP address for the account.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if requesting an additional IP fails.
	 */
	static async requestAdditionalIp() {
		try {
			return await mailchimp.ips.provision();
		} catch(error) {
			console.error('Error requesting additional IP:', error);
			throw error;
		}
	}

	/**
	 * Start the warm-up process for a given IP address.
	 * @param {string} ip - The IP address to warm up.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if starting the IP warm-up fails.
	 */
	static async startIpWarmup(ip) {
		try {
			return await mailchimp.ips.startWarmup({ ip });
		} catch(error) {
			console.error('Error starting IP warmup:', error);
			throw error;
		}
	}

	/**
	 * Move an IP address to a different pool.
	 * @param {string} ip - The IP address to move.
	 * @param {string} pool - The name of the pool to move the IP to.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if moving the IP to a different pool fails.
	 */
	static async moveIpToDifferentPool(ip, pool) {
		try {
			return await mailchimp.ips.setPool({ ip, pool });
		} catch(error) {
			console.error('Error moving IP to different pool:', error);
			throw error;
		}
	}

	/**
	 * List all IP pools associated with the account.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if listing IP pools fails.
	 */
	static async listIpPools() {
		try {
			return await mailchimp.ips.listPools();
		} catch(error) {
			console.error('Error listing IP pools:', error);
			throw error;
		}
	}

	/**
	 * Send a message through Mandrill.
	 * @param {Object} message - The message object to send.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if sending the message fails.
	 */
	static async sendMessage(message) {
		try {
			return await mailchimp.messages.send({ message });
		} catch(error) {
			console.error('Error sending message:', error);
			throw error;
		}
	}

	/**
	 * Send a message using a template through Mandrill.
	 * @param {string} templateName - The name of the template to use.
	 * @param {Array<Object>} templateContent - The content to be replaced in the template.
	 * @param {Object} message - The message object to send.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if sending the message using a template fails.
	 */
	static async sendMessageUsingTemplate(templateName, templateContent, message) {
		try {
			return await mailchimp.messages.sendTemplate({
				template_name: templateName,
				template_content: templateContent,
				message,
			});
		} catch(error) {
			console.error('Error sending message using template:', error);
			throw error;
		}
	}

	/**
	 * Get information about a specific message by its ID.
	 * @param {string} id - The ID of the message.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if getting the message info fails.
	 */
	static async getMessageInfo(id) {
		try {
			return await mailchimp.messages.info({ id });
		} catch(error) {
			console.error('Error getting message info:', error);
			throw error;
		}
	}

	/**
	 * Create a new template in Mandrill.
	 * @param {string} name - The name of the template.
	 * @param {string} fromEmail - The from email address.
	 * @param {string} subject - The subject of the template.
	 * @param {string} code - The HTML code for the template.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if creating the template fails.
	 */
	static async createTemplate(name, fromEmail, subject, code) {
		try {
			return await mailchimp.templates.add({
				name,
				from_email: fromEmail,
				subject,
				code,
			});
		} catch(error) {
			console.error('Error creating template:', error);
			throw error;
		}
	}

	/**
	 * List all templates in Mandrill.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if listing templates fails.
	 */
	static async listTemplates() {
		try {
			return await mailchimp.templates.list();
		} catch(error) {
			console.error('Error listing templates:', error);
			throw error;
		}
	}

	/**
	 * Delete a specific template by its name.
	 * @param {string} name - The name of the template to delete.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if deleting the template fails.
	 */
	static async deleteTemplate(name) {
		try {
			return await mailchimp.templates.delete({ name });
		} catch(error) {
			console.error('Error deleting template:', error);
			throw error;
		}
	}

	/**
	 * Get detailed statistics about sent messages.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if getting message stats fails.
	 */
	static async getMessageStats() {
		try {
			return await mailchimp.messages.search();
		} catch(error) {
			console.error('Error getting message stats:', error);
			throw error;
		}
	}

	/**
	 * Create a new webhook in Mandrill.
	 * @param {string} url - The URL of the webhook.
	 * @param {Array<string>} events - The events to trigger the webhook.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if creating the webhook fails.
	 */
	static async createWebhook(url, events) {
		try {
			return await mailchimp.webhooks.add({ url, events });
		} catch(error) {
			console.error('Error creating webhook:', error);
			throw error;
		}
	}

	/**
	 * List all webhooks in Mandrill.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if listing webhooks fails.
	 */
	static async listWebhooks() {
		try {
			return await mailchimp.webhooks.list();
		} catch(error) {
			console.error('Error listing webhooks:', error);
			throw error;
		}
	}

	/**
	 * Delete a specific webhook by its ID.
	 * @param {string} id - The ID of the webhook to delete.
	 * @returns {Promise<Object>} The response from the API.
	 * @throws Will throw an error if deleting the webhook fails.
	 */
	static async deleteWebhook(id) {
		try {
			return await mailchimp.webhooks.delete({ id });
		} catch(error) {
			console.error('Error deleting webhook:', error);
			throw error;
		}
	}
}

export default MandrillService;
