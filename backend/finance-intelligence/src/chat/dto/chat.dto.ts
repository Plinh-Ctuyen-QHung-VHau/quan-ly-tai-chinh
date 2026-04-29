import { IsOptional, IsString } from "class-validator";

export class ChatInputDto {
  @IsString()
  user_id: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class ChatResponseDto {
  reply: string;
  data?: any;
}
