"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.CommonMetrics = exports.httpRequestDurationHistogram = exports.httpRequestCounter = void 0;
const prom_client_1 = require("prom-client");
Object.defineProperty(exports, "register", { enumerable: true, get: function () { return prom_client_1.register; } });
exports.httpRequestCounter = new prom_client_1.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
});
exports.httpRequestDurationHistogram = new prom_client_1.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.5, 1, 1.5, 2, 5],
});
exports.CommonMetrics = {
    httpRequestCounter: exports.httpRequestCounter,
    httpRequestDurationHistogram: exports.httpRequestDurationHistogram,
    register: prom_client_1.register,
};
//# sourceMappingURL=commonMetrics.js.map