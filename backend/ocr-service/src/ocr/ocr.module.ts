import { Module } from "@nestjs/common";
import { OcrController } from "./ocr.controller";
import { OcrService } from "./ocr.service";
import { OcrRepository } from "./ocr.repository";
import { DatabaseModule } from "../database/database.module";
import { StorageReader } from "../storage/storage.reader";
import { ConfigModule } from "@nestjs/config";
import { OcrParser } from "./ocr.parser";
import { MockOcrEngineAdapter } from "./adapters/mock-ocr-engine.adapter";
import { OCR_ENGINE_ADAPTER } from "./adapters/ocr-engine.adapter";

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [OcrController],
  providers: [
    OcrService,
    OcrRepository,
    StorageReader,
    OcrParser,
    {
      provide: OCR_ENGINE_ADAPTER,
      useClass: MockOcrEngineAdapter, // Swap this with a real adapter in production
    },
  ],
})
export class OcrModule {}
