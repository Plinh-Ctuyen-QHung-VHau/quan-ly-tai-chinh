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
import { Getuser_id } from "../common/decorators/get-user-id.decorator";
import { ScanOcrDto } from "./dto/ocr.dto";

@Controller("ocr")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post("scan")
  scan(@Getuser_id() user_id: string, @Body() dto: ScanOcrDto) {
    return this.ocrService.scan(user_id, dto);
  }

  @Get("result/:id")
  getResult(
    @Getuser_id() user_id: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.ocrService.getResult(id, user_id);
  }

  @Post("retry/:id")
  retry(@Getuser_id() user_id: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.ocrService.retry(id, user_id);
  }
}
