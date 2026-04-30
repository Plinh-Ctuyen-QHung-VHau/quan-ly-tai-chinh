import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService, ConfigType } from "@nestjs/config";
import { OcrService } from "./ocr.service";
import { OcrController } from "./ocr.controller";
import { OcrRepository } from "./ocr.repository";
import { StorageModule } from "../storage/storage.module";
import { OcrParser } from "./ocr.parser";
import {
  OCR_ENGINE_ADAPTER,
  OcrEngineAdapter,
} from "./adapters/ocr-engine.adapter";
import { TesseractOcrEngineAdapter } from "./adapters/tesseract-ocr-engine.adapter";
import { configuration } from "../config/configuration";
import { ImagePreprocessorService } from "../preprocess/image-preprocessor.service";
import { AppMetrics } from "../metrics/app.metrics";

/**
 * Primary engine factory — always uses Tesseract.
 */
const primaryEngineFactory = {
  provide: OCR_ENGINE_ADAPTER,
  useFactory: (configService: ConfigService): OcrEngineAdapter => {
    const appConfig =
      configService.get<ConfigType<typeof configuration>>("app");
    console.log(`[OcrModule] OCR engine: tesseract + gemini-3-flash-preview`);
    return new TesseractOcrEngineAdapter(appConfig);
  },
  inject: [ConfigService],
};

@Module({
  imports: [StorageModule, ConfigModule],
  controllers: [OcrController],
  providers: [
    OcrService,
    OcrRepository,
    OcrParser,
    AppMetrics,
    primaryEngineFactory,
    ImagePreprocessorService,
  ],
})
export class OcrModule {}
