import { Injectable } from "@nestjs/common";

export type DocumentType = 'bank_transaction' | 'bank_statement' | 'bill' | 'ecommerce_order' | 'payslip' | 'receipt' | 'generic_financial_text';

export type AmountRole = 'transaction_amount' | 'debit_amount' | 'credit_amount' | 'final_total' | 'amount_due' | 'amount_paid' | 'subtotal' | 'item_price' | 'shipping_fee' | 'tax' | 'service_fee' | 'discount' | 'voucher' | 'refund' | 'cashback' | 'gross_salary' | 'net_salary' | 'deduction' | 'allowance' | 'balance' | 'previous_balance' | 'new_balance' | 'quantity' | 'phone_or_code' | 'unknown';

export interface AmountCandidate {
  raw: string;
  value: number;
  absValue: number;
  line: string;
  lineIndex: number;
  positionInLine: number;
  isNegative: boolean;
  hasCurrency: boolean;
  currency: string | null;
  nearbyKeywords: string[];
  role: AmountRole;
  confidence: number;
  reasons: string[];
}

export interface DateCandidate {
  raw: string;
  parsed: Date;
  line: string;
  lineIndex: number;
  role: 'invoice_date' | 'due_date' | 'transaction_date' | 'pay_period' | 'unknown';
  confidence: number;
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

@Injectable()
export class OcrParser {
  
  public parse(
    rawText: string,
    ocrData: any,
    ocrEngine: string,
    ocrLanguage: string,
  ): ParsedOcrResult {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const normalizedLines = lines.map(l => this.normalizeText(l));
    const foldedLines = lines.map(l => this.foldText(l));

    const normalizedText = normalizedLines.join(" ");
    const foldedText = foldedLines.join(" ");

    const docTypeScores = this.classifyDocumentType(foldedText, foldedLines);
    const docType = this.getBestDocumentType(docTypeScores);

    let amountCandidates = this.extractAmountCandidates(lines, foldedLines);
    amountCandidates = this.classifyCandidateRoles(amountCandidates, docType);
    this.scoreAmountCandidates(amountCandidates, docType);

    const dateCandidates = this.extractDateCandidates(lines, foldedLines, docType);
    
    const suggested_amount_candidate = this.selectSuggestedAmount(amountCandidates, docType);
    const suggested_date_candidate = this.selectSuggestedDate(dateCandidates, docType);

    let suggested_type: "income" | "expense" | null = null;
    if (docType === 'bank_transaction' || docType === 'bank_statement') {
      if (suggested_amount_candidate) {
        if (suggested_amount_candidate.isNegative || suggested_amount_candidate.role === 'debit_amount') {
          suggested_type = 'expense';
        } else if (suggested_amount_candidate.role === 'credit_amount') {
          suggested_type = 'income';
        } else if (foldedText.match(/(ghi no|chuyen tien|thanh toan|tru tien)/)) {
          suggested_type = 'expense';
        } else if (foldedText.match(/(ghi co|nhan tien|chuyen den)/)) {
          suggested_type = 'income';
        }
      }
    } else if (docType === 'payslip') {
      suggested_type = 'income';
    } else if (['bill', 'ecommerce_order', 'receipt'].includes(docType)) {
      suggested_type = 'expense';
    }

    const { merchant_name, confidence: merchantConfidence } = this.findMerchant(lines, foldedLines, docType);

    let baseConfidence = ocrData?.confidence ?? 0;
    let finalScore = (baseConfidence * 0.3) + 
      (docType !== 'generic_financial_text' ? 10 : 0) + 
      ((suggested_amount_candidate?.confidence ?? 0) * 0.4) + 
      ((suggested_date_candidate?.confidence ?? 0) * 0.2) + 
      (merchantConfidence * 0.1);

    if (rawText.trim().length < 20) finalScore -= 20;
    if (!suggested_amount_candidate) finalScore -= 30;
    
    finalScore = Math.max(0, Math.min(100, finalScore));

    return {
      extracted_text: rawText,
      suggested_amount: suggested_amount_candidate?.absValue ?? null,
      suggested_date: suggested_date_candidate?.parsed ?? null,
      suggested_type,
      suggested_category_id: null,
      merchant_name,
      confidence_score: Math.round(finalScore * 100) / 100,
      parsed_fields_json: {
        ocr_engine: ocrEngine,
        document_type: docType,
        document_type_scores: docTypeScores,
        raw_text: rawText,
        normalized_text: normalizedText,
        folded_text: foldedText,
        amount_candidates: amountCandidates,
        date_candidates: dateCandidates,
        selected_amount: suggested_amount_candidate,
        selected_date: suggested_date_candidate,
        warnings: suggested_amount_candidate ? [] : ["No suitable amount found"],
      },
    };
  }

