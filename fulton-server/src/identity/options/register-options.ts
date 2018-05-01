import { AuthenticateOptions } from '../interfaces';
import { BaseOptions } from '../../options/options';
import { Env } from '../../helpers';
import { FultonIdentityImpl } from '../fulton-impl/fulton-impl';
import { HttpMethod, Middleware, PathIdentifier } from '../../interfaces';
import { IdentityNotificationOptions } from './notification-Options';

export class RegisterOptions extends BaseOptions<RegisterOptions> {
    /**
     * the default value is true
     * it can be overridden by process.env["{appName}.options.identity.register.enabled"]
     */
    enabled?: boolean = true;

    /**
     * the default value is /auth/login
     */
    path?: PathIdentifier = "/auth/register";

    /**
     * the default value is `post`
     */
    httpMethod?: HttpMethod = "post";

    /**
     * the default value email
     */
    emailField?: string = "email";

    /**
     * the default value username
     */
    usernameField?: string = "username";

    /**
     * the default value password
     */
    passwordField?: string = "password";

    /**
     * the options for hash password
     */
    passwordHashOptions?: {
        /** 
         * the default value is sha256
         */
        algorithm?: string;
        /**
         * the default value is 8
         */
        saltLength?: number;
        /**
         * the default value is 1
         */
        iterations?: number;
    }

    /**
     * use express session
     * the default value is false
     */
    session?: boolean = false;

    /**
     * accept other fields, like nickname or phone-number
     * the default value is empty
     */
    otherFields?: string[] = [];

    /**
     * verify password is valid or not
     * the default value is /^[a-zA-Z0-9_-]{4,64}$/
     */
    usernameVerifier?: RegExp | ((username: string) => boolean) = /^[a-zA-Z0-9_-]{4,64}$/;

    /**
     * verify password is valid or not
     * the default value is /.{6,64}/, any 6 to 64 characters
     */
    passwordVerifier?: RegExp | ((pw: string) => boolean) = /.{6,64}/;

    /**
     * the handler for register
     * the default value is FultonIdentityImpl.registerHandler
     */
    handler?: Middleware = FultonIdentityImpl.registerHandler;

    /**
     * either use successCallback or responseOptions for response
     * the default value is FultonIdentityImpl.sendAccessToken
     */
    successCallback?: Middleware = FultonIdentityImpl.issueAccessToken;

    /**
     * the options for response
     */
    responseOptions?: AuthenticateOptions;

    readonly notiication? = new IdentityNotificationOptions(this.appName, this.appMode, "register");

    init?(): void {
        this.enabled = Env.getBoolean(`${this.appName}.options.identity.register.enabled`, this.enabled);

        if (this.passwordHashOptions == null) {
            this.passwordHashOptions = {
                algorithm: "sha256"
            }
        }

        if (this.appMode == "web-view" && this.responseOptions == null) {
            this.responseOptions = {
                failureRedirect: "/auth/register",
                successRedirect: "/"
            };
        }

        this.notiication.init()
    }
}