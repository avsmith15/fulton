# Fulton CLI

Fulton CLI is [SWARM's](https://www.swarmnyc.com/) tool that helps you to get started using [Fulton](https://www.npmjs.com/package/fulton-server).


## Installation

```
npm i -g fulton-cli
```

## Commands
Type `fulton` or `fulton help <command>` to see all of the program's usages. All commands support wizard style to help you complete your intended command. You can also provide the particular options directly to skip the wizard.

### New
**new command** helps you create a new web project powered by [fulton-server](https://www.npmjs.com/package/fulton-server)

![fulton-new](/screenshots/fulton-new.gif)

#### Usage:
* `fulton new [name]` or `fulton n [name]`
    * `[name]` (*the name of the app*)

#### Options:
* `-d, --databases <engine,engine,engine,...>` The database engines the app uses are listed below:
    * Support engines: 
        * mongodb
        * mysql (soon) 
        * mssql (soon) 
        * postgres (soon) 
        * others (soon) 
* `-f, --features <feature,feature,feature,...>` Enables the features of the app:
    * identitiy - this feature is involved in supporting: User Register, Login, Authentication and Authorization.
    * oauth-google - this feature is involved in supporting: Google OAuth Login.
    * oauth-facebook - this feature is involved in supporting: Facebook OAuth Login.
    * oauth-github - this feature is involved in supporting: GitHub OAuth Login.
    * api-docs - this feature is involved in supporting: Swagger UI documentation.
    * compression - this feature is involved in supporting: compression http response.
    * cors - this feature is involved in supporting: broswer cors.
    * email - this feature is involved in supporting: sending email to users.
    * json-api - this feature is involved in supporting: response json-api format.
    * docker - this feature is involved in supporting: docker.

### Generate
**generate command** helps you in scaffolding files

![fulton-new](/screenshots/fulton-new.gif)

#### Schematic
Supported schematics:
* `e, entity` scaffolding an entity of a Database ORM file.
* `n, entity-router` scaffolding a router file.
* `r, router` scaffolding a router file.
* `s, service` scaffolding a service file.

#### Options:
* `-f, --force` override the file (if it exists).
* `--not-open` not open the file after it is generated.
* `--not-import` not import the reference into app.ts after it is generated.

### Feature
**feature command** helps you to add or remove features

![fulton-feature](/screenshots/fulton-feature.gif)

### Global Options
* `-h, --help` Display help.
* `--no-color` Disable colors.
