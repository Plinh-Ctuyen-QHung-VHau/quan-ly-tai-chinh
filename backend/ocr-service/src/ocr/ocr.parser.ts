import { Injectable } from "@nestjs/common";

export interface ParsedOcrResult {
  extractedText: string;
  suggestedAmount: number | null;
  suggestedDate: Date | null;
  suggestedType: "income" | "expense" | null;
  suggestedCategoryId: string | null; // This will be null as we only get text
  merchantName: string | null;
  confidenceScore: number | null;
  parsedFieldsJson: Record<string, any>;
}

@Injectable()
export class OcrParser {
  private readonly categoryKeywords = {
    Điện: ["evn", "điện lực"],
    Nước: ["nước sạch", "cấp nước"],
    "Di chuyển": ["grab", "taxi", "be", "xăng", "petrolimex"],
    "Ăn uống": [
      "coffee",
      "cafe",
      "highlands",
      "starbucks",
      "phúc long",
      "trà sữa",
      "nhà hàng",
      "restaurant",
    ],
    "Học tập": [
      "nhà sách",
      "bookstore",
      "sách",
      "udemy",
      "coursera",
      "học phí",
    ],
    "Mua sắm": [
      "winmart",
      "coopmart",
      "siêu thị",
      "circle k",
      "gs25",
      "tiki",
      "shopee",
      "lazada",
    ],
  };

  public parse(
    rawText: string,
    ocrEngine: string,
    ocrLanguage: string,
  ): ParsedOcrResult {
    const normalizedText = rawText.toLowerCase().replace(/\s+/g, " ").trim();
    const normalizedLines = rawText
      .toLowerCase()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const detectedAmounts = this.findAmounts(normalizedText);
    const detectedDates = this.findDates(normalizedText);

    const suggestedAmount = this.determineSuggestedAmount(
      normalizedText,
      detectedAmounts,
    );
    const suggestedDate = detectedDates.length > 0 ? detectedDates[0] : null;
    const suggestedType = this.findType(normalizedText);
    const suggestedCategoryText = this.findCategory(normalizedText); // This is a string
    const merchantName = this.findMerchant(normalizedText, normalizedLines);
    return {
      extractedText: rawText,
      suggestedAmount,
      suggestedDate,
      suggestedType,
      suggestedCategoryId: null, // We don't have the ID here
      merchantName,
      confidenceScore: null, // Confidence score is not determined here
      parsedFieldsJson: {
        rawText,
        normalizedText,
        detectedAmounts,
        detectedDates,
        suggestedType,
        suggestedCategory: suggestedCategoryText, // Store the text version
        merchantName,
        ocrEngine,
        ocrLanguage,
      },
    };
  }

  private findAmounts(text: string): number[] {
    const patterns = [
      // 5,240,464 VND | 5.240.464đ | 100,000 VND
      /\b\d{1,3}(?:[.,]\d{3})+(?:\s*(?:vnd|vnđ|đ|d|đồng))?\b/gi,

      // 5240464 VND | 100000đ
      /\b\d{4,}(?:\s*(?:vnd|vnđ|đ|d|đồng))\b/gi,
    ];

    const matches = patterns.flatMap((regex) =>
      [...text.matchAll(regex)].map((match) => match[0]),
    );

    const amounts = matches
      .map((match) => {
        const cleaned = match.replace(/[^\d]/g, "");
        return Number(cleaned);
      })
      .filter((num) => Number.isFinite(num))
      // lọc số nhỏ, số tài khoản, số tham chiếu quá dài
      .filter((num) => num >= 1000 && num <= 500_000_000);

    return [...new Set(amounts)].sort((a, b) => b - a);
  }
  private determineSuggestedAmount(
    text: string,
    amounts: number[],
  ): number | null {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const amountKeywords = [
      "tổng cộng",
      "tổng tiền",
      "thành tiền",
      "thanh toán",
      "phải trả",
      "số tiền",
      "amount",
      "total",
      "payment",
      "grand total",
    ];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (amountKeywords.some((keyword) => lowerLine.includes(keyword))) {
        const lineAmounts = this.findAmounts(lowerLine);
        if (lineAmounts.length > 0) {
          return Math.max(...lineAmounts);
        }
      }
    }

    return amounts.length > 0 ? Math.max(...amounts) : null;
  }

  private findDates(text: string): Date[] {
    const dateRegex =
      /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})/g;
    const matches = text.match(dateRegex) || [];

    return matches
      .map((match) => {
        try {
          const parts = match.replace(/\//g, "-").split("-");
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
          }
          // DD-MM-YYYY or DD-MM-YY
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          return new Date(`${year}-${parts[1]}-${parts[0]}`);
        } catch (e) {
          return null;
        }
      })
      .filter((date) => date && !isNaN(date.getTime())) as Date[];
  }

  private findType(text: string): "income" | "expense" {
    const incomeKeywords = [
      "nhận tiền",
      "lương",
      "thu nhập",
      "thưởng",
      "tiền vào",
      "cộng tiền",
      "ghi có",
      "from",
      "received",
      "income",
    ];

    const expenseKeywords = [
      "giao dịch thành công",
      "đã thanh toán",
      "thanh toán",
      "chuyển tiền",
      "đến:",
      "hóa đơn",
      "bill",
      "invoice",
      "payment",
      "paid",
    ];

    if (incomeKeywords.some((keyword) => text.includes(keyword))) {
      return "income";
    }

    if (expenseKeywords.some((keyword) => text.includes(keyword))) {
      return "expense";
    }

    return "expense";
  }

  private findCategory(text: string): string | null {
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return category;
      }
    }
    return null;
  }

  private findMerchant(text: string, lines: string[]): string | null {
    // Priority 1: Look for specific merchant keywords
    const merchantKeywords: { [key: string]: string[] } = {
      Grab: ["grab"],
      Be: ["be"],
      Petrolimex: ["petrolimex"],
      "Highlands Coffee": ["highlands coffee"],
      Starbucks: ["starbucks"],
      "Phúc Long": ["phúc long", "phuc long"],
      WinMart: ["winmart", "winmart+"],
      "Co.opmart": ["co.opmart", "coopmart"],
      "Circle K": ["circle k"],
      GS25: ["gs25"],
      Tiki: ["tiki"],
      Shopee: ["shopee"],
      Lazada: ["lazada"],
      EVN: ["evn", "điện lực"],
    };

    for (const [merchant, keywords] of Object.entries(merchantKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return merchant;
      }
    }

    // Priority 2: The first non-empty line is often the merchant name
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // Avoid lines that are just dates, addresses, or generic terms
      if (
        !/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(firstLine) &&
        !/địa chỉ|address/i.test(firstLine) &&
        firstLine.length > 3 &&
        firstLine.length < 50
      ) {
        return firstLine
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    }

    return null;
  }
}
