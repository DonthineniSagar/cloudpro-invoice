/**
 * Process Receipt Lambda — uses AWS Textract AnalyzeExpense to extract
 * structured data (total, date, vendor, tax) from receipt images.
 * Called via GraphQL mutation from the expense form.
 */
import { TextractClient, AnalyzeExpenseCommand } from '@aws-sdk/client-textract';

const textract = new TextractClient({});

type ReceiptPayload = {
  imageBase64: string;
};

type ExtractedField = {
  type: string;
  value: string;
  confidence: number;
};

export const handler = async (event: { arguments: ReceiptPayload }) => {
  const { imageBase64 } = event.arguments;
  const imageBytes = Buffer.from(imageBase64, 'base64');

  const response = await textract.send(new AnalyzeExpenseCommand({
    Document: { Bytes: imageBytes },
  }));

  const fields: ExtractedField[] = [];
  let total = '';
  let date = '';
  let vendor = '';
  let tax = '';

  for (const doc of response.ExpenseDocuments || []) {
    for (const field of doc.SummaryFields || []) {
      const type = field.Type?.Text || '';
      const value = field.ValueDetection?.Text || '';
      const confidence = field.ValueDetection?.Confidence || 0;

      fields.push({ type, value, confidence });

      // Map common Textract expense fields
      if (type === 'TOTAL' || type === 'AMOUNT_PAID') {
        if (!total) total = value;
      } else if (type === 'INVOICE_RECEIPT_DATE' || type === 'ORDER_DATE') {
        if (!date) date = value;
      } else if (type === 'VENDOR_NAME' || type === 'SUPPLIER_NAME') {
        if (!vendor) vendor = value;
      } else if (type === 'TAX') {
        if (!tax) tax = value;
      }
    }
  }

  // Clean up total — remove currency symbols, commas
  const cleanTotal = total.replace(/[^0-9.]/g, '');

  return {
    success: true,
    extracted: { total: cleanTotal, date, vendor, tax: tax.replace(/[^0-9.]/g, '') },
    allFields: fields,
  };
};
