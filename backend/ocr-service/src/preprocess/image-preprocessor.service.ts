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

    this.scriptPath = path.join(process.cwd(), "scripts", "preprocess.py");
    if (this.isEnabled) {
      this.logger.log("Đã BẬT bộ tiền xử lý ảnh OpenCV.");
    } else {
      this.logger.log("Đã TẮT bộ tiền xử lý ảnh OpenCV.");
    }
  }

  async preprocess(inputBuffer: Buffer, variant: string = "standard"): Promise<Buffer> {
    if (!this.isEnabled) {
      this.logger.log("Bỏ qua bước tiền xử lý OpenCV vì tính năng đang tắt.");
      return inputBuffer;
    }

    const id = randomUUID();
    const inputPath = path.join(os.tmpdir(), `${id}_input.jpg`);
    const outputPath = path.join(os.tmpdir(), `${id}_output.png`);

    try {
      this.logger.log(`Ghi file ảnh gốc tạm thời vào ${inputPath}`);
      await fs.writeFile(inputPath, inputBuffer);

      this.logger.log(`Thực thi script OpenCV: ${this.scriptPath} với mode: ${variant}`);
      const { stdout, stderr } = await execFileAsync(
        "python3",
        [this.scriptPath, inputPath, outputPath, variant],
        { timeout: 20000 },
      );

      if (stdout) this.logger.log(`Log từ OpenCV script (stdout): ${stdout.trim()}`);
      if (stderr) this.logger.warn(`Lỗi từ OpenCV script (stderr): ${stderr.trim()}`);

      this.logger.log(`Đọc lại file ảnh đã qua xử lý từ ${outputPath}`);
      const outputBuffer = await fs.readFile(outputPath);

      if (!outputBuffer.length) {
        this.logger.warn(
          "Dữ liệu ảnh trả về từ OpenCV bị rỗng, sẽ dùng lại ảnh gốc cho chắc.",
        );
        return inputBuffer;
      }

      this.logger.log(
        "Chạy xong tiền xử lý OpenCV, trả về ảnh đã tối ưu.",
      );
      return outputBuffer;
    } catch (error) {
      this.logger.warn(
        `Lỗi khi chạy bộ lọc ảnh OpenCV, fallback về dùng ảnh gốc. Chi tiết lỗi: ${error.message}`,
      );

      return inputBuffer;
    } finally {

      this.logger.log("Đang dọn dẹp xóa các file ảnh tạm.");
      await fs
        .rm(inputPath, { force: true })
        .catch((err) =>
          this.logger.warn(`Xóa file ảnh tạm đầu vào thất bại: ${err.message}`),
        );
      await fs
        .rm(outputPath, { force: true })
        .catch((err) =>
          this.logger.warn(`Xóa file ảnh tạm đầu ra thất bại: ${err.message}`),
        );
    }
  }
}
