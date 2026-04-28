export declare const errorResponse: (message: string, code: string, details?: any) => {
    success: boolean;
    message: string;
    error: {
        code: string;
        details: any;
    };
};
