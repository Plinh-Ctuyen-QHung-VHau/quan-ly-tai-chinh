import { register, Counter, Histogram } from "prom-client";
export declare const httpRequestCounter: Counter<"method" | "route" | "status_code">;
export declare const httpRequestDurationHistogram: Histogram<"method" | "route" | "status_code">;
export declare const CommonMetrics: {
    httpRequestCounter: Counter<"method" | "route" | "status_code">;
    httpRequestDurationHistogram: Histogram<"method" | "route" | "status_code">;
    register: import("prom-client").Registry<"text/plain; version=0.0.4; charset=utf-8">;
};
export { register };
