import * as jws from 'jws';
import * as lodash from 'lodash';
import * as passwordHash from 'password-hash';
import * as validator from 'validator';
import { AccessToken, ForgotPasswordModel, ForgotPasswordNotificationModel, IFultonUser, IOauthProfile, IUserService, RegisterModel, WelcomeNotificationModel, IFultonUserClaims, UpdateLocalModel } from '../interfaces';
import { codeGenerate, numberCodeGenerate, timingSafeEqual } from '../../helpers/crypto-helper';
import { DiKeys, EventKeys } from '../../keys';
import { EntityMetadata } from 'typeorm/metadata/EntityMetadata';
import { ErrorCodes } from '../../common/fulton-error';
import { FultonUserAccessToken, FultonUserClaims, FultonUser } from './fulton-user';
import { FultonError } from '../../common';
import { getManager, MongoEntityManager, MongoRepository } from 'typeorm';
import { Helper } from '../../helpers/helper';
import { IdentityOptions } from '../identity-options';
import { IFultonApp } from '../../fulton-app';
import { inject, injectable, NotificationMessage, Request } from '../../interfaces';
import { ObjectId } from 'bson';

interface JWTPayload {
    id: string;
    ts: number; // timestamp

    username?: string;
    portraitUrl?: string;
    email?: string;
    roles?: string[];
    [key: string]: any;
}

//TODO: multiple database engines supports, move to other files
/**
 * the runner is for multiple database engines supports
 */
interface IRunner {
    convertUserId(userId: any): any;
    updateMetadata(metadata: EntityMetadata): void;
    addUser(user: FultonUser): Promise<FultonUser>
    addAccessToken(accessToken: FultonUserAccessToken): Promise<any>
    addClaim(claim: FultonUserClaims): Promise<any>
    updateUser(userId: any, fields: any): Promise<any>;
    updateClaim(claimId: any, update: Partial<FultonUserClaims>): Promise<any>
    findUserById(userId: any): Promise<FultonUser>;
    findUserByOauth(type: string, sourceUserId: string): Promise<FultonUser>;
    findUserByToken(token: string): Promise<FultonUser>;
    findClaims(user: IFultonUser): Promise<FultonUserClaims[]>
    findClaim(type: string, sourceUserId: string): Promise<FultonUserClaims>;
    findClaimByLocal(usernameOrEmail: string): Promise<FultonUserClaims>;
    findClaimByResetPasswordToken(token: string, code: string): Promise<FultonUserClaims>;
    countUserName(name: string): Promise<number>;
    countUserEmail(email: string): Promise<number>;
    revokeAccessToken(userId: string, token: string): Promise<any>;
    revokeAllAccessTokens(userId: string): Promise<any>;
}

class MongoRunner implements IRunner {
    options: IdentityOptions;
    userRepository: MongoRepository<FultonUser>;
    claimRepository: MongoRepository<FultonUserClaims>;
    tokenRepository: MongoRepository<FultonUserAccessToken>;

    constructor(private app: IFultonApp, private manager: MongoEntityManager) {
        this.options = app.options.identity;
        this.userRepository = manager.getMongoRepository(FultonUser) as any;
        this.claimRepository = manager.getMongoRepository(FultonUserClaims) as any;
        this.tokenRepository = manager.getMongoRepository(FultonUserAccessToken) as any;

        this.updateMetadata(this.userRepository.metadata);
        this.updateMetadata(this.claimRepository.metadata);
        this.updateMetadata(this.tokenRepository.metadata);
    }

    convertUserId(userId: any): ObjectId {
        return new ObjectId(userId)
    }

    updateMetadata(metadata: EntityMetadata) {
        // make metadata for mongo 
        let idColumn = metadata.ownColumns.find((c) => c.propertyName == "id")

        idColumn.isObjectId = true;
        idColumn.givenDatabaseName =
            idColumn.databaseNameWithoutPrefixes =
            idColumn.databaseName = "_id";

        metadata.generatedColumns = [idColumn]
        metadata.objectIdColumn = idColumn
    }

    addUser(user: FultonUser): Promise<FultonUser> {
        return this.userRepository.insertOne(user).then((result) => {
            user["id"] = result.insertedId;
            return user;
        });
    }

    updateUser(userId: any, fields: any): Promise<any> {
        return this.userRepository.updateOne({ "_id": userId }, { $set: fields });
    }

    addAccessToken(accessToken: FultonUserAccessToken): Promise<any> {
        return this.tokenRepository.insertOne(accessToken);
    }

