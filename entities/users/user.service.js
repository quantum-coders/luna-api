import bcrypt from 'bcrypt';
import {jwt, PrimateService, prisma} from '@thewebchimp/primate';
import createError from 'http-errors';
import hbs from 'handlebars';
import path from 'path';
import fs from 'fs';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UserService {
    static async authenticate(data) {
        const {wallet} = data;

        if (!wallet) {
            throw createError.BadRequest('Missing email or password');
        }

        let user = await prisma.user.findUnique({
            where: {username: wallet},
        });

        if (!user) {
            // create the user
            user = await UserService.create({
                username: wallet,
                nicename: wallet,
                status: 'Active',
                password: bcrypt.hashSync(wallet, 8),
            });
        } else {
        }

        // if the user is not active
        if (user.status !== 'Active') {
            throw createError.Unauthorized('User is not active');
        }

        const accessToken = await jwt.signAccessToken(user);
        return {user, accessToken};
    }

    static async login(data) {
        const {username, password} = data;

        if (!username || !password) {
            throw createError.BadRequest('Missing username or password');
        }

        const user = await prisma.user.findUnique({
            where: {username},
        });

        if (!user) {
            throw createError.NotFound('User not registered');
        }

        // if the user is not active
        if (user.status !== 'Active') {
            throw createError.Unauthorized('User is not active');
        }

        const checkPassword = bcrypt.compareSync(password, user.password);
        if (!checkPassword) throw createError.Unauthorized('Email address or password not valid');
        delete user.password;

        const accessToken = await jwt.signAccessToken(user);
        return {...user, accessToken};
    }

    static async create(data) {

        if (data.password) data.password = bcrypt.hashSync(data.password, 8);

        // if we receive username or email, we use one as the other
        if (data.username) data.email = data.username;
        else if (data.email) data.username = data.email;

        // If we receive firstname or lastname, we use them to create nicename
        if (data.firstname && data.lastname) data.nicename = data.firstname + ' ' + data.lastname;

        return PrimateService.create(data, 'user');
    }

    static async update(id, data, options = {}) {

        if (id === 'me') id = options.idUser;

        if (data.password) data.password = bcrypt.hashSync(data.password, 8);
        else delete data.password;

        return PrimateService.update(id, data, 'user');
    }

    static findById(id) {
        try {

            return prisma.user.findUnique({
                where: {
                    id: parseInt(id),
                },
            });
        } catch (e) {
            throw e;
        }
    }

    static async generateLink(id, type) {
        const user = await prisma.user.findUnique({
            where: {id: parseInt(id)},
        });

        if (!user) throw createError.NotFound('User not found');

        const token = await jwt.signAccessToken(user);

        const link = await prisma.link.create({
            data: {
                type,
                token,
                idUser: parseInt(id),
            },
        });

        const emailFile = fs.readFileSync(path.resolve(__dirname, `../../assets/templates/${type}.hbs`), 'utf8');
        const emailTemplate = hbs.compile(emailFile);
    }

    static async switchUser(data) {
        const {username} = data;

        if (!username) {
            throw createError.BadRequest('Missing login');
        }

        const user = await prisma.user.findUnique({
            where: {
                email: username,
            },
        });
        if (!user) {
            throw createError.NotFound('User not registered');
        }

        delete user.password;

        const accessToken = await jwt.signAccessToken(user);
        return {...user, accessToken};
    }

    static async updateProfile(id, data) {

        // get the user
        const user = await UserService.findById(id);

        // pass dob, secondLastname and RFC to a meta object
        const metas = {};

        if (data.dob) metas.dob = data.dob;
        if (data.secondLastname) metas.secondLastname = data.secondLastname;
        if (data.rfc) metas.rfc = data.rfc;
        if (data.idAvatar) metas.idAvatar = data.idAvatar;

        delete data.dob;
        delete data.secondLastname;
        delete data.rfc;
        delete data.idAvatar;

        data.metas = {...user.metas, ...metas};

        return UserService.update(id, data, {idUser: id});
    }

    static async recoverPassword(data) {

    }
}

export default UserService;