  private normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ');
  }

  private foldText(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d");
  }

  private classifyDocumentType(foldedText: string, foldedLines: string[]): Record<DocumentType, number> {
    const scores: Record<DocumentType, number> = {
      bank_transaction: 0, bank_statement: 0, bill: 0, ecommerce_order: 0, payslip: 0, receipt: 0, generic_financial_text: 0
    };

    if (foldedText.match(/(chuyen khoan|giao dich|so du|tai khoan|vietcombank|techcombank|tpbank|mbbank|momo)/)) scores.bank_transaction += 50;
    if (foldedText.match(/(sao ke|lich su giao dich)/)) scores.bank_statement += 60;
    if (foldedText.match(/(hoa don tien dien|tien nuoc|tien internet|thanh toan hoa don|ky cuoc)/)) scores.bill += 50;
    if (foldedText.match(/(shopee|lazada|tiki|tq|don hang|phi van chuyen|voucher|giam gia)/)) scores.ecommerce_order += 50;
    if (foldedText.match(/(phieu luong|bang luong|thu nhap|thuc linh|tru|luong co ban|bhxh)/)) scores.payslip += 60;
    if (foldedText.match(/(tong cong|thanh tien|tien khach|tien thua|cash|phat hanh|hoa don ban|receipt)/)) scores.receipt += 40;

    return scores;
  }

  private getBestDocumentType(scores: Record<DocumentType, number>): DocumentType {
    let bestDoc: DocumentType = 'generic_financial_text';
    let max = 0;
    for (const [doc, score] of Object.entries(scores)) {
      if (score > max) { max = score; bestDoc = doc as DocumentType; }
    }
    return max >= 40 ? bestDoc : 'generic_financial_text';
  }

  private extractAmountCandidates(lines: string[], foldedLines: string[]): AmountCandidate[] {
    const candidates: AmountCandidate[] = [];
    const regex = /(?:^|\s|-|\+|~|₫|đ|vnd|vnđ)(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)(?:\s*(?:vnd|vnđ|đ|d|đồng))?(?=$|\s)/gi;

    lines.forEach((line, lineIndex) => {
      // Local fix for common OCR errors, do not replace globally if it's clearly text
      const fixedLine = line.replace(/\b([OlI1-9]{1,3}(?:\.[OlI0-9]{3})+)\b/g, m => m.replace(/O|o/g, "0").replace(/l|I/g, "1"));
      
      let match;
      while ((match = regex.exec(fixedLine)) !== null) {
        const rawNum = match[1];
        if (!rawNum) continue;
        
        let normalizedNum = rawNum.replace(/\s/g, '');
        if (normalizedNum.match(/,\d{2}$/)) normalizedNum = normalizedNum.replace(/\./g, '').replace(',', '.');
        else if (normalizedNum.match(/\.\d{2}$/) && normalizedNum.includes(',')) normalizedNum = normalizedNum.replace(/,/g, '');
        else normalizedNum = normalizedNum.replace(/[.,]/g, '');
        
        const value = parseFloat(normalizedNum);
        if (isNaN(value)) continue;

        const isNegative = match[0].includes('-') || foldedLines[lineIndex].includes('tru ') || foldedLines[lineIndex].match(/\b(-\s*\d+|\(\d+\))/);
        const hasCurrency = match[0].toLowerCase().match(/đ|d|vnd|vnđ|đồng|₫/) !== null;

        // Skip phone numbers and IDs
        if (value >= 10000000 && !hasCurrency && line.match(/(sdt|mst|id|ma|code|hotline|phone)/i)) {
          continue;
        }
        if (rawNum.replace(/[.,\s]/g, '').length >= 9 && rawNum.startsWith('0')) {
          continue; // phone number
        }

        candidates.push({
          raw: match[0].trim(),
          value: isNegative ? -value : value,
          absValue: value,
          line: line,
          lineIndex,
          positionInLine: match.index,
          isNegative: !!isNegative,
          hasCurrency,
          currency: hasCurrency ? "VND" : null,
          nearbyKeywords: [],
          role: 'unknown',
          confidence: 0,
          reasons: []
        });
      }
    });
    return candidates;
  }

