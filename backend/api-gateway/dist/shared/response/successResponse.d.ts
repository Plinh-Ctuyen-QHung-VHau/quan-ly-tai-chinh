export declare const successResponse: <T>(data: T, message: string, meta?: any) => {
    success: boolean;
    message: string;
    data: T;
    meta: any;
};
