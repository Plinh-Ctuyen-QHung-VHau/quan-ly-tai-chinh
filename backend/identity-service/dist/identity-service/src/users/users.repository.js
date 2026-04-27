"use strict";
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersRepository = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const database_module_1 = require("../database/database.module");
const AppError_1 = require("../../../shared/errors/AppError");
const errorCodes_1 = require("../../../shared/errors/errorCodes");
let UsersRepository = class UsersRepository {
  constructor(pool) {
    this.pool = pool;
  }
  async findProfileById(user_id) {
    const result = await this.pool.query(
      "SELECT id, full_name, avatar_url, created_at, updated_at FROM identity.profiles WHERE id = $1",
      [user_id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }
  async updateProfile(user_id, dto) {
    const { fullName, avatarUrl } = dto;
    const result = await this.pool.query(
      `UPDATE identity.profiles SET 
        full_name = COALESCE($1, full_name), 
        avatar_url = COALESCE($2, avatar_url),
        updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [fullName, avatarUrl, user_id],
    );
    return result.rows[0];
  }
  async findSettingsByuser_id(user_id) {
    const result = await this.pool.query(
      "SELECT id, user_id, timezone, language, theme, created_at, updated_at FROM identity.user_settings WHERE user_id = $1",
      [user_id],
    );
    if (result.rows.length === 0) {
      return this.createDefaultSettings(user_id);
    }
    return result.rows[0];
  }
  async updateSettings(user_id, dto) {
    const { timezone, language, theme } = dto;
    const result = await this.pool.query(
      `UPDATE identity.user_settings SET 
        timezone = COALESCE($1, timezone), 
        language = COALESCE($2, language),
        theme = COALESCE($3, theme),
        updated_at = NOW()
       WHERE user_id = $4 RETURNING *`,
      [timezone, language, theme, user_id],
    );
    if (result.rows.length === 0) {
      throw new AppError_1.AppError(
        "Settings not found for user",
        errorCodes_1.ERROR_CODES.NOT_FOUND,
      );
    }
    return result.rows[0];
  }
  async createDefaultSettings(user_id) {
    const result = await this.pool.query(
      `INSERT INTO identity.user_settings (user_id, timezone, language, theme)
           VALUES ($1, 'UTC', 'vi', 'light')
           RETURNING *`,
      [user_id],
    );
    return result.rows[0];
  }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate(
  [
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.PG_CONNECTION)),
    __metadata("design:paramtypes", [
      typeof (_a = typeof pg_1.Pool !== "undefined" && pg_1.Pool) === "function"
        ? _a
        : Object,
    ]),
  ],
  UsersRepository,
);
//# sourceMappingURL=users.repository.js.map
