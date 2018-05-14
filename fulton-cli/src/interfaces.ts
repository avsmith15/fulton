export interface CreateProjectOptions {
    name: string;
    test: boolean;
    databases: string[];
    features: string[];
}

export interface PackageOptions {
    projectName: string;
    appName: string;

    isCompressionEnabled: boolean;
    isCorsEnabled: boolean;

    isDatabaseEnabled: boolean;
    isMongoDbEnabled: boolean;

    isIdentityEnabled?: boolean;
    isGoogleAuthEnabled: boolean;
    isGitHubAuthEnabled: boolean;
    isFacebookAuthEnabled: boolean;

    isApiDocsEnabled: boolean;

    isEmailNotificationEnabled: boolean;
}