    addClaim(identity: FultonUserClaims): Promise<any> {
        return this.claimRepository.insertOne(identity);
    }

    updateClaim(id: any, update: Partial<FultonUserClaims>): Promise<any> {
        return this.claimRepository.updateOne({ "_id": id }, { $set: update });
    }

    countUserName(name: string): Promise<number> {
        return this.claimRepository.count({
            "type": "local",
            username: name,
        })
    }

    countUserEmail(email: string): Promise<number> {
        return this.claimRepository.count({
            "type": "local",
            email: email,
        })
    }

    async findUserById(userId: any): Promise<FultonUser> {
        return this.userRepository.findOne(userId);
    }

    async findUserByOauth(type: string, sourceUserId: string): Promise<FultonUser> {
        var claim = await this.claimRepository.findOne({
            "type": type,
            "sourceUserId": sourceUserId
        })

        if (claim) {
            return this.userRepository.findOne(claim.userId)
        } else {
            return null;
        }
    }

    async findUserByToken(token: string): Promise<FultonUser> {
        let payload = JSON.parse(jws.decode(token).payload)
        let userTokens = await this.tokenRepository.find({
            "userId": new ObjectId(payload.id),
            "revoked": false,
            "expiredAt": { "$gt": new Date() }
        } as any)

        let userToken = userTokens.find(userToken => {
            return timingSafeEqual(token, userToken.token)
        })
        if (userToken != null) {
            return this.userRepository.findOne(userToken.userId);
        } else {
            return null;
        }

    }

    findClaims(user: IFultonUser): Promise<FultonUserClaims[]> {
        return this.claimRepository.find({
            "userId": user.id
        });
    }

    findClaim(type: string, sourceUserId: string): Promise<FultonUserClaims> {
        if (type == "local") {
            return this.claimRepository.findOne({
                "type": type,
                "userId": sourceUserId
            });
        } else {
            return this.claimRepository.findOne({
                "type": type,
                "sourceUserId": sourceUserId
            });
        }
    }

    findClaimByLocal(nameOrEmail: string): Promise<FultonUserClaims> {
        return this.claimRepository.findOne({
            "type": "local",
            "$or": [
                { username: nameOrEmail },
                { email: nameOrEmail }
            ]
        } as any);
    }

    async findClaimByResetPasswordToken(token: string, code: string): Promise<FultonUserClaims> {
        let claim = await this.claimRepository.findOne({
            "type": "local",
            "resetPasswordToken": token,
            "resetPasswordExpiredAt": { "$gt": new Date() }
        } as any);

        if (claim) {
            // check code, if reach the try-limits, then revoke the token.
            if (claim.resetPasswordCode == code) {
                return claim;
            } else if (claim.resetPasswordCodeTryCount >= this.options.forgotPassword.tryLimits - 1) {
                await this.claimRepository.updateMany({ "resetPasswordToken": token }, { $set: { resetPasswordToken: null } })
            } else {
                await this.claimRepository.updateMany({ "resetPasswordToken": token }, { $inc: { resetPasswordCodeTryCount: 1 } })
            }
        }
    }

    revokeAccessToken(userId: string, token: string): Promise<any> {
        return this.tokenRepository.updateMany({ userId: userId, token: token }, { $set: { revoked: true } })
    }

    revokeAllAccessTokens(userId: string): Promise<any> {
        return this.tokenRepository.updateMany({ userId: userId }, { $set: { revoked: true } })
    }
}

@injectable()
export class FultonUserService implements IUserService<FultonUser> {
    private runner: IRunner;
    private app: IFultonApp;

    init(app: IFultonApp) {
        this.app = app;

        let manager = getManager(app.options.identity.databaseConnectionName);

        if (manager instanceof MongoEntityManager) {
            this.runner = new MongoRunner(app, manager);
        } else {
            //this.runner = new SqlRunner(manager)
        }
    }

    private get options(): IdentityOptions {
        return this.app.options.identity;
    }

    get currentUser(): IFultonUser {
        if (this.app.options.miscellaneous.zoneEnabled) {
            let res: Request = Zone.current.get("res");
            if (res) {
                return res.user;
            } else {
                return null;
            }
        }
    }

