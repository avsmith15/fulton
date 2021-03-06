import * as express from "express";

import { inject as inversifyInject, injectable as inversifyInjectable, optional as inversifyOptional, interfaces } from "inversify";

/**
 * alias for inversify.injectable
 */
export const injectable = inversifyInjectable;

/**
 * alias for inversify.inject
 */
export const inject = inversifyInject;

/**
 * alias for inversify.optional
 */
export const optional = inversifyOptional;

/**
 * alias for inversify.interfaces.Container
 */
export type DiContainer = interfaces.Container;

/**
 * extends express.NextFunction
 */
export interface NextFunction extends express.NextFunction { }

/**
 * extends express.Request
 */
export interface Request extends express.Request { }

/**
 * extends express.Response
 */
export interface Response extends express.Response { }

/**
 * alias for express.RequestHandler
 */
export interface Middleware extends express.RequestHandler { }

/**
 * alias for express.ErrorRequestHandler
 */
export interface ErrorMiddleware extends express.ErrorRequestHandler { }


// rename typeorm functions
try {
    let { Entity, ObjectIdColumn, Column, ManyToMany, PrimaryColumn, PrimaryGeneratedColumn, ManyToOne, OneToMany, OneToOne } = require("typeorm")

    module.exports.entity = Entity
    module.exports.objectIdColumn = ObjectIdColumn
    module.exports.column = Column
    module.exports.manyToMany = ManyToMany
    module.exports.primaryColumn = PrimaryColumn
    module.exports.primaryGeneratedColumn = PrimaryGeneratedColumn
    module.exports.manyToOne = ManyToOne
    module.exports.oneToMany = OneToMany
    module.exports.oneToOne = OneToOne
} catch (error) { }

// alias bson.ObjectId
try {
    let { ObjectId } = require("bson")

    module.exports.ObjectId = ObjectId
} catch (error) { }