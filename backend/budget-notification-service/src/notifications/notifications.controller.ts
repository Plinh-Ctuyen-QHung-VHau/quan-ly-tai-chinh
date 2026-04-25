import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  UseInterceptors,
  UseFilters,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { GetUserId } from "../common/decorators/get-user-id.decorator";
import { FindNotificationsDto } from "./dto/find-notifications.dto";
import { UpdateNotificationSettingsDto } from "./dto/update-notification-settings.dto";
import { AllExceptionsFilter } from "../common/filters/all-exceptions.filter";
import { TransformInterceptor } from "../common/interceptors/transform.interceptor";

@Controller("notifications")
@UseInterceptors(TransformInterceptor)
@UseFilters(AllExceptionsFilter)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@GetUserId() userId: string, @Query() query: FindNotificationsDto) {
    return this.notificationsService.find(userId, query);
  }

  @Get("settings")
  getSettings(@GetUserId() userId: string) {
    return this.notificationsService.getSettings(userId);
  }

  @Put("settings")
  updateSettings(
    @GetUserId() userId: string,
    @Body() updateDto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(userId, updateDto);
  }

  @Put("read-all")
  markAllAsRead(@GetUserId() userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @GetUserId() userId: string) {
    return this.notificationsService.findById(id, userId);
  }

  @Put(":id/read")
  markAsRead(@Param("id") id: string, @GetUserId() userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }
}
