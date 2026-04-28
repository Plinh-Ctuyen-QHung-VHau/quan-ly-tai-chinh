export declare class AppError extends Error {
    readonly code: string;
    readonly details: any;
    constructor(message: string, code: string, details?: any);
}