    async register(input: RegisterModel): Promise<FultonUser> {
        let error = new FultonError("register_failed");
        let registerOptions = this.options.register;

        // verify username, password, email
        var username = input.username
        var email = input.email
        var password = input.password

        this.verifyUserName(error, username)
        this.verifyPassword(error, password)
        this.verifyEmail(error, email)

        if (error.hasError()) {
            throw error;
        }

        // verify existence
        let lUsername = username.toLocaleLowerCase()
        let count = await this.runner.countUserName(lUsername);

        if (count > 0) {
            error.addDetail("username", "existed", "the username is existed")
        }

        let lEmail = email.toLocaleLowerCase()
        count = await this.runner.countUserEmail(lEmail);

        if (count > 0) {
            error.addDetail("email", "existed", "the email is existed")
        }

        if (error.hasError()) {
            throw error;
        }

        // add user
        let userInput = {
            displayName: input.username,
            email: input.email,
            portraitUrl: input.portraitUrl,
            registeredAt: new Date()
        } as FultonUser;

        if (registerOptions.otherFields.length > 0) {
            Object.assign(userInput, lodash.pick(input, registerOptions.otherFields))
        }

        let user = await this.runner.addUser(userInput);

        // add local identity
        var hashedPassword = passwordHash.generate(password, registerOptions.passwordHashOptions);

        await this.runner.addClaim({
            type: "local",
            userId: user.id,
            email: lEmail,
            username: lUsername,
            hashedPassword: hashedPassword
        })

        this.sendWelcomeNotification({
            displayName: user.displayName,
            email: email
        });

        this.app.events.emit(EventKeys.UserDidRegister, user);

        return user;
    }

    async login(username: string, password: string): Promise<FultonUser> {
        let error = new FultonError("login_failed");

        if (!lodash.some(username)) {
            error.addDetail("username", "required")
        }

        if (!lodash.some(password)) {
            error.addDetail("password", "required")
        }

        if (error.hasError()) {
            throw error;
        }

        var user;
        let claim = await this.runner.findClaimByLocal(username.toLocaleLowerCase())
        let claimUpdate = new FultonUserClaims()
        if (claim) {
            // for locking
            if (claim.loginLockReleaseAt) {
                let lock = claim.loginLockReleaseAt.valueOf() - Date.now();
                if (lock > 0) {
                    throw error.set("login_failed", `account locked, try ${lock / 1000.0} seconds later`);
                }

                claimUpdate.loginLockReleaseAt = null;
            }

            if (passwordHash.verify(password, claim.hashedPassword)) {
                user = await this.runner.findUserById(claim.userId);
                claimUpdate.loginTryCount = 0
                claimUpdate.loginFailedAt = null
            } else {
                // login failed 
                if (claim.loginFailedAt && (Date.now() - claim.loginFailedAt.valueOf() < this.options.login.lockTime)) {
                    claimUpdate.loginTryCount = claim.loginTryCount + 1
                } else {
                    // reset
                    claimUpdate.loginTryCount = 1;
                }

                claimUpdate.loginFailedAt = new Date()

                if (claimUpdate.loginTryCount > this.options.login.tryLimits) {
                    claimUpdate.loginLockReleaseAt = new Date(Date.now() + this.options.login.lockTime)
                }
            }

            //update identity
            await this.runner.updateClaim(claim.id, claimUpdate)
        }

        if (user) {
            this.app.events.emit(EventKeys.UserDidLogin, user);

            return user
        } else {
            throw error.set("login_failed", "username or password isn't correct");
        }
    }

    async loginByOauth(userId: string, token: AccessToken, profile: IOauthProfile): Promise<FultonUser> {
        let error = new FultonError();

        // the id is necessary
        if (!error.verifyRequired(profile, "id")) {
            throw error.set("unknown_error", "the oauth provider returned unexpected data.");
        }

        let user;

        // verify existence
        let claim = await this.runner.findClaim(token.provider, profile.id);

        if (claim) {
            // existed
            let claimUpdate = new FultonUserClaims()

            if (userId && userId != claim.userId.toString()) {
                throw error.set("existed", "the account has been linked.")
            }

            // update token info
            claimUpdate.accessToken = token.access_token
            claimUpdate.refreshToken = token.refresh_token || claim.refreshToken
            claimUpdate.issuedAt = new Date()

            await this.runner.updateClaim(claim.id, claimUpdate);

            userId = claim.userId
        } else {
            // not existed
            if (userId) {
                // link to current user   
                userId = this.runner.convertUserId(userId)
            } else {
                // create user
                let userInput = {
                    displayName: profile.username,
                    portraitUrl: profile.portraitUrl
                } as FultonUser

                if (profile.email) {
                    userInput.email = profile.email
                }

                userInput.registeredAt = new Date()

                user = await this.runner.addUser(userInput);
                userId = user.id;
            }

            claim = await this.runner.addClaim({
                type: token.provider,
                userId: userId,
                accessToken: token.access_token,
                refreshToken: token.refresh_token,
                username: profile.username,
                email: profile.email,
                sourceUserId: profile.id
            })
        }

        if (user) {
            this.app.events.emit(EventKeys.UserDidLogin, user);

            return user;
        } else {
            return this.runner.findUserById(userId);
        }
    }

