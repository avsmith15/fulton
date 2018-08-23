# Fulton Server

Fulton Server has integrated many essential features and packages that a functional web server needs. Using Fulton Server can accelerate the time it takes to build a state-of-the-art web server from scratch. 

## CLI
Using Fulton Server with [Fulton CLI](https://www.npmjs.com/package/fulton-cli) can help you get started with Fulton.

## Integration

### [Typescript](https://typescriptlang.org/)

We encourage that you use Fulton Server with typescript because typescript provides better experiences than pure javascript. Also, Fulton Server takes the advantage of decoration from typescript. 

For Example, 
``` typescript
@router("/my")
class MyRouter extends Router {
    @httpGet()
    hi(req, res){
        res.send("Hi there")
    }
}
```
here `@router` and `@httpGet` are the decorators. As you can see, they make your code more meaningful.

### [Express](https://expressjs.com/) 

Fulton Server is based on express. Express is very lite, and is also the most popular web framework for nodejs. We can also use the feature of decoration from typescript to build our Router. See [Router](https://swarmnyc.gitbooks.io/fulton/content/features/router.html) for more information.


### [Inversify](http://inversify.io/) 

Dependency Injection(DI) and Inversion of Control (IoC) are good development patterns. Inversify is a mature package, so we included it into Fulton Server. See [DI](https://swarmnyc.gitbooks.io/fulton/content/features/di.html) for more information.

### [Passport](http://www.passportjs.org/)

Authentication is a basic feature of a web server. Fulton Server providers this exact feature. Authentication is complicated, so Fulton Server integrates passport—a useful authentication package—to help your web server authenticate users. See [Identity](https://swarmnyc.gitbooks.io/fulton/content/identity.html) for more information.

### [Typeorm](http://typeorm.io)

Fulton Server takes the advantages of Typeorm to connect multiple database engines. See [Entity](https://swarmnyc.gitbooks.io/fulton/content/features/entity.html) for more information.

### [Swagger](http://swagger.io)

Fulton Server can generate Swagger.json, which helps to export your web server to other services. Also, Fulton Server comes embedded with the swagger ui, so developers can see the api docs when looking at the code. See [docs](https://swarmnyc.gitbooks.io/fulton/content/features/docs.html) for more information.


### [Winston](https://github.com/winstonjs/winston) 

Fulton Server uses Winston for its loggers. See [logging](https://swarmnyc.gitbooks.io/fulton/content/features/logging.html) for more information.

### [Jsonapi](http://jsonapi.org/) 

Fulton Server fully supports Jsonapi. 


## Options
We want Fulton's configuration to be easy, so we put almost every configurable setting in the options variable. 
For example,

``` typescript
export class ExampleApp extends FultonApp {
    protected async onInit(options: FultonAppOptions): Promise<any> {
        options.routers = [
            FoodRouter,
            IngredientRouter
        ];
        
        options.entities = [Food, Ingredient]

        options.cors.enabled = true;
        options.docs.enabled = true;

        options.identity.enabled = true;
        options.identity.google.enabled = true;
    }
}
```

Fulton Server has js-docs for almost every public class, function and member on its typescript declaration files. Therefore, typescript-supported IDEs such as Visual Studio Code provide Auto-Complete for documents, which can improve the coding experience (as seen in the picture below).

![server-options-auto-complete](/screenshots/server-options-auto-complete.gif) 

As you can see, the features of Fulton Server are easy to change. See [Options](https://github.com/swarmnyc/fulton/wiki/server-options) for more information.
    

## Requirements
- node.js > 7.0, Many features of Fulton Server utilize ES2015 and ES2016, so it needs an updated version of nodejs
- typescript > 2.4

## Issues

There are some known issues, so see the notes to avoid.
- Because typescript isn't really a programming language, The ts code will be compiled to javascript. Javascript doesn't have an interface nor generic type so a lot features only exist on typescript for helping the overall coding experience. After compiling, they are all gone.
	For example, 
	```typescript
	// typescript
	interface MyInterface{
		p1: string;
		p2: string;
	}

	class MyClass <T extends MyInterface> {
		p1: T;
		p2: T;
	}

	```
	```javascript
	// the javascript that complied from typescript
	class MyClass {
	}
	// all others staff are gone.
	```

- zone.js has a problem for es2017. use es2016 for now.
