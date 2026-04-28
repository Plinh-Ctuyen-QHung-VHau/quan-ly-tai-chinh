import { IsEnum, IsString, IsUrl } from "class-validator";

export enum Ocrsource_type {
  CAMERA = "camera",
  GALLERY = "gallery",
}

export class ScanOcrDto {
  @IsEnum(Ocrsource_type)
  source_type: Ocrsource_type;

  @IsString()
  @IsUrl({
    require_protocol: true,
    protocols: ["http", "https"],
  })
  image_url: string;
}
