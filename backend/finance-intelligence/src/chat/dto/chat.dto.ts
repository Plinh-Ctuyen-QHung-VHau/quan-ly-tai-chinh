import { IsOptional, IsString } from "class-validator";

export class ChatInputSecureDto {
  user_id?: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class ChatResponseDto {
  reply: string;
  data?: any;
  metadata?: {
    intent?: string;
    entities?: Record<string, any>;
    nlp_source?: "rule" | "ai";
    args?: Record<string, any>;
  };
}
