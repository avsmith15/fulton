import { Repository } from "typeorm";
import { Inject, Injectable } from "../interfaces";
import { IUserManager, IUser } from "./interfaces";


@Injectable()
export class FultonUserManager implements IUserManager {
    constructor( @Inject("user-repository") private userRepository: Repository<IUser>) {

    }

    findByUsernamePassword(username: string, password: string): IUser {
        throw new Error("Method not implemented.");
    }
    
    findByToken(token: string): IUser {
        throw new Error("Method not implemented.");
    }

    register(user: IUser): Promise<IUser> {
        throw new Error("Method not implemented.");
    }
}