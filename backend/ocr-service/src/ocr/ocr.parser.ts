import { Injectable } from "@nestjs/common";

export interface ParsedOcrResult {
  suggestedAmount: number | null;
  suggestedDate: string | null;
  suggestedMerchantName: string | null;
  suggestedType: "income" | "expense";
  suggestedCategory: string | null;
  rawText: string;
}

@Injectable()
export class OcrParser {
  parse(text: string): ParsedOcrResult {
    const rawText = text;
    const suggestedAmount = this.extractAmount(text);
    const suggestedDate = this.extractDate(text);
    const suggestedMerchantName = this.extractMerchant(text);
    const { suggestedType, suggestedCategory } =
      this.suggestCategoryAndType(text);

    return {
      suggestedAmount,
      suggestedDate,
      suggestedMerchantName,
      suggestedType,
      suggestedCategory,
      rawText,
    };
  }

  private extractAmount(text: string): number | null {
    const patterns = [
      /tổng cộng[:\s]*([\d,.]+)[\s]*vnd/i,
      /total[:\s]*([\d,.]+)[\s]*vnd/i,
      /thành tiền[:\s]*([\d,.]+)[\s]*vnd/i,
      /số tiền[:\s]*([\d,.]+)[\s]*vnd/i,
      /([\d,.]+)[\s]*vnd/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amountStr = match[1].replace(/[.,]/g, "");
        const amount = parseInt(amountStr, 10);
        if (!isNaN(amount)) return amount;
      }
    }
    return null;
  }

  private extractDate(text: string): string | null {
    const patterns = [
      /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/, // dd/mm/yyyy or dd-mm-yyyy
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/, // yyyy-mm-dd
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          // Attempt to normalize and validate the date
          const dateStr = match[1].replace(/-/g, "/");
          const parts = dateStr.split("/");
          let isoDate;
          if (parts[0].length === 4) {
            // yyyy/mm/dd
            isoDate = new Date(
              `${parts[0]}-${parts[1]}-${parts[2]}`,
            ).toISOString();
          } else {
            // dd/mm/yyyy
            isoDate = new Date(
              `${parts[2]}-${parts[1]}-${parts[0]}`,
            ).toISOString();
          }
          return isoDate;
        } catch (e) {
          continue;
        }
      }
    }
    return new Date().toISOString(); // Default to now if not found
  }

  private extractMerchant(text: string): string | null {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length > 0) {
      // Often the merchant name is one of the first few lines
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i];
        if (
          !/hoá đơn|bill|receipt|thanh toán/i.test(line) &&
          line.length < 50
        ) {
          return line;
        }
      }
    }
    return null;
  }

  private suggestCategoryAndType(text: string): {
    suggestedType: "income" | "expense";
    suggestedCategory: string | null;
  } {
    const lowerText = text.toLowerCase();

    if (/lương|salary|payroll/.test(lowerText)) {
      return { suggestedType: "income", suggestedCategory: "Lương" };
    }

    const categoryKeywords = {
      Điện: [/evn/, /điện lực/],
      Nước: [/nước sạch/, /cấp nước/],
      "Di chuyển": [/grab/, /taxi/, /be/, /xăng/],
      "Ăn uống": [
        /coffee/,
        /cafe/,
        /highlands/,
        /milk tea/,
        /nhà hàng/,
        /quán ăn/,
      ],
      "Học tập": [/nhà sách/, /bookstore/, /sách/, /udemy/],
      "Mua sắm": [/siêu thị/, /coopmart/, /vinmart/, /lotte/],
    };

    for (const category in categoryKeywords) {
      for (const keyword of categoryKeywords[category]) {
        if (keyword.test(lowerText)) {
          return { suggestedType: "expense", suggestedCategory: category };
        }
      }
    }

    return { suggestedType: "expense", suggestedCategory: null };
  }
}
