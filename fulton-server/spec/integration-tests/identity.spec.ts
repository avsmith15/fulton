import * as cryptoHelper from '../../src/helpers/crypto-helper';

import { AccessToken, IOauthProfile } from '../../src/identity/interfaces';
import { FultonAccessToken, FultonIdentity, FultonUser } from "../../src/identity/fulton-impl/fulton-user";
import { HttpResult, HttpTester } from "../../src/test/http-tester";
import { Request, Response } from "../../src/interfaces";

import { FultonApp } from '../../src/fulton-app';
import { FultonAppOptions } from '../../src/options/fulton-app-options';
import { FultonLog } from '../../src/fulton-log';
import { FultonUserService } from '../../src/identity/fulton-impl/fulton-user-service';
import { ObjectId } from "bson";
import { getMongoRepository } from "typeorm";

class MyApp extends FultonApp {
    protected onInit(options: FultonAppOptions): void {
        options.identity.enabled = true;

        options.databases.set("default", {
            type: "mongodb",
            url: "mongodb://localhost:27017/fulton-test"
        });

        options.index.handler = (req: Request, res: Response) => {
            if (req.isAuthenticated()) {
                res.send("user:" + req.user.username);
            } else {
                res.send("no user");
            }
        };
    }
}

describe('Identity Integration Test', () => {
    let app: MyApp;
    let httpTester: HttpTester;

    beforeEach(() => {
        httpTester.setHeaders(null);
        return app["dbConnections"][0].dropDatabase();
    })

    beforeAll(async () => {
        app = new MyApp();
        httpTester = new HttpTester(app);
        return httpTester.start();
    });

    afterAll(() => {
        return httpTester.stop();
    });

    function prepareUser(): Promise<HttpResult> {
        return httpTester.post("/auth/register", {
            email: "test@test.com",
            username: "test",
            password: "test123"
        })
    }

    it('should register', async () => {
        let result = await httpTester.post("/auth/register", {
            email: "test@test.com",
            username: "test",
            password: "test123"
        })

        expect(result.response.statusCode).toEqual(200);

        expect(result.body.error).toBeUndefined();

        let at: AccessToken = result.body;
        expect(at.access_token).toBeTruthy();
        expect(at.token_type).toEqual("bearer");
        expect(at.expires_in).toEqual(2592000);
    });

    it('should register failure register wiht the same name and email', async () => {
        await prepareUser()

        let result = await httpTester.post("/auth/register", {
            email: "Test@test.com",
            username: "Test",
            password: "test123"
        });
        expect(result.response.statusCode).toEqual(400);

        expect(result.body.error.detail.username).toEqual([{ code: 'existed', message: "the username is existed" }]);
        expect(result.body.error.detail.email).toEqual([{ code: 'existed', message: "the email is existed" }]);
    });

    it('should login successfully', async () => {
        await prepareUser();

        let result = await httpTester.post("/auth/login", {
            username: "Test",
            password: "test123"
        });

        expect(result.response.statusCode).toEqual(200);
        expect(result.body.access_token).toBeTruthy();
    });

    it('should login failure', async () => {
        await prepareUser();

        let result = await httpTester.post("/auth/login", {
            username: "test",
            password: "test321"
        });

        expect(result.response.statusCode).toEqual(400);
        expect(result.body.error.message).toEqual("username or password isn't correct");
    });

    it('should access with token', async () => {
        let result1 = await prepareUser();
        let token = result1.body as AccessToken;

        httpTester.setHeaders({
            "Authorization": `${token.token_type} ${token.access_token}`
        })

        let result = await httpTester.get("/")

        expect(result.body).toEqual("user:test");
    });

    it('should not access with wrong token', async () => {
        let result1 = await prepareUser();
        let token = result1.body as AccessToken;

        httpTester.setHeaders({
            "Authorization": `${token.token_type} ${token.access_token}123`
        })

        let result = await httpTester.get("/")

        expect(result.body).toEqual("no user");
    });

    // for oauth 
    it('should create a user by oauth login', async () => {
        let userService = app.userService as FultonUserService
        let accessToken: AccessToken = {
            provider: "TEST",
            access_token: "TTEESSTT"
        }
        let profile: IOauthProfile = {
            id: "test",
            username: "test",
            email: "test@test.com"
        }

        var user = await userService.loginByOauth(null, accessToken, profile);
        expect(user).not.toBeNull()

        var userRepository = getMongoRepository(FultonUser)
        var identityRepository = getMongoRepository(FultonIdentity)

        var userCount = await userRepository.count()
        var identityCount = await identityRepository.count()

        expect(userCount).toEqual(1)
        expect(identityCount).toEqual(1)
    })

    it('should create link to the user by oauth login', async () => {
        let userService = app.userService as FultonUserService

        var user1 = await userService.register({
            username: "test",
            email: "test@test.com",
            password: "test1234"
        })

        let accessToken: AccessToken = {
            provider: "TEST",
            access_token: "TTEESSTT"
        }
        let profile: IOauthProfile = {
            id: "test",
            username: "test",
            email: "test@test.com"
        }

        let user2 = await userService.loginByOauth(user1.id, accessToken, profile);
        expect(user1.id).toEqual(user2.id)

        var userRepository = getMongoRepository(FultonUser)
        var identityRepository = getMongoRepository(FultonIdentity)

        var userCount = await userRepository.count()
        var identityCount = await identityRepository.count()

        expect(userCount).toEqual(1)
        expect(identityCount).toEqual(2)
    })

    it('should create fail to link user by oauth login', async () => {
        let userService = app.userService as FultonUserService

        let accessToken: AccessToken = {
            provider: "TEST",
            access_token: "TTEESSTT"
        }

        let profile: IOauthProfile = {
            id: "test",
            username: "test",
            email: "test@test.com"
        }

        await userService.loginByOauth(null, accessToken, profile);

        try {
            await userService.loginByOauth("test-2", accessToken, profile);
            fail()
        } catch (e) {
            expect(e.error.code).toEqual("existed")
        }
    })

    it('should get reset password token and verify and reset password', async () => {
        await prepareUser();

        let code = "123456"

        spyOn(cryptoHelper, "numberCodeGenerate").and.returnValue(code)

        let result = await httpTester.post("/auth/forgot-password", {
            username: "test"
        });

        expect(result.response.statusCode).toEqual(200);
        expect(result.body.data.token).toBeTruthy();

        let token = result.body.data.token

        result = await httpTester.post("/auth/forgot-password", {
            token: token,
            code: code
        });

        expect(result.response.statusCode).toEqual(200);


        result = await httpTester.post("/auth/forgot-password", {
            token: token,
            code: code,
            password: "123456"
        });

        expect(result.response.statusCode).toEqual(200);
    });

    it('should not get forget password token', async () => {
        let result = await httpTester.post("/auth/forgot-password", {
            username: "no-user"
        });

        expect(result.response.statusCode).toEqual(400);
    });

    it('should revoke reset password token', async () => {
        await prepareUser();

        var identityRepository = getMongoRepository(FultonIdentity)
        let code = "0000"

        let result = await httpTester.post("/auth/forgot-password", {
            username: "test"
        });

        expect(result.response.statusCode).toEqual(200);
        expect(result.body.data.token).toBeTruthy();

        let token = result.body.data.token

        result = await httpTester.post("/auth/forgot-password", {
            token: token,
            code: code
        });

        expect(result.response.statusCode).toEqual(400);

        let id = await identityRepository.findOne({ resetPasswordToken: token })
        expect(id.resetPasswordCodeTryCount).toEqual(1);


        result = await httpTester.post("/auth/forgot-password", {
            token: token,
            code: code
        });

        expect(result.response.statusCode).toEqual(400);

        id = await identityRepository.findOne({ resetPasswordToken: token })
        expect(id.resetPasswordCodeTryCount).toEqual(2);

        result = await httpTester.post("/auth/forgot-password", {
            token: token,
            code: code
        });

        expect(result.response.statusCode).toEqual(400);

        id = await identityRepository.findOne({ resetPasswordToken: token })
        expect(id).toBeFalsy();
    });
});