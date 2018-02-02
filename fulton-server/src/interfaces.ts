import { Type } from "./helpers";
import { Repository } from "typeorm";

export * from "./re-export"

export type PathIdentifier = (string | RegExp | (string | RegExp)[]);

export type RepositoryFactory<TEntity = any> = ((entity: Type<TEntity>) => Repository<TEntity>);

export type EntityServiceFactory<TEntity = any> = ((entity: Type<TEntity>) => IEntityService<TEntity>);

export interface RouterDocOptions {
    title?: string;
    description?: string;
    // TODO: RouterDocOptions
}

export interface RouterActionDocOptions {
    title?: string;
    description?: string;
}

export interface FultonErrorObject {
    message?: string[];
    [key: string]: string[];
}

export interface IEntityService<TEntity> {
    find(queryParams: QueryParams): Promise<OperationResult<TEntity>>;

    findOne(queryParams: QueryParams): Promise<OperationOneResult<TEntity>>;

    create(entity: TEntity): Promise<OperationOneResult<TEntity>>;

    update(id: string, entity: TEntity): Promise<OperationStatus>;

    delete(id: string): Promise<OperationStatus>;
}

/**
 * for sorting and select, for example sort = {column1:1 , column2:-1 }
 */
export interface QueryColumnStates {
    [key: string]: number;
}

export interface OperationStatus {
    status?: number;
    errors?: FultonErrorObject;
}

export interface OperationResult<T=any> {
    data?: T[];
    errors?: FultonErrorObject;
    pagination?: {
        total?: number;
        index?: number;
        size?: number;
    }
}

export interface OperationOneResult<T=any> {
    data?: T;
    errors?: FultonErrorObject;
    pagination?: {
        total?: number;
        index?: number;
        size?: number;
    }
}

export interface JsonApiOptions {
    // TODO: JsonApiOptions
}

export interface QueryParams {
    /**
     * filter options
     * 
     * ## examples
     * - ?filter[a]=123&filter[b]=456
     * - ?filter[name][$regex]=abc&filter[name][$options]=i
     * - ?filter[name][$like]=abc
     * - ?filter[$or][0][a]=1&filter[$or][1][b]=2
     */
    filter?: {
        [key: string]: any;
    },

    /**
     * sort options
     * true is ascending order
     * false is descending order
     * 
     * ## examples
     * two styles: 
     *  - ?sort=columeA,-columeB 
     *  - ?sort[columeA]=1|true&sort[columeB]=-1|false
     */
    sort?: QueryColumnStates,

    /**
     * select options,
     * if undefined, all output all columns excepts @Colume({hide:true})
     * ## examples
     * two styles: 
     *  - ?select=columeA,columeB 
     *  - ?select=columeA&select=columeB
     */
    select?: string[];

    /**
     * pagination options,
     * ## examples
     *  - ?includes=columeA,columeB 
     *  - ?includes=columeA&includes=columeB
     */
    includes?: string[];

    /**
     * pagination options,
     * ## examples
     *  - ?pagination[index]=1
     *  - ?pagination[size]=100
     */
    pagination?: {
        index?: number,
        size?: number,
    }
}

export type HttpMethod = "all" | "get" | "post" | "patch" | "delete" | "head" | "put";

export type AppMode = "api" | "web-view" | "mixed";