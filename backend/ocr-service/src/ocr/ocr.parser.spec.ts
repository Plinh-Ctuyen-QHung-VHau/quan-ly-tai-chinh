import { OcrParser } from './ocr.parser';

describe('OcrParser', () => {
  let parser: OcrParser;

  beforeEach(() => {
    parser = new OcrParser();
  });

  const parse = (text: string) => parser.parse(text, { confidence: 90 }, 'tesseract', 'vie');

  it('1. Bank transaction debit', () => {
    const text = `
      Ngan hang Vietcombank
      Tai khoan trich no: 0123456789
      So tien: -500,000 VND
      Giao dich thanh cong
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('bank_transaction');
    expect(res.suggested_amount).toBe(500000);
    expect(res.suggested_type).toBe('expense');
  });

  it('2. Bank transaction credit', () => {
    const text = `
      Ngan hang TPBank
      Tai khoan ghi co: 987654321
      So tien nhan: +2,000,000 VND
      Ngay 15/10/2023
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('bank_transaction');
    expect(res.suggested_amount).toBe(2000000);
    expect(res.suggested_type).toBe('income');
    expect(res.suggested_date).toEqual(new Date('2023-10-15T00:00:00.000Z'));
  });

  it('3. Bank text có số dư lớn hơn transaction amount', () => {
    const text = `
      So du tai khoan: 50,000,000 VND
      Giao dich chuyen tien: 150,000 VND
      So du moi: 49,850,000 VND
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('bank_transaction');
    expect(res.suggested_amount).toBe(150000); // Should pick the transaction amount, ignore balances
  });

  it('4. Bill điện có chỉ số điện và số tiền phải thanh toán', () => {
    const text = `
      Hoa don tien dien
      Chi so cu: 1000
      Chi so moi: 1200
      Tieu thu: 200 kWh
      Tong thanh toan: 550,000 VND
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('bill');
    expect(res.suggested_amount).toBe(550000);
    expect(res.suggested_type).toBe('expense');
  });

  it('5. Bill internet có hạn thanh toán', () => {
    const text = `
      Hoa don Internet VNPT
      Ky cuoc Thang 9
      Tong tien: 220,000 d
      Han thanh toan: 20/09/2023
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('bill');
    expect(res.suggested_amount).toBe(220000);
    expect(res.suggested_date).toEqual(new Date('2023-09-20T00:00:00.000Z'));
  });

  it('6. Ecommerce có subtotal, phí ship, voucher, final total', () => {
    const text = `
      Don hang Shopee
      Tam tinh: 300,000
      Phi van chuyen: 30,000
      Voucher giam gia: -50,000
      Tong thanh toan: 280,000 d
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('ecommerce_order');
    expect(res.suggested_amount).toBe(280000);
  });

  it('7. Payslip có gross, deduction, net salary', () => {
    const text = `
      Phieu luong Thang 10
      Tong thu nhap (Gross): 20,000,000
      Tru BHXH, thue: -2,000,000
      Thuc linh (Net salary): 18,000,000 VND
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('payslip');
    expect(res.suggested_amount).toBe(18000000);
    expect(res.suggested_type).toBe('income');
  });

  it('8. Receipt có subtotal, VAT, final total', () => {
    const text = `
      Highlands Coffee
      Hoa don ban le
      Tam tinh: 100,000
      VAT 8%: 8,000
      Tong cong: 108,000
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('receipt');
    expect(res.suggested_amount).toBe(108000);
    expect(res.suggested_type).toBe('expense');
  });

  it('9. Receipt có tiền khách đưa và tiền thối', () => {
    const text = `
      Circle K
      Thanh tien: 45,000
      Tien khach dua: 100,000
      Tien thua: 55,000
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('receipt');
    expect(res.suggested_amount).toBe(45000); // Should pick 'Thanh tien', not cash or change
  });

  it('10. Generic text có nhiều số nhưng không đủ confidence thì không chọn bừa', () => {
    const text = `
      Bao cao hoat dong
      Ngay 12: 15 nguoi
      Ngay 13: 20 nguoi
      Tong so luong: 35
    `;
    const res = parse(text);
    expect(res.parsed_fields_json.document_type).toBe('generic_financial_text');
    expect(res.suggested_amount).toBeNull();
  });
});
