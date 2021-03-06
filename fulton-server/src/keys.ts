export enum DiKeys {
    EmailService = "EmailService",
    EntityServiceFactory = "EntityServiceFactory",
    FultonApp = "FultonApp",
    MongoEntityRunner = "MongoEntityRunner",
    NotificationService = "NotificationService",
    PushNotificationService = "PushNotificationService",
    TemplateService = "TemplateService",
}

export enum EventKeys {
    AppDidInit = "AppDidInit",
    AppDidInitCompression = "AppDidInitCompression",
    AppDidInitCors = "AppDidInitCors",
    AppDidInitDatabases = "AppDidInitDatabases",
    AppDidInitDiContainer = "AppDidInitDiContainer",
    AppDidInitDocs = "AppDidInitDocs",
    AppDidInitErrorHandler = "AppDidInitErrorHandler",
    AppDidInitFormatter = "AppDidInitFormatter",
    AppDidInitHttpLogging = "AppDidInitHttpLogging",
    AppDidInitIdentity = "AppDidInitIdentity",
    AppDidInitIndex = "AppDidInitIndex",
    AppDidInitJsonApi = "AppDidInitJsonApi",
    AppDidInitLogging = "AppDidInitLogging",
    AppDidInitMiddlewares = "AppDidInitMiddlewares",
    AppDidInitProviders = "AppDidInitProviders",
    AppDidInitRepositories = "AppDidInitRepositories",
    AppDidInitRouters = "AppDidInitRouters",
    AppDidInitServer = "AppDidInitServer",
    AppDidInitServices = "AppDidInitServices",
    AppDidInitStaticFile = "AppDidInitStaticFile",

    UserDidRegister = "UserDidRegister",
    UserDidLogin = "UserDidLogin",
    UserForgotPassword = "UserForgotPassword",
    UserDidResetPassword = "UserDidResetPassword",
    
    OnInitJsonApi = "OnInitJsonApi",
}