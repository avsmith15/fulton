import { IUser } from "../auths/IUser";
import { ILogger } from "./ILogger";
import { IContainer } from "../../node_modules/tsioc";

export interface IFultonContext<TUser extends IUser = IUser> {
    user: TUser;
    logger: ILogger;
    container: IContainer;
}