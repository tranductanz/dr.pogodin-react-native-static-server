export declare const WORK_DIR: string;
export declare const ERROR_LOG_FILE: string;
export declare const UPLOADS_DIR: string;
export type ErrorLogOptions = {
    conditionHandling?: boolean;
    fileNotFound?: boolean;
    requestHandling?: boolean;
    requestHeader?: boolean;
    requestHeaderOnError?: boolean;
    responseHeader?: boolean;
    timeouts?: boolean;
};
export type StandardConfigOptions = {
    errorLog?: ErrorLogOptions;
    extraConfig: string;
    fileDir: string;
    hostname: string;
    port: number;
    webdav?: string[];
};
export declare function newStandardConfigFile(options: StandardConfigOptions): Promise<string>;
