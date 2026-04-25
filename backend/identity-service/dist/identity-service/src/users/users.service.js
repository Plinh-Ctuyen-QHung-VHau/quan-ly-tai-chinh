"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const users_repository_1 = require("./users.repository");
const AppError_1 = require("../../../shared/errors/AppError");
const errorCodes_1 = require("../../../shared/errors/errorCodes");
let UsersService = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    async getProfile(userId) {
        const profile = await this.usersRepository.findProfileById(userId);
        if (!profile) {
            throw new AppError_1.AppError("User profile not found", errorCodes_1.ERROR_CODES.NOT_FOUND);
        }
        return profile;
    }
    async updateProfile(userId, dto) {
        return this.usersRepository.updateProfile(userId, dto);
    }
    async getSettings(userId) {
        const settings = await this.usersRepository.findSettingsByUserId(userId);
        if (!settings) {
            throw new AppError_1.AppError("User settings not found", errorCodes_1.ERROR_CODES.NOT_FOUND);
        }
        return settings;
    }
    async updateSettings(userId, dto) {
        return this.usersRepository.updateSettings(userId, dto);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository])
], UsersService);
//# sourceMappingURL=users.service.js.map