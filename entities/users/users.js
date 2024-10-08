import { getRouter, auth, setupRoute } from '@thewebchimp/primate';
import optionalAuth  from "../../middlewares/optionalAuth.js";
import UserController from './user.controller.js';
const router = getRouter();

const options = {
	model: 'User',
	searchField: [ 'username' ],
	queryableFields: [ 'nicename','email' ],
};

// Functions -----------------------------------------------------------------------------------------------------------
router.post('/authenticate', optionalAuth, UserController.authenticate);

// register
router.post('/register', UserController.register);

// me
router.get('/me', auth, UserController.me);

//login
router.post('/login', UserController.login);

//switch to user
router.post('/switch', auth, UserController.switch);

// get avatar
router.get('/:id/avatar', UserController.avatar);

// update profile
router.put('/:id/profile', auth, UserController.updateProfile);

router.get('/me/blinks', auth, UserController.userBlinks);

router.post('/me/chat', auth, UserController.createChat)

router.get('/me/chat/:id', auth, UserController.getChat)

router.get('/me/chat/:uid/history', auth, UserController.getChatHistory);

router.get('/me/chats', auth, UserController.getUserChats);
// ---------------------------------------------------------------------------------------------------------------------

setupRoute('user', router, options);

export { router };
