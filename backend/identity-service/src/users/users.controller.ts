import {
  Controller,
  Get,
  Put,
  Body,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { Getuser_id } from "../common/decorators/get-user-id.decorator";
import { UpdateProfileDto, UpdateUserSettingsDto } from "./dto/update-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getProfile(@Getuser_id() user_id: string) {
    return this.usersService.getProfile(user_id);
  }

  @Put("me")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  updateProfile(@Getuser_id() user_id: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user_id, dto);
  }

  @Get("settings")
  getSettings(@Getuser_id() user_id: string) {
    return this.usersService.getSettings(user_id);
  }

  @Put("settings")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  updateSettings(
    @Getuser_id() user_id: string,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.usersService.updateSettings(user_id, dto);
  }
}
