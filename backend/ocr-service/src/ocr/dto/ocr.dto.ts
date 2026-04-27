import { IsEnum, IsString, IsUrl } from "class-validator";

export enum OcrSourceType {
  CAMERA = "camera",
  GALLERY = "gallery",
}

export class ScanOcrDto {
  @IsEnum(OcrSourceType)
  sourceType: OcrSourceType;

  @IsString()
  @IsUrl({
    require_protocol: true,
    protocols: ["http", "https"],
  })
  imageUrl: string;
}
