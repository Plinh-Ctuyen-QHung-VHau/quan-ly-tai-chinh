import {
  Controller,
  Get,
  Put,
  Body,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { GetUserId } from "../common/decorators/get-user-id.decorator";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getProfile(@GetUserId() userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put("me")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  updateProfile(@GetUserId() userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get("settings")
  getSettings(@GetUserId() userId: string) {
    return this.usersService.getSettings(userId);
  }

  @Put("settings")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  updateSettings(
    @GetUserId() userId: string,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.usersService.updateSettings(userId, dto);
  }
}
