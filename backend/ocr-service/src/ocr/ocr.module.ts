import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService, ConfigType } from "@nestjs/config";
import { OcrService } from "./ocr.service";
import { OcrController } from "./ocr.controller";
import { OcrRepository } from "./ocr.repository";
import { DatabaseModule } from "../database/database.module";
import { StorageModule } from "../storage/storage.module";
import { OcrParser } from "./ocr.parser";
import { OcrEngineAdapter } from "./adapters/ocr-engine.adapter";
import { MockOcrEngineAdapter } from "./adapters/mock-ocr-engine.adapter";
import { TesseractOcrEngineAdapter } from "./adapters/tesseract-ocr-engine.adapter";
import { configuration } from "../config/configuration";
import { ImagePreprocessorService } from "./image-preprocessor.service";

const ocrEngineFactory = {
  provide: OcrEngineAdapter,
  useFactory: (
    configService: ConfigService,
    appConfig: ConfigType<typeof configuration>,
  ) => {
    const engine = appConfig.ocr.engine;
    if (engine === "tesseract") {
      return new TesseractOcrEngineAdapter(appConfig);
    }
    return new MockOcrEngineAdapter();
  },
  inject: [ConfigService, configuration.KEY],
};

@Module({
  imports: [DatabaseModule, StorageModule, ConfigModule],
  controllers: [OcrController],
  providers: [
    OcrService,
    OcrRepository,
    OcrParser,
    ocrEngineFactory,
    MockOcrEngineAdapter,
    TesseractOcrEngineAdapter,
    ImagePreprocessorService,
  ],
})
export class OcrModule {}
