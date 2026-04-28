import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

@Injectable()
export class ImagePreprocessorService {
  private readonly logger = new Logger(ImagePreprocessorService.name);
  private readonly isEnabled: boolean;
  private readonly scriptPath: string;

  constructor() {
    this.isEnabled = process.env.OCR_PREPROCESS_ENABLED === "true";
    // The script is copied to the root of the /app directory in Docker
    this.scriptPath = path.join(process.cwd(), "scripts", "preprocess.py");
    if (this.isEnabled) {
      this.logger.log("OpenCV preprocessing is ENABLED.");
    } else {
      this.logger.log("OpenCV preprocessing is DISABLED.");
    }
  }

  async preprocess(inputBuffer: Buffer, variant: string = "standard"): Promise<Buffer> {
    if (!this.isEnabled) {
      this.logger.log("Skipping OpenCV preprocessing (disabled).");
      return inputBuffer;
    }

    const id = randomUUID();
    const inputPath = path.join(os.tmpdir(), `${id}_input.jpg`);
    const outputPath = path.join(os.tmpdir(), `${id}_output.png`);

    try {
      this.logger.log(`Writing temporary input file to ${inputPath}`);
      await fs.writeFile(inputPath, inputBuffer);

      this.logger.log(`Executing OpenCV script: ${this.scriptPath} with variant: ${variant}`);
      const { stdout, stderr } = await execFileAsync(
        "python3",
        [this.scriptPath, inputPath, outputPath, variant],
        { timeout: 20000 }, // 20 seconds timeout
      );

      if (stdout) this.logger.log(`OpenCV script stdout: ${stdout.trim()}`);
      if (stderr) this.logger.warn(`OpenCV script stderr: ${stderr.trim()}`);

      this.logger.log(`Reading processed output file from ${outputPath}`);
      const outputBuffer = await fs.readFile(outputPath);

      if (!outputBuffer.length) {
        this.logger.warn(
          "OpenCV output buffer is empty, falling back to original image.",
        );
        return inputBuffer;
      }

      this.logger.log(
        "OpenCV preprocessing successful, returning processed buffer.",
      );
      return outputBuffer;
    } catch (error) {
      this.logger.warn(
        `OpenCV preprocessing failed, falling back to original image. Error: ${error.message}`,
      );
      // In case of error, we return the original buffer to not fail the whole OCR process
      return inputBuffer;
    } finally {
      // Cleanup temporary files
      this.logger.log("Cleaning up temporary files.");
      await fs
        .rm(inputPath, { force: true })
        .catch((err) =>
          this.logger.warn(`Failed to delete temp input file: ${err.message}`),
        );
      await fs
        .rm(outputPath, { force: true })
        .catch((err) =>
          this.logger.warn(`Failed to delete temp output file: ${err.message}`),
        );
    }
  }
}
