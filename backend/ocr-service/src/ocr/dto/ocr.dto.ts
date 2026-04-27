import { IsEnum, IsUrl, IsString } from "class-validator";
import { Expose } from "class-transformer";

export enum OcrSourceType {
  CAMERA = "camera",
  GALLERY = "gallery",
}

export class ScanOcrDto {
  @IsEnum(OcrSourceType)
  @Expose({ name: "source_type" })
  sourceType: OcrSourceType;

  @IsUrl()
  @IsString()
  @Expose({ name: "image_url" })
  imageUrl: string;
}
