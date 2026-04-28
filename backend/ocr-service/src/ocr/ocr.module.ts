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
import { MockOcrEngineAdapter } from "./adapters/mock-ocr-engine.adapter";
import { TesseractOcrEngineAdapter } from "./adapters/tesseract-ocr-engine.adapter";
import { PaddleOcrEngineAdapter } from "./adapters/paddleocr-engine.adapter";
import { OcrEngineSelector } from "./adapters/ocr-engine-selector";
import { configuration } from "../config/configuration";
import { ImagePreprocessorService } from "../preprocess/image-preprocessor.service";
import { AppMetrics } from "../metrics/app.metrics";

/**
 * Primary engine factory — respects OCR_ENGINE env var.
 */
const primaryEngineFactory = {
  provide: OCR_ENGINE_ADAPTER,
  useFactory: (configService: ConfigService): OcrEngineAdapter => {
    const engine = configService.get<string>("app.ocr.engine");
    console.log(`[OcrModule] Primary OCR engine: "${engine}"`);
    if (engine === "tesseract") {
      const appConfig =
        configService.get<ConfigType<typeof configuration>>("app");
      return new TesseractOcrEngineAdapter(appConfig);
    }
    if (engine === "paddleocr") {
      return new PaddleOcrEngineAdapter();
    }
    console.warn(
      `[OcrModule] engine="${engine}" not recognized — falling back to Mock`,
    );
    return new MockOcrEngineAdapter();
  },
  inject: [ConfigService],
};

/**
 * All engines factory — builds the list of engines from OCR_ENGINES env.
 * Used only in compare mode (OCR_COMPARE_ENGINES=true).
 */
const allEnginesFactory = {
  provide: "OCR_ENGINES_ALL",
  useFactory: (configService: ConfigService): OcrEngineAdapter[] => {
    const enginesStr = process.env.OCR_ENGINES || configService.get<string>("app.ocr.engine") || "tesseract";
    const engineNames = enginesStr.split(",").map(s => s.trim()).filter(Boolean);
    console.log(`[OcrModule] All OCR engines: [${engineNames.join(", ")}]`);

    const engines: OcrEngineAdapter[] = [];
    const appConfig = configService.get<ConfigType<typeof configuration>>("app");

    for (const name of engineNames) {
      if (name === "tesseract") {
        engines.push(new TesseractOcrEngineAdapter(appConfig));
      } else if (name === "paddleocr") {
        engines.push(new PaddleOcrEngineAdapter());
      } else {
        console.warn(`[OcrModule] Unknown engine "${name}", skipping.`);
      }
    }

    if (engines.length === 0) {
      console.warn("[OcrModule] No valid engines configured, using Mock.");
      engines.push(new MockOcrEngineAdapter());
    }

    return engines;
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
    OcrEngineSelector,
    AppMetrics,
    primaryEngineFactory,
    allEnginesFactory,
    ImagePreprocessorService,
  ],
})
export class OcrModule {}
