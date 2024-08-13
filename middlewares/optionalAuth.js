import {jwt} from '@thewebchimp/primate';

/**
 * Authentication middleware to verify JWT tokens.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @throws {Error} If any error occurs during token verification.
 */

const optionalAuth = async (req, res, next) => {
	try {
		// Validate the Authorization header
		const authHeader = req.headers.authorization;
		if(!authHeader) {
			next();
		}

		// Extract the token from the Authorization header
		const token = authHeader.split(' ')[1];
		if(!token) {
			next();
		}

		// Verify the JWT token
		req.user = await jwt.verifyAccessToken(token);
		next();

	} catch(e) {
		if(e.name === 'TokenExpiredError') {
			res.respond({
				status: 401,
				message: 'Unauthorized: Token has expired: ' + e.message,
			});
		} else if(e.name === 'JsonWebTokenError') {
			res.respond({
				status: 401,
				message: 'Unauthorized: Invalid token: ' + e.message,
			});
		} else {
			res.respond({
				status: 401,
				message: 'Unathorized: ' + e.message,
			});
		}
	}
};

export default optionalAuth;
