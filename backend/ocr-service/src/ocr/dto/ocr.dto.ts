import { IsEnum, IsUrl, IsString } from "class-validator";

export enum OcrSourceType {
  CAMERA = "camera",
  GALLERY = "gallery",
}

export class ScanOcrDto {
  @IsEnum(OcrSourceType)
  sourceType: OcrSourceType;

  @IsUrl()
  @IsString()
  imageUrl: string;
}
