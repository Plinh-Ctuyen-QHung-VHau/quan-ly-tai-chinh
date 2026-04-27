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
    const suggestedType = this.findType(normalizedText);
    const suggestedCategoryText = this.findCategory(normalizedText); // This is a string
    const merchantName = this.findMerchant(normalizedText, lines);

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
    if (amounts.length === 0) return null;

    const totalKeywords = ["total", "thành tiền", "tổng cộng", "payment"];
    const textLines = text.split("\n");

    for (const line of textLines) {
      const lowerLine = line.toLowerCase();
      if (totalKeywords.some((keyword) => lowerLine.includes(keyword))) {
        const lineAmounts = this.findAmounts(lowerLine);
        if (lineAmounts.length > 0) {
          return Math.max(...lineAmounts);
        }
      }
    }

    // If no total keyword found, return the largest amount found
    return Math.max(...amounts);
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

  private findType(text: string): "income" | "expense" | null {
    if (
      text.includes("hóa đơn") ||
      text.includes("bill") ||
      text.includes("invoice")
    ) {
      return "expense";
    }
    // Default to expense for receipts, can be refined
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
