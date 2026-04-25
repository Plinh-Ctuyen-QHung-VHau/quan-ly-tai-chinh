import { Injectable } from "@nestjs/common";

export interface ParsedOcrResult {
  suggestedAmount: number | null;
  suggestedDate: Date | null;
  suggestedType: "income" | "expense";
  merchantName: string | null;
  suggestedCategory: string | null;
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
    "Học tập": ["nhà sách", "bookstore", "sách", "udemy", "coursera"],
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

  parse(
    rawText: string,
    ocrEngine: string,
    ocrLanguage: string,
  ): ParsedOcrResult {
    const normalizedText = rawText.toLowerCase().replace(/\s+/g, " ").trim();
    const lines = normalizedText
      .split("\n")
      .filter((line) => line.trim() !== "");

    const detectedAmounts = this.findAmounts(normalizedText);
    const detectedDates = this.findDates(normalizedText);

    const suggestedAmount = this.determineSuggestedAmount(
      normalizedText,
      detectedAmounts,
    );
    const suggestedDate = detectedDates.length > 0 ? detectedDates[0] : null;
    const merchantName = this.findMerchant(lines);
    const suggestedType = this.findType(normalizedText);
    const suggestedCategory = this.findCategory(normalizedText);

    return {
      suggestedAmount,
      suggestedDate,
      suggestedType,
      merchantName,
      suggestedCategory,
      parsedFieldsJson: {
        rawText,
        normalizedText,
        detectedAmounts,
        detectedDates,
        merchantName,
        suggestedType,
        suggestedCategory,
        ocrEngine,
        ocrLanguage,
      },
    };
  }

  private findAmounts(text: string): number[] {
    const amountRegex =
      /[\d.,]+(?=\s*(?:vnd|d|đồng|total|amount|payment|thành tiền|tổng cộng))/gi;
    const genericAmountRegex = /(?:\d[.,]?){4,}/g;

    let matches = text.match(amountRegex) || [];
    if (matches.length === 0) {
      matches = text.match(genericAmountRegex) || [];
    }

    const amounts = matches
      .map((match) => {
        const cleaned = match.replace(/\./g, "").replace(",", ".");
        return parseFloat(cleaned);
      })
      .filter((num) => !isNaN(num) && num > 100); // Filter out small, likely irrelevant numbers

    return [...new Set(amounts)].sort((a, b) => b - a);
  }

  private determineSuggestedAmount(
    text: string,
    amounts: number[],
  ): number | null {
    const keywords = [
      "tổng cộng",
      "tổng tiền",
      "thanh toán",
      "thành tiền",
      "total",
      "amount",
      "payment",
    ];

    for (const keyword of keywords) {
      const keywordIndex = text.indexOf(keyword);
      if (keywordIndex > -1) {
        return amounts[0] || null;
      }
    }
    return amounts.length > 0 ? amounts[0] : null;
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

  private findMerchant(lines: string[]): string | null {
    const knownMerchants = [
      "grab",
      "winmart",
      "highlands coffee",
      "evn",
      "circle k",
      "gs25",
      "tiki",
      "shopee",
      "lazada",
      "petrolimex",
      "phúc long",
      "starbucks",
    ];
    for (const line of lines) {
      for (const merchant of knownMerchants) {
        if (line.includes(merchant)) {
          return merchant
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        }
      }
    }

    // Fallback: find the first line that contains letters and is not just a date or amount
    for (const line of lines) {
      if (
        /[a-zA-Z]/.test(line) &&
        !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(line.trim())
      ) {
        const cleanedLine = line.replace(/[:*]/g, "").trim();
        if (cleanedLine.length > 2 && cleanedLine.length < 50) {
          return cleanedLine
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        }
      }
    }
    return null;
  }

  private findType(text: string): "income" | "expense" {
    const incomeKeywords = [
      "lương",
      "salary",
      "payroll",
      "thưởng",
      "bonus",
      "thu nhập",
    ];
    if (incomeKeywords.some((kw) => text.includes(kw))) {
      return "income";
    }
    return "expense";
  }

  private findCategory(text: string): string | null {
    for (const category in this.categoryKeywords) {
      const keywords = this.categoryKeywords[category];
      if (keywords.some((kw) => text.includes(kw))) {
        return category;
      }
    }
    return null;
  }
}