    loginByAccessToken(token: string): Promise<FultonUser> {
        if (jws.verify(token, "HS256", this.jwtSecret)) {
            return this.runner.findUserByToken(token);
        } else {
            return Promise.reject("Invalid Token");
        }
    }

    async issueAccessToken(user: IFultonUser): Promise<AccessToken> {
        let token = this.encodeJwtToken(user)

        let userToken: FultonUserAccessToken = {
            token: token,
            issuedAt: new Date(),
            expiredAt: new Date(Date.now() + (this.options.accessToken.duration * 1000)),
            revoked: false,
            userId: user.id
        };

        await this.runner.addAccessToken(userToken);

        return {
            access_token: token,
            token_type: this.options.accessToken.type,
            expires_in: this.options.accessToken.duration
        }
    }

    async updateProfile(userId: any, input: any): Promise<void> {
        if (input == null) throw new FultonError(ErrorCodes.Invalid);
        input = lodash.pick(input, this.options.profile.updatableFields)

        return this.runner.updateUser(userId, input);
    }

    async updateLocalClaim(userId: any, input: UpdateLocalModel): Promise<void> {
        if (input == null) throw new FultonError(ErrorCodes.Invalid);
        let error = new FultonError("update_failed");

        let claim = await this.runner.findClaim("local", userId)
        let claimUpdate = new FultonUserClaims()

        if (input.username) {
            input.username = input.username.toLocaleLowerCase()
            if (input.username != claim.username) {
                if (!this.verifyUserName(error, input.username)) {
                    throw error
                }

                //check username
                let count = await this.runner.countUserName(input.username);

                if (count > 0) {
                    throw error.addDetail("username", "existed", "the username is existed")
                }

                claimUpdate.username = input.username
            }
        }

        if (input.email) {
            input.email = input.email.toLocaleLowerCase()
            if (input.email != claim.email) {
                if (!this.verifyEmail(error, input.email)) {
                    throw error;
                }

                //check username
                let count = await this.runner.countUserEmail(input.email);

                if (count > 0) {
                    throw error.addDetail("email", "existed", "the email is existed")
                }

                claimUpdate.email = input.email
            }
        }

        if (input.password) {
            if (!this.verifyPassword(error, input.password)) {
                throw error
            }

            claimUpdate.hashedPassword = passwordHash.generate(input.password, this.options.register.passwordHashOptions);
        }

        await this.runner.updateClaim(claim.id, claimUpdate);

        return
    }

    async forgotPassword(usernameOrEmail: string): Promise<ForgotPasswordModel> {
        let claim = await this.runner.findClaimByLocal(usernameOrEmail);
        if (claim) {
            let claimUpdate = new FultonUserClaims()

            claimUpdate.resetPasswordToken = codeGenerate();
            claimUpdate.resetPasswordCode = numberCodeGenerate();
            claimUpdate.resetPasswordCodeTryCount = 0;
            claimUpdate.resetPasswordExpiredAt = new Date(Date.now() + this.options.forgotPassword.duration * 1000);

            await this.runner.updateClaim(claim.id, claimUpdate);

            let user = await this.runner.findUserById(claim.userId);

            this.app.events.emit(EventKeys.UserForgotPassword, claim);

            var url = Helper.urlJoin(this.app.baseUrl, this.options.forgotPassword.verifyPath);
            this.sendForgotPasswordNotification({
                displayName: user.displayName,
                email: claim.email,
                url: `${url}?token=${claimUpdate.resetPasswordToken}&code=${claimUpdate.resetPasswordCode}`,
                token: claimUpdate.resetPasswordToken,
                code: claimUpdate.resetPasswordCode
            });

            return {
                token: claimUpdate.resetPasswordToken,
                expires_in: this.options.forgotPassword.duration
            }
        } else {
            throw new FultonError(ErrorCodes.NotExisted)
        }
    }

