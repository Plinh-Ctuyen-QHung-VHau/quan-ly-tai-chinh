import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import * as sharp from "sharp";
import configuration from "../config/configuration";
import { AppMetrics } from "../metrics/app.metrics";

@Injectable()
export class ImagePreprocessorService {
  private readonly logger = new Logger(ImagePreprocessorService.name);

  constructor(
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
    private readonly metrics: AppMetrics,
  ) {}

  async process(imageBuffer: Buffer): Promise<Buffer> {
    if (!this.appConfig.ocr.preprocess.enabled) {
      this.logger.log(
        "Image preprocessing is disabled. Returning original buffer.",
      );
      return imageBuffer;
    }

    const startTime = Date.now();
    this.logger.log("Starting image preprocessing...");

    try {
      const processedImage = await sharp(imageBuffer)
        .resize({ width: this.appConfig.ocr.preprocess.maxWidth })
        .grayscale()
        .normalize()
        .toBuffer();

      const duration = (Date.now() - startTime) / 1000;
      this.metrics.ocrPreprocessingDurationSeconds.observe(duration);
      this.logger.log(`Image preprocessing completed in ${duration}s.`);

      return processedImage;
    } catch (error) {
      this.logger.warn(
        "Image preprocessing failed. Falling back to original image buffer.",
        error.stack,
      );
      // Fallback to the original buffer if preprocessing fails
      return imageBuffer;
    }
  }
}
