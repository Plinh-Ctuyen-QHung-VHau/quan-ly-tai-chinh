"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = void 0;
const dotenv = require("dotenv");
const path = require("path");
const loadEnv = () => {
    const envPath = path.resolve(process.cwd(), ".env");
    dotenv.config({ path: envPath });
};
exports.loadEnv = loadEnv;
//# sourceMappingURL=envLoader.js.map