import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { OcrService } from "./ocr.service";
import { GetUserId } from "../common/decorators/get-user-id.decorator";
import { ScanOcrDto } from "./dto/ocr.dto";

@Controller("ocr")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post("scan")
  scan(@GetUserId() userId: string, @Body() dto: ScanOcrDto) {
    return this.ocrService.scan(userId, dto);
  }

  @Get("result/:id")
  getResult(
    @GetUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.ocrService.getResult(id, userId);
  }

  @Post("retry/:id")
  retry(@GetUserId() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.ocrService.retry(id, userId);
  }
}
