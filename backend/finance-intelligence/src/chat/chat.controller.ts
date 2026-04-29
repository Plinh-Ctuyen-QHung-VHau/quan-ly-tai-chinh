import { Body, Controller, Post, UsePipes, ValidationPipe } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatInputSecureDto } from "./dto/chat.dto";

@Controller("chat")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  chat(@Body() dto: ChatInputSecureDto) {
    return this.chatService.chat(dto);
  }
}
