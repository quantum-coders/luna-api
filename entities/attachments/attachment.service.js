import 'dotenv/config';
import { prisma } from '@thewebchimp/primate';
import AWS from 'aws-sdk';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import fs from 'fs';
import axios from 'axios';

const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT);
const s3 = new AWS.S3({
	endpoint: spacesEndpoint,
	accessKeyId: process.env.SPACES_KEY,
	secretAccessKey: process.env.SPACES_SECRET,
});

class AttachmentService {

	static findById(id) {
		try {
			return prisma.attachment.findUnique({
				where: { id: parseInt(id) },
			});
		} catch(e) {
			throw e;
		}
	}

	static get(id) {
		try {
			return prisma.attachment.findUnique({
				where: { id },
			});
		} catch(e) {
			throw e;
		}
	}

	/**
	 * Generates a URL for the given attachment, handling both public and private attachments.
	 *
	 * @param {Object} attachment - The attachment object.
	 * @param {string} attachment.acl - The access control level of the attachment.
	 * @param {Object} attachment.metas - Metadata of the attachment.
	 * @param {string} attachment.metas.location - The public location URL of the attachment.
	 * @param {string} attachment.attachment - The key of the attachment in the storage bucket.
	 * @returns {string} The URL of the attachment.
	 * @throws {Error} If any required parameter is missing or invalid.
	 */
	static getUrl(attachment) {
		if(!attachment || typeof attachment !== 'object') {
			throw new Error('The "attachment" parameter must be a non-empty object.');
		}
		if(!attachment.acl || typeof attachment.acl !== 'string') {
			throw new Error('The "attachment.acl" parameter must be a non-empty string.');
		}
		if(!attachment.metas || typeof attachment.metas !== 'object') {
			throw new Error('The "attachment.metas" parameter must be a non-empty object.');
		}
		if(!attachment.metas.location || typeof attachment.metas.location !== 'string') {
			throw new Error('The "attachment.metas.location" parameter must be a non-empty string.');
		}
		if(!attachment.attachment || typeof attachment.attachment !== 'string') {
			throw new Error('The "attachment.attachment" parameter must be a non-empty string.');
		}

		let url;

		try {
			if(attachment.acl === 'public-read') {
				url = attachment.metas.location;
			} else {
				url = s3.getSignedUrl('getObject', {
					Bucket: process.env.SPACES_BUCKET_NAME,
					Key: attachment.attachment,
					Expires: 60 * 60 * 24 * 7, // 7 days
				});
			}
		} catch(e) {
			console.error('Error generating URL for attachment:', e);
			throw new Error(`Error generating URL: ${ e.message }`);
		}

		return url;
	}

	static async createAttachmentFromLocalFile(file, params = {}) {
		try {

			// get the name from the file path
			const name = file.split('/').pop();

			// get the size of the file
			const stats = fs.statSync(file);

			const fileObj = {
				mimetype: mime.lookup(file),
				originalname: name,
				size: stats.size,
				buffer: fs.readFileSync(file),
			};

			return AttachmentService.createAttachment(fileObj, params);

		} catch(error) {
			throw error;
		}
	}

	static async createAttachment(file, params = {}) {
		try {

			// get the mime type of file
			const mimeType = file.mimetype;
			const acl = params.acl || 'public-read';

			// The file should go to /upload/[year]/[month]/[filename]
			const date = new Date();
			const year = date.getFullYear();
			let month = date.getMonth() + 1;

			// add padded zero to month
			if(month < 10) month = '0' + month;

			// append uuid to file original name
			const uuid = uuidv4();
			let filename = `${ uuid }-${ file.originalname }`;

			// slugify filename
			filename = slugify(filename, { lower: true });

			const fileBuffer = file.buffer;

			const s3Params = {
				Bucket: process.env.SPACES_BUCKET_NAME,
				Key: `upload/${ year }/${ month }/${ filename }`,
				Body: file.buffer,
				ACL: acl,
				ContentType: mimeType,
			};

			// s3 upload with await
			const data = await s3.upload(s3Params).promise();

			// Create attachment in database
			const attachment = await prisma.attachment.create({
				data: {
					name: file.originalname,
					slug: filename,
					attachment: `upload/${ year }/${ month }/${ filename }`,
					mime: mimeType,
					size: file.size,
					source: 'digitalocean',
					acl: acl,
					metas: {
						location: data.Location,
					},
				},
			});

			return {
				attachment,
				data,
			};

		} catch(error) {
			throw error;
		}
	}

	static async viewFile(id) {
		try {
			const attachment = await prisma.attachment.findUnique({
				where: { id: parseInt(id) },
			});

			// get attachment location
			return AttachmentService.getUrl(attachment);

		} catch(e) {
			throw e;
		}
	}

	static async getBuffer(url) {
		try {
			return axios({ url, responseType: 'arraybuffer' });
		} catch(e) {
			throw e;
		}
	}
}

export default AttachmentService;