import { Body, Controller, Post, UsePipes, ValidationPipe } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatInputDto } from "./dto/chat.dto";

@Controller("chat")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  chat(@Body() dto: ChatInputDto) {
    return this.chatService.chat(dto);
  }
}
