import { jwt } from '@thewebchimp/primate';

/**
 * Authentication middleware to verify JWT tokens, but it's optional.
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
		next();
	}
};

export default optionalAuth;