    async resetPassword(token: string, code: string, password: string): Promise<void> {
        let error = new FultonError(ErrorCodes.Invalid)

        if (this.verifyPassword(error, password)) {
            let claim = await this.runner.findClaimByResetPasswordToken(token, code)

            if (claim) {
                let claimUpdate = new FultonUserClaims()

                claimUpdate.hashedPassword = passwordHash.generate(password, this.options.register.passwordHashOptions)
                claimUpdate.resetPasswordCode = null;
                claimUpdate.resetPasswordCodeTryCount = null;
                claimUpdate.resetPasswordToken = null;
                claimUpdate.resetPasswordExpiredAt = null;

                this.runner.updateClaim(claim.id, claimUpdate);

                this.app.events.emit(EventKeys.UserDidResetPassword, claim);
            } else {
                throw error.set(ErrorCodes.Invalid, "the reset token and code are invalid");
            }
        } else {
            throw error;
        }
    }

    verifyResetPassword(token: string, code: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.runner.findClaimByResetPasswordToken(token, code).then((identity) => {
                if (identity == null) {
                    reject(new FultonError(ErrorCodes.Invalid, "the reset token and code are invalid"))
                } else {
                    resolve()
                }
            }).catch(reject);
        })
    }

    refreshAccessToken(token: string): Promise<AccessToken> {
        throw new Error("Method not implemented.");
    }

    getUserIdentities(user: IFultonUser): Promise<IFultonUserClaims[]> {
        return this.runner.findClaims(user);
    }

    revokeAccessToken(userId: string, token: string): Promise<any> {
        return this.runner.revokeAccessToken(userId, token);
    }

    revokeAllAccessTokens(userId: string): Promise<any> {
        return this.runner.revokeAllAccessTokens(userId);
    }

    private get jwtSecret(): string | Buffer {
        return this.options.accessToken.secret || this.app.appName;
    }

    private sendWelcomeNotification(model: WelcomeNotificationModel) {
        var opts = this.options.register.notification
        if (opts.extraVariables) {
            Object.assign(model, opts.extraVariables)
        }
        if (opts.email.enabled && model.email) {
            var message: NotificationMessage = {
                email: {
                    to: model.email,
                    subjectTemplate: opts.email.subjectTemplate,
                    bodyTemplate: opts.email.bodyTemplate,
                    variables: model
                }
            }

            this.app.sendNotifications(message);
        }
    }

    private sendForgotPasswordNotification(model: ForgotPasswordNotificationModel) {
        var opts = this.options.forgotPassword.notification
        if (opts.extraVariables) {
            Object.assign(model, opts.extraVariables)
        }
        if (opts.email.enabled && model.email) {
            var message: NotificationMessage = {
                email: {
                    to: model.email,
                    subjectTemplate: opts.email.subjectTemplate,
                    bodyTemplate: opts.email.bodyTemplate,
                    variables: model
                }
            }

            this.app.sendNotifications(message);
        }
    }

    private verifyUserName(error: FultonError, username: any) {
        let result: boolean = false;

        if (error.verifyRequired(username, "username")) {
            let result: boolean;
            if (this.options.register.usernameVerifier instanceof Function) {
                result = this.options.register.usernameVerifier(username)
            } else {
                result = this.options.register.usernameVerifier.test(username)
            }

            if (!result) {
                error.addDetail("username", "invalid", "the username is invalid")
            }
        }

        return result;
    }

    private verifyPassword(error: FultonError, password: any): boolean {
        let result: boolean = false;

        if (error.verifyRequired(password, "password")) {
            if (this.options.register.passwordVerifier instanceof Function) {
                result = this.options.register.passwordVerifier(password)
            } else {
                result = this.options.register.passwordVerifier.test(password)
            }

            if (!result) {
                error.addDetail("password", "invalid", "the password is invalid")
            }
        }

        return result;
    }

    private verifyEmail(error: FultonError, email: string) {
        let result: boolean = false;

        if (error.verifyRequired(email, "email")) {
            result = validator.isEmail(email)

            if (!result) {
                error.addDetail("email", "invalid", "the email is invalid")
            }
        }

        return result
    }

    private encodeJwtToken(user: IFultonUser): string {
        let payload: JWTPayload = {
            id: user.id,
            ts: Date.now()
        };

        this.options.accessToken.scopes.forEach(scope => {
            payload[scope] = user[scope];
        });

        var token = jws.sign({
            header: {
                alg: "HS256"
            },
            secret: this.jwtSecret,
            payload: payload
        });

        return token
    }
}