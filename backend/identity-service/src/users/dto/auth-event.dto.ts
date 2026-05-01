import { IsString, IsNotEmpty } from "class-validator";

export class AuthEventDto {
  @IsString()
  @IsNotEmpty()
  action: string;
}