  private classifyCandidateRoles(candidates: AmountCandidate[], docType: DocumentType): AmountCandidate[] {
    return candidates.map(c => {
      let role: AmountRole = 'unknown';
      const fLine = this.foldText(c.line);
      c.nearbyKeywords.push(fLine);
      
      if (fLine.match(/(so du|balance)/)) role = fLine.match(/cu|truoc/) ? 'previous_balance' : fLine.match(/moi/) ? 'new_balance' : 'balance';
      else if (fLine.match(/(thuc linh|net salary|net pay)/)) role = 'net_salary';
      else if (fLine.match(/(tong thu nhap|gross)/)) role = 'gross_salary';
      else if (fLine.match(/(khau tru|giam tru|thue|tax|bhxh)/)) role = 'deduction';
      else if (fLine.match(/(phi van chuyen|shipping)/)) role = 'shipping_fee';
      else if (fLine.match(/(khuyen mai|giam gia|voucher|discount)/)) role = 'discount';
      else if (fLine.match(/(hoan tien|cashback)/)) role = 'cashback';
      else if (fLine.match(/(tong thanh toan|phai thanh toan|thanh tien|tong cong|total|amount paid)/)) role = 'final_total';
      else if (fLine.match(/(tam tinh|subtotal|cong tien hang)/)) role = 'subtotal';
      else if (fLine.match(/(tien khach dua|cash)/)) role = 'amount_paid';
      else if (fLine.match(/(ghi no|debit)/)) role = 'debit_amount';
      else if (fLine.match(/(ghi co|credit)/)) role = 'credit_amount';
      else if (fLine.match(/(giao dich|so tien|amount)/)) role = 'transaction_amount';
      
      // If role is unknown, maybe check previous line
      if (role === 'unknown' && c.absValue < 1000 && !c.hasCurrency) role = 'quantity';
      if (role === 'unknown' && c.isNegative) role = 'deduction';
      
      c.role = role;
      return c;
    });
  }

  private scoreAmountCandidates(candidates: AmountCandidate[], docType: DocumentType) {
    candidates.forEach(c => {
      let score = 50;
      if (c.hasCurrency) score += 20;
      if (c.absValue < 1000) { score -= 40; c.reasons.push("Small value (maybe quantity)"); }
      
      if (docType === 'bank_transaction') {
        if (['transaction_amount', 'debit_amount', 'credit_amount'].includes(c.role)) { score += 40; c.reasons.push(`Priority role for bank: ${c.role}`); }
        if (['balance', 'new_balance', 'previous_balance'].includes(c.role)) { score -= 80; c.reasons.push("Ignore balances"); }
      } else if (docType === 'bill') {
        if (['final_total', 'amount_due', 'amount_paid'].includes(c.role)) { score += 40; c.reasons.push("Priority role for bill"); }
        if (c.role === 'previous_balance') { score -= 50; c.reasons.push("Ignore previous debt"); }
      } else if (docType === 'ecommerce_order') {
        if (c.role === 'final_total') { score += 50; c.reasons.push("Priority role for e-commerce"); }
        if (['shipping_fee', 'discount', 'voucher', 'subtotal', 'cashback'].includes(c.role)) { score -= 60; c.reasons.push("Ignore breakdown roles"); }
      } else if (docType === 'payslip') {
        if (c.role === 'net_salary') { score += 50; c.reasons.push("Priority role for payslip"); }
        if (['gross_salary', 'deduction'].includes(c.role)) { score -= 40; c.reasons.push("Ignore breakdown roles"); }
      } else if (docType === 'receipt') {
        if (['final_total', 'amount_paid'].includes(c.role)) { score += 40; c.reasons.push("Priority role for receipt"); }
        if (['item_price', 'quantity', 'tax', 'subtotal'].includes(c.role)) { score -= 40; c.reasons.push("Ignore breakdown roles"); }
      }
      
      c.confidence = Math.min(100, Math.max(0, score));
    });
  }

