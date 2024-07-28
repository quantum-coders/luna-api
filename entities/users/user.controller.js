import createError from 'http-errors';
import queryString from 'query-string';
import axios from 'axios';

// Services
import { PrimateController } from '@thewebchimp/primate';
import UserService from './user.service.js';
import AttachmentService from '../attachments/attachment.service.js';

class UserController extends PrimateController {

	//region Auth ------------------------------------------------------------------------------------------------------
	static async authenticate(req, res, next) {
		try {
			const { user, accessToken } = await UserService.authenticate(req.body);

			res.respond({
				data: user,
				message: 'Account login successful',
				props: { accessToken },
			});

		} catch(e) {

			let message = 'Error authenticating user: ' + e.message;

			res.respond({
				status: 400,
				message,
			});
		}

	}

	static async register(req, res, next) {
		try {
			const data = await UserService.create(req.body);

			res.respond({
				data,
				message: 'Account created successfully',
			});
		} catch(e) {

			// check if user already exists
			if(e.message.includes('user_username_key')) {
				e.message = `Username ${ req.body.username } already exists`;
			}

			res.respond({
				status: 400,
				message: 'Error creating user: ' + e.message,
			});
		}
	}

	static async login(req, res, next) {
		try {
			const data = await UserService.login(req.body);

			res.respond({
				data,
				message: 'Account login successful',
			});

		} catch(e) {

			console.error(e);

			let message = 'Error login user: ' + e.message;

			res.respond({
				status: 400,
				message,
			});
		}
	};

	static async recover(req, res, next) {
		try {
			const data = await UserService.recoverPassword(req.body);

			res.respond({
				data,
				message: 'Password recovery successful',
			});

		} catch(e) {

			let message = 'Error recovering password: ' + e.message;

			console.error(e);
			res.respond({
				status: 400,
				message,
			});
		}

	};

	static async googleRedirect(req, res, next) {
		const params = queryString.stringify({
			client_id: process.env.GOOGLE_CLIENT_ID,
			redirect_uri: process.env.GOOGLE_REDIRECT_URI,
			scope: [
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile',
			].join(' '), // space seperated string
			response_type: 'code',
			access_type: 'offline',
			prompt: 'consent',
		});

		const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${ params }`;

		res.redirect(googleLoginUrl);
	};

	static async googleAuth(req, res, next) {
		// Get the code from body
		const code = req.body.code;

		if(code) {

			let token;

			try {
				// post to google
				token = await axios.post('https://oauth2.googleapis.com/token', {
					client_id: process.env.GOOGLE_CLIENT_ID,
					client_secret: process.env.GOOGLE_CLIENT_SECRET,
					redirect_uri: process.env.GOOGLE_REDIRECT_URI,
					grant_type: 'authorization_code',
					code,
				});
			} catch(e) {
				console.error(e);
				res.respond({
					status: 400,
					result: 'error',
					message: 'Error getting token',
				});
				return;
			}

			const accessToken = token.data.access_token;
			let userInfo;

			try {

				// get user info
				userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo?alt=json', {
					headers: {
						Authorization: `Bearer ${ accessToken }`,
					},
				});
			} catch(e) {
				console.error(e);
				res.respond({
					status: 400,
					result: 'error',
					message: 'Error getting user info',
				});
				return;
			}

			// Check if user exists
			const user = await UserService.findByEmail(userInfo.data.email);

			// If user exists
			if(user) {
				// If the user is not active
				if(user.status !== 'Active') {
					res.respond({
						status: 401,
						result: 'error',
						message: 'User is not active',
					});
				} else {
					const accessToken = await jwt.signAccessToken(user);

					res.respond({
						data: { ...user, accessToken },
						message: 'Account login successful',
					});
				}
			} else {
				res.respond({
					status: 404,
					result: 'error',
					message: 'User not found',
				});
			}

		} else {
			res.respond({
				status: 400,
				message: 'Invalid request',
			});
		}
	};

	static async me(req, res, next) {
		try {
			// Get user from req
			const signedUser = req.user.payload;

			const user = await UserService.findById(signedUser.id);

			// delete password
			delete user.password;

			res.status(200).json({
				status: true,
				data: user,
			});
		} catch(e) {
			next(createError(404, e.message));
		}
	};

	static async updateProfile(req, res, next) {
		try {
			if(req.params.id === 'me') req.params.id = req.user.payload.id;

			const data = await UserService.updateProfile(req.user.payload.id, req.body);

			res.respond({
				data,
				message: 'Profile updated successfully',
			});
		} catch(e) {

			res.respond({
				status: 400,
				message: 'Error updating profile: ' + e.message,
			});
		}
	}

	static async avatar(req, res, next) {

		// Get query params for width and height
		const {
			size = 128,
			width = 128,
			height = 128,
			bold = true,
			background = 'FFFFFF',
			color = '6C3FE5',
			fontSize = 64,
			border = 2,
			chars = 2,
		} = req.query;

		// Set options
		const options = { size, width, height, bold, background, color, fontSize, border, chars };

		// covert options to query string
		const query = queryString.stringify(options);

		try {

			if(!req.params.id) throw new Error('No user id provided');

			const user = await UserService.findById(req.params.id);
			let attachment;

			// check if we got user.metas.idAvatar
			if(user.metas.idAvatar) {
				// get the attachment
				attachment = await AttachmentService.findById(user.metas.idAvatar);
			}

			// if we have an attachment, return the location of the attachment
			if(attachment && attachment.metas?.location) {

				res.redirect(attachment.metas.location);

			} else {

				// Get initials
				let initials = user.firstname + ' ' + user.lastname;

				// Trim initials
				initials = initials.trim();

				// if the initials are empty, use username
				if(!initials) initials = user.username;

				// if still empty, use NA
				if(!initials) initials = 'NA';

				res.redirect(`https://ui-avatars.com/api/?name=${ initials }&${ query }`);
			}
		} catch(e) {
			console.error('Error getting avatar, using fallback:', e);
			res.redirect(`https://ui-avatars.com/api/?name=NA&${ query }`);
		}
	};

	static async switch(req, res, next) {

		try {
			const data = await UserService.switchUser(req.body);

			res.respond({
				data,
				message: 'Account switch successful',
			});

		} catch(e) {

			console.error(e);

			let message = 'Error switch user: ' + e.message;

			res.respond({
				status: 400,
				message,
			});
		}
	}

	//endregion
}

export default UserController;