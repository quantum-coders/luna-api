import mailchimpTx from '@mailchimp/mailchimp_transactional';
import 'dotenv/config';

const mailchimp = mailchimpTx(process.env.MANDRILL_API_KEY);

class MandrillService {
	static async ping() {
		try {
			return await mailchimp.users.ping();
		} catch(error) {
			console.error('Error pinging Mandrill API:', error);
			throw error;
		}
	}

	static async addSenderDomain(domain) {
		try {
			return await mailchimp.senders.addDomain({ domain });
		} catch(error) {
			console.error('Error adding sender domain:', error);
			throw error;
		}
	}

	static async listSenderDomains() {
		try {
			return await mailchimp.senders.domains();
		} catch(error) {
			console.error('Error listing sender domains:', error);
			throw error;
		}
	}

	static async checkDomainSettings(domain) {
		try {
			return await mailchimp.senders.checkDomain({ domain });
		} catch(error) {
			console.error('Error checking domain settings:', error);
			throw error;
		}
	}

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

	static async getIpInfo() {
		try {
			return await mailchimp.ips.info();
		} catch(error) {
			console.error('Error getting IP info:', error);
			throw error;
		}
	}

	static async requestAdditionalIp() {
		try {
			return await mailchimp.ips.provision();
		} catch(error) {
			console.error('Error requesting additional IP:', error);
			throw error;
		}
	}

	static async startIpWarmup(ip) {
		try {
			return await mailchimp.ips.startWarmup({ ip });
		} catch(error) {
			console.error('Error starting IP warmup:', error);
			throw error;
		}
	}

	static async moveIpToDifferentPool(ip, pool) {
		try {
			return await mailchimp.ips.setPool({ ip, pool });
		} catch(error) {
			console.error('Error moving IP to different pool:', error);
			throw error;
		}
	}

	static async listIpPools() {
		try {
			return await mailchimp.ips.listPools();
		} catch(error) {
			console.error('Error listing IP pools:', error);
			throw error;
		}
	}

	static async sendMessage(message) {
		try {
			return await mailchimp.messages.send({ message });
		} catch(error) {
			console.error('Error sending message:', error);
			throw error;
		}
	}

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

	static async getMessageInfo(id) {
		try {
			return await mailchimp.messages.info({ id });
		} catch(error) {
			console.error('Error getting message info:', error);
			throw error;
		}
	}

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

	static async listTemplates() {
		try {
			return await mailchimp.templates.list();
		} catch(error) {
			console.error('Error listing templates:', error);
			throw error;
		}
	}

	static async deleteTemplate(name) {
		try {
			return await mailchimp.templates.delete({ name });
		} catch(error) {
			console.error('Error deleting template:', error);
			throw error;
		}
	}

	// Método para obtener estadísticas detalladas sobre los mensajes enviados
	static async getMessageStats() {
		try {
			return await mailchimp.messages.search();
		} catch(error) {
			console.error('Error getting message stats:', error);
			throw error;
		}
	}

	// Métodos para la gestión de Webhooks
	static async createWebhook(url, events) {
		try {
			return await mailchimp.webhooks.add({ url, events });
		} catch(error) {
			console.error('Error creating webhook:', error);
			throw error;
		}
	}

	static async listWebhooks() {
		try {
			return await mailchimp.webhooks.list();
		} catch(error) {
			console.error('Error listing webhooks:', error);
			throw error;
		}
	}

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
