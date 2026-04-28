import { Injectable, Logger } from "@nestjs/common";
import { OcrEngineAdapter, OcrEngineResult } from "./ocr-engine.adapter";
import { OcrParser, ParsedOcrResult } from "../ocr.parser";

export interface EngineParseResult {
  engineResult: OcrEngineResult;
  parsedResult: ParsedOcrResult;
  parseScore: number;
}

@Injectable()
export class OcrEngineSelector {
  private readonly logger = new Logger(OcrEngineSelector.name);

  constructor(private readonly parser: OcrParser) {}

  /**
   * Run all provided engines on the same image buffer, parse each result,
   * and return the best one based on parse quality score.
   */
  async selectBest(
    engines: OcrEngineAdapter[],
    imageBuffer: Buffer,
    ocrLanguage: string,
  ): Promise<{ best: EngineParseResult; all: EngineParseResult[] }> {
    const results: EngineParseResult[] = [];

    for (const engine of engines) {
      try {
        const t0 = Date.now();
        const engineResult = await engine.recognize(imageBuffer);
        const durationMs = Date.now() - t0;
        engineResult.durationMs = durationMs;

        if (!engineResult.rawText || engineResult.rawText.trim().length < 5) {
          this.logger.warn(`Engine ${engine.name}: text too short, skipping`);
          continue;
        }

        const parsedResult = this.parser.parse(
          engineResult.rawText,
          engineResult,
          engine.name,
          ocrLanguage,
        );

        const parseScore = this.computeParseScore(parsedResult, engineResult);

        this.logger.log(
          `Engine ${engine.name}: confidence=${engineResult.confidence.toFixed(1)}, parseScore=${parseScore}, amount=${parsedResult.suggested_amount ?? "none"} (${durationMs}ms)`,
        );

        results.push({ engineResult, parsedResult, parseScore });
      } catch (err) {
        this.logger.warn(`Engine ${engine.name} failed: ${err.message}`);
      }
    }

    if (results.length === 0) {
      return null;
    }

    // Sort by parseScore descending
    results.sort((a, b) => b.parseScore - a.parseScore);
    const best = results[0];

    this.logger.log(`Selected engine: ${best.engineResult.engine} (score=${best.parseScore})`);
    return { best, all: results };
  }

  /**
   * Compute a quality score based on what the parser extracted,
   * not just raw OCR confidence.
   */
  private computeParseScore(parsed: ParsedOcrResult, engine: OcrEngineResult): number {
    let score = parsed.confidence_score ?? 0;

    // Bonus for finding structured data
    if (parsed.suggested_amount !== null) score += 30;
    else score -= 30;

    if (parsed.suggested_date !== null) score += 20;
    if (parsed.merchant_name) score += 10;

    // Bonus for priority roles
    const selectedAmount = parsed.parsed_fields_json?.selected_amount;
    if (selectedAmount) {
      const role = selectedAmount.role;
      if (role === "target") {
        score += 10;
      } else if (role === "unknown") {
        score -= 20;
      }
    }

    // Penalty for very short text
    if (engine.rawText.trim().length < 30) score -= 30;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
