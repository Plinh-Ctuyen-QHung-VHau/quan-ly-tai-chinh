import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { AppError } from "@shared/errors/AppError";
import { OcrEngineAdapter, OcrEngineResult } from "./ocr-engine.adapter";

const execFileAsync = promisify(execFile);

const PADDLE_TIMEOUT_MS = 30_000;

@Injectable()
export class PaddleOcrEngineAdapter implements OcrEngineAdapter {
  readonly name = "paddleocr" as const;
  private readonly logger = new Logger(PaddleOcrEngineAdapter.name);
  private readonly scriptPath: string;

  constructor() {
    this.scriptPath = path.join(process.cwd(), "scripts", "paddleocr_runner.py");
    this.logger.log(`PaddleOCR runner script: ${this.scriptPath}`);
  }

  async recognize(imageBuffer: Buffer): Promise<OcrEngineResult> {
    const id = randomUUID();
    const tmpImagePath = path.join(os.tmpdir(), `${id}_paddle_input.jpg`);

    try {
      // Write buffer to temp file (PaddleOCR reads from file path)
      await fs.writeFile(tmpImagePath, imageBuffer);

      const t0 = Date.now();
      this.logger.log(`Running PaddleOCR on ${tmpImagePath}...`);

      const { stdout, stderr } = await execFileAsync(
        "python3",
        [this.scriptPath, tmpImagePath],
        { timeout: PADDLE_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
      );

      const durationMs = Date.now() - t0;
      this.logger.log(`PaddleOCR finished in ${durationMs}ms`);

      if (stderr?.trim()) {
        this.logger.warn(`PaddleOCR stderr: ${stderr.trim().slice(0, 500)}`);
      }

      if (!stdout?.trim()) {
        throw new AppError(
          "PADDLEOCR_FAILED",
          "PaddleOCR returned empty stdout.",
          { reason: "PADDLEOCR_FAILED" },
        );
      }

      let result: OcrEngineResult;
      try {
        result = JSON.parse(stdout.trim());
      } catch {
        throw new AppError(
          "PADDLEOCR_INVALID_JSON",
          `PaddleOCR returned invalid JSON: ${stdout.slice(0, 200)}`,
          { reason: "PADDLEOCR_FAILED" },
        );
      }

      result.durationMs = durationMs;
      return result;
    } catch (error) {
      // Handle timeout specifically
      if (error.killed || error.signal === "SIGTERM") {
        throw new AppError(
          "PADDLEOCR_TIMEOUT",
          `PaddleOCR timed out after ${PADDLE_TIMEOUT_MS}ms.`,
          { reason: "PADDLEOCR_TIMEOUT" },
        );
      }
      // Re-throw AppErrors as-is
      if (error.code === "PADDLEOCR_FAILED" || error.code === "PADDLEOCR_INVALID_JSON" || error.code === "PADDLEOCR_TIMEOUT") {
        throw error;
      }
      throw new AppError(
        "PADDLEOCR_FAILED",
        `PaddleOCR failed: ${error.message}`,
        { reason: "PADDLEOCR_FAILED" },
      );
    } finally {
      await fs.rm(tmpImagePath, { force: true }).catch(() => {});
    }
  }
}
