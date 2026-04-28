import { Injectable } from "@nestjs/common";

// ─── Types ───────────────────────────────────────────────────────────

export type AmountRole = "target" | "item" | "discount" | "fee" | "balance" | "quantity" | "code" | "unknown";

export interface AmountCandidate {
  raw: string;
  value: number;
  line: string;
  lineIndex: number;
  role: AmountRole;
  score: number;
  reasons: string[];
  bbox?: { left: number; top: number; width: number; height: number };
  visual?: {
    textHeight?: number;
    medianTextHeight?: number;
    relativeHeight?: number;
    isLargeText?: boolean;
    centerX?: number;
    centerY?: number;
    imageWidth?: number;
    imageHeight?: number;
    isNearBottom?: boolean;
    isRightAligned?: boolean;
    isBoldLike?: boolean;
  };
}

export interface DateCandidate {
  raw: string;
  value: Date;
  iso: string;
  line: string;
  lineIndex: number;
  score: number;
  reasons: string[];
}

export interface ParsedOcrResult {
  extracted_text: string;
  suggested_amount: number | null;
  suggested_date: Date | null;
  suggested_type: "income" | "expense" | null;
  suggested_category_id: string | null;
  merchant_name: string | null;
  confidence_score: number | null;
  parsed_fields_json: Record<string, any>;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function normalizeLine(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

function parseMoney(raw: string): number {
  let s = raw.replace(/\s/g, "");
  // "50.000,00" or "1.200,50" → decimal comma
  if (/,\d{2}$/.test(s) && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
    return Math.abs(parseFloat(s));
  }
  // "50,000.00" or "1,200.50" → decimal dot
  if (/\.\d{2}$/.test(s) && s.includes(",")) {
    s = s.replace(/,/g, "");
    return Math.abs(parseFloat(s));
  }
  // Everything else: dots and commas are thousand separators
  s = s.replace(/[.,]/g, "");
  const v = parseFloat(s);
  return isNaN(v) ? NaN : Math.abs(v);
}

// ─── Category rules ──────────────────────────────────────────────────

const CATEGORY_RULES: { name: string; keywords: RegExp }[] = [
  { name: "Ăn uống", keywords: /cafe|coffee|ca phe|tra sua|quan an|nha hang|\bcom\b|\bbun\b|\bpho\b|sting|nuoc ngot|highlands|starbucks|banh mi|lau|bap rang/ },
  { name: "Di chuyển", keywords: /\bgrab\b|\bgojek\b|\btaxi\b|\bxang\b|ve xe|\bbus\b/ },
  { name: "Mua sắm", keywords: /shopee|lazada|tiki|sendo|don hang|san pham|gio hang|quan ao|giay|dep|tui|balo|phu kien/ },
  { name: "Điện", keywords: /tien dien|\bevn\b|dien luc/ },
  { name: "Nước", keywords: /tien nuoc|cap nuoc/ },
  { name: "Internet", keywords: /internet|wifi|\bfpt\b|viettel|\bvnpt\b|\bcuoc\b/ },
  { name: "Y tế", keywords: /benh vien|phong kham|\bthuoc\b|nha thuoc|pharmacy/ },
  { name: "Học tập", keywords: /hoc phi|\bsach\b|khoa hoc|truong hoc|dai hoc|trung tam/ },
  { name: "Giải trí", keywords: /\bphim\b|cinema|\bcgv\b|\bgame\b|karaoke|netflix|spotify/ },
  { name: "Tiền nhà", keywords: /tien nha|thue nha|phong tro/ },
  { name: "Lương", keywords: /\bluong\b|salary|payroll|thuc linh|thu nhap|chuyen khoan/ },
  { name: "Thưởng", keywords: /\bthuong\b|\bbonus\b/ },
];

// ─── Parser ──────────────────────────────────────────────────────────

@Injectable()
export class OcrParser {

  parse(
    rawText: string,
    ocrData: any,
    ocrEngine: string,
    ocrLanguage: string,
  ): ParsedOcrResult {
    // 1. Split & normalize
    const lines = rawText.split(/\r?\n/).map(normalizeLine).filter(Boolean);
    const foldedLines = lines.map(fold);
    const foldedText = foldedLines.join(" ");

    // 2. Amounts (with visual features from OCR bbox data)
    const validOcrLines = ocrData?.lines?.filter((l: any) => l.text?.trim().length > 0) || [];
    const amountCandidates = this.extractAmounts(lines, foldedLines, validOcrLines);
    this.scoreAmounts(amountCandidates, lines.length);
    const selectedAmount = this.selectAmount(amountCandidates);

    // 3. Dates
    const dateCandidates = this.extractDates(lines, foldedLines);
    const selectedDate = dateCandidates.length > 0 ? dateCandidates[0] : null;

    // 4. Type
    const suggested_type = this.detectType(foldedText, selectedAmount ? fold(selectedAmount.line) : "");

    // 5. Category
    const categoryName = this.detectCategory(foldedText, suggested_type);

    // 6. Merchant
    const merchant_name = this.detectMerchant(lines, foldedLines);

    // 7. Confidence
    let confidence = 0;
    if (selectedAmount) confidence += 40;
    if (selectedDate) confidence += 20;
    if (suggested_type) confidence += 15;
    if (categoryName) confidence += 15;
    if (merchant_name) confidence += 10;

    return {
      extracted_text: rawText,
      suggested_amount: selectedAmount?.value ?? null,
      suggested_date: selectedDate?.value ?? null,
      suggested_type,
      suggested_category_id: null,
      merchant_name,
      confidence_score: Math.min(100, confidence),
      parsed_fields_json: {
        ocr_engine: ocrEngine,
        ocr_language: ocrLanguage,
        raw_text: rawText,
        folded_text: foldedText,
        amount_candidates: amountCandidates,
        selected_amount: selectedAmount,
        date_candidates: dateCandidates,
        selected_date: selectedDate
          ? { ...selectedDate, iso: selectedDate.iso }
          : null,
        suggested_category_name: categoryName,
        merchant_name,
        warnings: selectedAmount ? [] : ["No suitable amount found"],
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // AMOUNT EXTRACTION
  // ═══════════════════════════════════════════════════════════════════

  private extractAmounts(lines: string[], foldedLines: string[], validOcrLines: any[]): AmountCandidate[] {
    const candidates: AmountCandidate[] = [];
    const re = /(?:₫\s*)?([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)(?:\s*(?:vnd|vnđ|đ|đồng|₫|d\b))?/gi;

    // Compute median text height from OCR word bboxes
    const wordHeights: number[] = [];
    for (const ocrLine of validOcrLines) {
      for (const w of (ocrLine.words || [])) {
        if (w.bbox && w.text?.trim()) wordHeights.push(w.bbox.y1 - w.bbox.y0);
      }
      // Also use line-level bbox if no words
      if ((!ocrLine.words || ocrLine.words.length === 0) && ocrLine.bbox) {
        wordHeights.push(ocrLine.bbox.y1 - ocrLine.bbox.y0);
      }
    }
    wordHeights.sort((a, b) => a - b);
    const medianH = wordHeights.length > 0 ? wordHeights[Math.floor(wordHeights.length / 2)] : 0;

    // Get image dimensions from first line's words if available
    let imgW = 0;
    let imgH = 0;
    for (const ocrLine of validOcrLines) {
      const bb = ocrLine.bbox;
      if (bb) {
        if (bb.x1 > imgW) imgW = bb.x1;
        if (bb.y1 > imgH) imgH = bb.y1;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fLine = foldedLines[i];

      if (/^(sdt|mst|hotline|phone|fax|tel|dia chi|dc|email|ma so thue)/i.test(fLine)) continue;

      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        const rawNum = m[1];
        if (!rawNum) continue;

        const value = parseMoney(rawNum);
        if (isNaN(value) || value <= 0) continue;

        const digits = rawNum.replace(/[.,\s]/g, "");
        if (digits.length >= 9 && digits.startsWith("0")) continue;
        if (digits.length <= 2 && value < 100) continue;

        const hasCurrency = /(?:vnd|vnđ|đ|đồng|₫|\bd$)/i.test(m[0]);
        const role = this.classifyRoleWithContext(fLine, value, hasCurrency, foldedLines, i);

        // Compute visual features from OCR bbox
        const vis = this.computeVisualFeatures(i, m.index, m[0].length, line, validOcrLines, medianH, imgW, imgH);

        candidates.push({
          raw: m[0].trim(),
          value,
          line,
          lineIndex: i,
          role,
          score: 0,
          reasons: [],
          bbox: vis.bbox,
          visual: vis.visual,
        });
      }
    }
    return candidates;
  }

  /**
   * Extract visual features for an amount match from OCR bbox data.
   * Returns empty objects gracefully if no bbox data available.
   */
  private computeVisualFeatures(
    lineIndex: number, matchIndex: number, matchLength: number,
    lineText: string, validOcrLines: any[],
    medianH: number, imgW: number, imgH: number,
  ): { bbox?: AmountCandidate["bbox"]; visual?: AmountCandidate["visual"] } {
    const ocrLine = validOcrLines[lineIndex];
    if (!ocrLine) return {};

    let left = 99999, top = 99999, right = 0, bottom = 0;
    let found = false;
    const matchEnd = matchIndex + matchLength;

    if (ocrLine.words?.length) {
      let pos = 0;
      for (const word of ocrLine.words) {
        const wi = lineText.indexOf(word.text, pos);
        if (wi === -1) continue;
        const we = wi + word.text.length;
        pos = we;
        if (Math.max(wi, matchIndex) < Math.min(we, matchEnd) && word.bbox) {
          found = true;
          if (word.bbox.x0 < left) left = word.bbox.x0;
          if (word.bbox.y0 < top) top = word.bbox.y0;
          if (word.bbox.x1 > right) right = word.bbox.x1;
          if (word.bbox.y1 > bottom) bottom = word.bbox.y1;
        }
      }
    } else if (ocrLine.bbox) {
      found = true;
      left = ocrLine.bbox.x0; top = ocrLine.bbox.y0;
      right = ocrLine.bbox.x1; bottom = ocrLine.bbox.y1;
    }

    if (!found) return {};

    const bbox = { left, top, width: right - left, height: bottom - top };
    const textHeight = bbox.height;
    const relativeHeight = medianH > 0 ? Math.round((textHeight / medianH) * 100) / 100 : undefined;
    const isLargeText = relativeHeight ? relativeHeight >= 1.3 : false;
    const centerX = left + bbox.width / 2;
    const centerY = top + bbox.height / 2;
    const isNearBottom = imgH > 0 ? (centerY / imgH) >= 0.6 : false;
    const isRightAligned = imgW > 0 ? (centerX / imgW) >= 0.65 : false;
    const isBoldLike = isLargeText && (ocrLine.confidence ?? 0) > 70;

    return {
      bbox,
      visual: {
        textHeight, medianTextHeight: medianH || undefined,
        relativeHeight, isLargeText,
        centerX: Math.round(centerX), centerY: Math.round(centerY),
        imageWidth: imgW || undefined, imageHeight: imgH || undefined,
        isNearBottom, isRightAligned, isBoldLike,
      },
    };
  }

  private static readonly TARGET_RE = /tong dich vu|tong cong|tong tien|thanh tien|thanh toan|da thanh toan|phai thanh toan|can thanh toan|amount due|total due|\btotal\b|grand total|amount paid|so tien giao dich|transaction amount|thuc linh|net salary|net pay|giao dich thanh cong|so tien/;

  private classifyRoleWithContext(
    fLine: string, value: number, hasCurrency: boolean,
    foldedLines: string[], lineIndex: number,
  ): AmountRole {
    // Target keywords on current line
    if (OcrParser.TARGET_RE.test(fLine)) return "target";

    // Discount
    if (/voucher|giam|discount|cashback|\bxu\b|hoan tien/.test(fLine)) return "discount";
    // Fee
    if (/phi van chuyen|shipping|service fee|phi dich vu/.test(fLine)) return "fee";
    // Balance
    if (/so du|balance/.test(fLine)) return "balance";
    // Code / ID lines
    if (/ma hoa don|ma giao dich|ma khach|ma don|sdt|so dien thoai|hotline|mst|tai khoan|stk|so hd|so the/.test(fLine)) return "code";
    // Item line
    if (/^\s*\d+\s*x[a-z]?\s/i.test(fLine)) return "item";
    if (/\s+x\s+[\d.,]+/.test(fLine) && !/tong|total|thanh/.test(fLine)) return "item";
    // Quantity
    if (value < 1000 && !hasCurrency && !/tong|total|thanh|phi|tien/.test(fLine)) return "quantity";

    // Context check: if nearby lines (±2) have target keywords, promote to target
    for (let d = -2; d <= 2; d++) {
      if (d === 0) continue;
      const ni = lineIndex + d;
      if (ni >= 0 && ni < foldedLines.length && OcrParser.TARGET_RE.test(foldedLines[ni])) {
        return "target";
      }
    }

    // Standalone amount line with currency → likely target if large enough
    if (hasCurrency && value >= 1000) return "target";

    return "unknown";
  }

  // ═══════════════════════════════════════════════════════════════════
  // AMOUNT SCORING
  // ═══════════════════════════════════════════════════════════════════

  private scoreAmounts(candidates: AmountCandidate[], totalLines: number) {
    const moneyVals = candidates
      .filter(c => !["quantity", "code", "discount"].includes(c.role))
      .map(c => c.value);
    const maxVal = moneyVals.length > 0 ? Math.max(...moneyVals) : 0;

    for (const c of candidates) {
      let s = 0;
      const r: string[] = [];

      // ── Role base ──
      switch (c.role) {
        case "target":   s += 100; r.push("target_keyword"); break;
        case "item":     s += 20;  r.push("item_line"); break;
        case "unknown":  s += 5;   r.push("unknown_role"); break;
        case "discount": s -= 50;  r.push("discount"); break;
        case "fee":      s -= 20;  r.push("fee"); break;
        case "balance":  s -= 40;  r.push("balance"); break;
        case "quantity": s -= 100; r.push("quantity"); break;
        case "code":     s -= 100; r.push("code_or_id"); break;
      }

      // ── Text-level bonuses ──
      if (/(?:vnd|vnđ|đ|đồng|₫)/i.test(c.raw)) { s += 10; r.push("has_currency"); }
      if (c.lineIndex >= totalLines / 2) { s += 10; r.push("near_bottom"); }
      if (maxVal > 0 && c.value === maxVal && c.role !== "balance") { s += 10; r.push("largest_value"); }

      // ── Visual scoring (only boost target/unknown/item) ──
      if (c.visual) {
        const canBoost = ["target", "unknown", "item"].includes(c.role);

        // Text height relative to median
        if (c.visual.relativeHeight && canBoost) {
          if (c.visual.relativeHeight >= 1.8)      { s += 30; r.push("very_large_text"); }
          else if (c.visual.relativeHeight >= 1.5)  { s += 22; r.push("large_text"); }
          else if (c.visual.relativeHeight >= 1.25) { s += 12; r.push("slightly_large_text"); }
        }
        // Penalize visually prominent but invalid roles
        if (c.visual.isLargeText && !canBoost) { s -= 20; r.push("large_text_invalid_role"); }

        // Position: near bottom of image
        if (c.visual.isNearBottom && canBoost) {
          const pct = c.visual.centerY && c.visual.imageHeight
            ? c.visual.centerY / c.visual.imageHeight
            : 0;
          if (pct >= 0.8) { s += 15; r.push("very_near_bottom_visual"); }
          else if (pct >= 0.6) { s += 10; r.push("near_bottom_visual"); }
        }

        // Right-aligned
        if (c.visual.isRightAligned && canBoost) { s += 10; r.push("right_aligned_amount"); }

        // Bold-like
        if (c.visual.isBoldLike && canBoost) { s += 10; r.push("bold_like"); }
      }

      c.score = s;
      c.reasons = r;
    }
  }

  private selectAmount(candidates: AmountCandidate[]): AmountCandidate | null {
    if (candidates.length === 0) return null;

    // If there's any target, filter to only targets
    const targets = candidates.filter(c => c.role === "target");
    const pool = targets.length > 0
      ? targets
      : candidates.filter(c => !["quantity", "code"].includes(c.role));

    if (pool.length === 0) return null;

    // Sort: score desc, then lineIndex desc (total usually at bottom)
    pool.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.lineIndex - a.lineIndex;
    });

    const best = pool[0];
    // If best score is too low and role is not target, reject
    if (best.score < 40 && best.role !== "target") return null;
    return best;
  }

  // ═══════════════════════════════════════════════════════════════════
  // DATE EXTRACTION
  // ═══════════════════════════════════════════════════════════════════

  private extractDates(lines: string[], foldedLines: string[]): DateCandidate[] {
    const candidates: DateCandidate[] = [];

    // Pattern: optional HH:mm before (with optional ' - ' separator), then date, optional HH:mm after
    // Handles: "15:03 - 28/04/2026", "20:33 10/12/2017", "28/04/2026 15:03"
    const re = /(?:(\d{1,2}):(\d{2})\s*[-–]?\s+)?(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4}))(?:\s+(\d{1,2}):(\d{2}))?/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fLine = foldedLines[i];

      // Skip lines with code/phone keywords
      if (/ma hoa don|ma giao dich|sdt|hotline|mst/.test(fLine)) continue;

      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        let day: number, month: number, year: number;

        if (m[3]) {
          // yyyy-MM-dd format
          year = parseInt(m[3], 10);
          month = parseInt(m[4], 10);
          day = parseInt(m[5], 10);
        } else {
          // dd/MM/yyyy or dd/MM/yy
          day = parseInt(m[6], 10);
          month = parseInt(m[7], 10);
          year = parseInt(m[8], 10);
          if (year < 100) year += 2000;
        }

        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) continue;

        // Time: check before-date or after-date
        const hour = parseInt(m[1] || m[9] || "0", 10);
        const min = parseInt(m[2] || m[10] || "0", 10);
        if (hour > 23 || min > 59) continue;

        const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(min)}:00+07:00`;
        const d = new Date(iso);
        if (isNaN(d.getTime())) continue;

        let score = 50;
        const reasons: string[] = [];

        // Date keyword bonus
        if (/ngay|date|gio vao|gio|thoi gian|ngay giao dich/.test(fLine)) {
          score += 30; reasons.push("date_keyword");
        }
        // Has time component
        if (hour > 0 || min > 0) {
          score += 10; reasons.push("has_time");
        }

        candidates.push({ raw: m[0], value: d, iso, line, lineIndex: i, score, reasons });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  // ═══════════════════════════════════════════════════════════════════
  // TYPE DETECTION
  // ═══════════════════════════════════════════════════════════════════

  private detectType(foldedText: string, selectedLine: string): "income" | "expense" | null {
    const incomeRe = /nhan tien|ghi co|\bcredit\b|\bluong\b|salary|thuc linh|net salary|\bthuong\b|\bbonus\b/;
    const expenseRe = /thanh toan|mua hang|hoa don|ghi no|\bdebit\b|tru tien|\bpaid\b|\bpayment\b|tong cong|tong dich vu|thanh tien|phai thanh toan|\bphi\b/;

    // Check selected amount line first (stronger signal)
    if (selectedLine) {
      if (incomeRe.test(selectedLine)) return "income";
      if (expenseRe.test(selectedLine)) return "expense";
    }

    // Then check full text
    const hasIncome = incomeRe.test(foldedText);
    const hasExpense = expenseRe.test(foldedText);

    if (hasIncome && !hasExpense) return "income";
    if (hasExpense && !hasIncome) return "expense";
    if (hasExpense && hasIncome) {
      // Conflict: prefer selected line, then default expense (more common)
      return "expense";
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CATEGORY DETECTION
  // ═══════════════════════════════════════════════════════════════════

  private detectCategory(foldedText: string, type: "income" | "expense" | null): string | null {
    for (const rule of CATEGORY_RULES) {
      if (rule.keywords.test(foldedText)) return rule.name;
    }

    // Fallback
    if (type === "income") return "Thu khác";
    if (type === "expense") return "Chi khác";
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // MERCHANT DETECTION
  // ═══════════════════════════════════════════════════════════════════

  private detectMerchant(lines: string[], foldedLines: string[]): string | null {
    // Known brands
    const brands: Record<string, string> = {
      shopee: "Shopee", lazada: "Lazada", tiki: "Tiki",
      highlands: "Highlands Coffee", starbucks: "Starbucks",
      grab: "Grab", gojek: "Gojek",
    };
    const fAll = foldedLines.join(" ");
    for (const [key, brand] of Object.entries(brands)) {
      if (fAll.includes(key)) return brand;
    }

    // Skip patterns for merchant detection
    const skip = /^(vietbill|hoa don|ban\s+\d|gio vao|sdt|phone|mst|ma\s|kcn|duong|phuong|quan\s|tinh\s|tp\s|tt\s|\d{1,2}:\d{2}|ket qua|giao dich|chia se|thoi gian|\d{3,})/;

    // Look for uppercase line in first 6 lines
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i].trim();
      const fLine = foldedLines[i];

      if (line.length < 3 || line.length > 60) continue;
      if (skip.test(fLine)) continue;
      // Skip lines that are mostly digits
      if (line.replace(/\D/g, "").length > line.length * 0.5) continue;

      // Uppercase line with letters = likely merchant name
      if (line === line.toUpperCase() && /[A-ZÀ-Ỹ]{2,}/.test(line)) {
        return line;
      }
    }

    // Fallback: first non-skipped line with letters
    for (let i = 0; i < Math.min(lines.length, 4); i++) {
      const line = lines[i].trim();
      const fLine = foldedLines[i];
      if (line.length >= 3 && line.length <= 60 && !skip.test(fLine) && /[a-zA-ZÀ-ỹ]{2,}/.test(line)) {
        return line;
      }
    }

    return null;
  }
}

// ─── Utility ─────────────────────────────────────────────────────────

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
