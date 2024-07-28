import Joi from 'joi';

const schema = Joi.object({
	id: Joi.number().integer().positive().optional(),
	uid: Joi.string().guid({ version: [ 'uuidv4' ] }).optional(), // Adjusting for UUID v4, adjust if needed
	username: Joi.string().alphanum().required(),
	email: Joi.string().optional().default(''),
	firstname: Joi.string().optional().default(''),
	lastname: Joi.string().optional().default(''),
	nicename: Joi.string().optional().default(''),
	password: Joi.string().optional().default(''),
	type: Joi.string().valid('User', 'Admin', 'SuperAdmin').default('User'),
	status: Joi.string().valid('Active', 'Inactive').default('Active'),
	language: Joi.string().valid('en', 'es').default('es'),
	metas: Joi.object().default({}),
	created: Joi.date(),
	modified: Joi.date(),
});

export default schema;