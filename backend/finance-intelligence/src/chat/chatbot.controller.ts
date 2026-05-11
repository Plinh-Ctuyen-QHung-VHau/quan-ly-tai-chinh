import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatInputSecureDto } from "./dto/chat.dto";
import { Getuser_id } from "../common/decorators/get-user-id.decorator";

@Controller("chatbot")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
export class ChatbotController {
  constructor(private readonly chatService: ChatService) { }

  @Post("ask")
  chat(@Getuser_id() user_id: string, @Body() dto: ChatInputSecureDto) {
    dto.user_id = user_id;
    return this.chatService.chat(dto);
  }

  @Get("history")
  getHistory(@Getuser_id() user_id: string) {
    return this.chatService.getHistory(user_id);
  }

  @Get("history/:id")
  getSessionHistory(@Param("id") sessionId: string) {
    return this.chatService.getSessionHistory(sessionId);
  }
}
