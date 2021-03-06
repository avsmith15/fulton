import { FultonLog } from '../fulton-log';
import { Request } from '../interfaces';
import { AccessToken, IUser, OauthStrategyVerifier, StrategyVerifyDone } from './interfaces';
import { OauthStrategyOptions } from './options/oauth-strategy-options';

export function defaultLoginStrategyVerifier(req: Request, username: string, password: string, done: StrategyVerifyDone) {
    req.userService
        .login(username, password)
        .then((user: IUser) => {
            done(null, user);
        }).catch((error: any) => {
            FultonLog.warn("login failed by", error)
            done(error);
        });
}

/**
 * for TokenStrategyVerify like bearer
 */
export async function defaultBearerStrategyVerifier(req: Request, token: string, done: StrategyVerifyDone) {
    try {
        let user = await req.userService.loginByAccessToken(token);

        if (user) {
            user.currentToken = token

            return done(null, user);
        } else {
            return done(null, false);
        }
    } catch (error) {
        FultonLog.warn("loginByAccessToken failed by", error)
        return done(null, false);
    }
}

/**
 * the wrapper of auth verifier, the purpose of it is to call req.userService.loginByOauth with the formated parameters.
 */
export function defaultOauthStrategyVerifierFn(options: OauthStrategyOptions): OauthStrategyVerifier {
    return (req: Request, access_token: string, fresh_token: string, profile: any, done: StrategyVerifyDone) => {
        let token: AccessToken = {
            provider: options.name,
            access_token: access_token,
            refresh_token: fresh_token
        }

        if (options.profileTransformer) {
            profile = options.profileTransformer(profile);
        }

        // if the state has value, it should be userId
        var userId = req.query["state"];

        req.userService
            .loginByOauth(userId, token, profile)
            .then((user: IUser) => {
                done(null, user);
            }).catch((error: any) => {
                done(error);
            });
    }
}