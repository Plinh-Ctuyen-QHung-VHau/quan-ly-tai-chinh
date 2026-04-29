import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  UseInterceptors,
  UseFilters,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { Getuser_id } from "../common/decorators/get-user-id.decorator";
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
  findAll(@Getuser_id() user_id: string, @Query() query: FindNotificationsDto) {
    return this.notificationsService.find(user_id, query);
  }

  @Get("settings")
  getSettings(@Getuser_id() user_id: string) {
    return this.notificationsService.getSettings(user_id);
  }

  @Put("settings")
  updateSettings(
    @Getuser_id() user_id: string,
    @Body() updateDto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(user_id, updateDto);
  }

  @Put("read-all")
  markAllAsRead(@Getuser_id() user_id: string) {
    return this.notificationsService.markAllAsRead(user_id);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Getuser_id() user_id: string) {
    return this.notificationsService.findById(id, user_id);
  }

  @Put(":id/read")
  markAsRead(@Param("id") id: string, @Getuser_id() user_id: string) {
    return this.notificationsService.markAsRead(id, user_id);
  }

  // 🧪 Endpoint để test nhanh thông báo (Chỉ dùng trong development)
  @Post("test-reminder/:userId")
  async testReminder(@Param("userId") userId: string) {
    return this.notificationsService.createNotification({
      userId,
      title: "🔔 Nhắc nhở trải nghiệm",
      content: "Chào bạn! Đây là thông báo thử nghiệm để xác nhận hệ thống Push Notification đã hoạt động hoàn hảo. Đừng quên cập nhật chi tiêu hôm nay nhé!",
      type: "reminder",
    });
  }
}