  private selectSuggestedAmount(candidates: AmountCandidate[], docType: DocumentType): AmountCandidate | null {
    if (candidates.length === 0) return null;
    
    // Sort by confidence, then by line index (ecommerce final total is usually at bottom)
    candidates.sort((a, b) => {
      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      if (docType === 'ecommerce_order') return b.lineIndex - a.lineIndex;
      return a.lineIndex - b.lineIndex;
    });

    const best = candidates[0];
    if (docType === 'generic_financial_text' && best.confidence < 60) return null;
    return best;
  }

  private extractDateCandidates(lines: string[], foldedLines: string[], docType: DocumentType): DateCandidate[] {
    const candidates: DateCandidate[] = [];
    const dateRegex = /\b(?:ngay\s*)?(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/gi;

    lines.forEach((line, lineIndex) => {
      let match;
      const fLine = foldedLines[lineIndex];
      const fixedLine = line.replace(/O/g, "0").replace(/o/g, "0").replace(/l/g, "1");

      while ((match = dateRegex.exec(fixedLine)) !== null) {
        let d = parseInt(match[1]);
        let m = parseInt(match[2]);
        let y = match[3] ? parseInt(match[3]) : new Date().getFullYear();
        if (y < 100) y += 2000;
        
        if (d > 31 && m <= 12) { const t = d; d = m; m = t; }
        if (m > 12 || d > 31 || m < 1 || d < 1) continue;

        const parsed = new Date(Date.UTC(y, m - 1, d));
        let role: DateCandidate['role'] = 'unknown';
        let confidence = 70;

        if (fLine.match(/han thanh toan|due/)) role = 'due_date';
        else if (fLine.match(/giao dich|chuyen tien/)) role = 'transaction_date';
        else if (fLine.match(/hoa don|xuat/)) role = 'invoice_date';
        else if (fLine.match(/ky luong|thang/)) role = 'pay_period';

        if (docType === 'bill' && role === 'invoice_date') confidence -= 20;
        if (docType === 'bank_transaction' && role === 'transaction_date') confidence += 20;
        if (docType === 'payslip' && role === 'pay_period') confidence += 20;

        candidates.push({
          raw: match[0],
          parsed,
          line,
          lineIndex,
          role,
          confidence
        });
      }
    });

    return candidates;
  }

  private selectSuggestedDate(candidates: DateCandidate[], docType: DocumentType): DateCandidate | null {
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates[0];
  }

  private findMerchant(lines: string[], foldedLines: string[], docType: DocumentType): { merchant_name: string | null; confidence: number } {
    const brands = [
      "winmart", "circle k", "gs25", "coopmart", "bach hoa xanh", "starbucks", "highlands", "shopee", "lazada", "tiki",
      "grab", "be", "gojek", "evn", "fpt", "viettel", "vnpt", "vietcombank", "techcombank", "tpbank", "mbbank"
    ];
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const fLine = foldedLines[i];
      for (const brand of brands) {
        if (fLine.includes(brand)) {
          return { merchant_name: lines[i].trim(), confidence: 80 };
        }
      }
    }

    if (['bill', 'receipt'].includes(docType) && lines.length > 0) {
      const firstLines = lines.slice(0, 3).filter(l => !l.match(/mst|sdt|dia chi|hoa don/i));
      if (firstLines.length > 0) {
        return { merchant_name: firstLines[0], confidence: 40 };
      }
    }

    return { merchant_name: null, confidence: 0 };
  }
}
