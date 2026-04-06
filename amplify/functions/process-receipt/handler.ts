/**
 * Process Receipt Lambda — uses AWS Textract AnalyzeExpense to extract
 * structured data (total, date, vendor, tax) from receipt images and PDFs.
 * For PDFs: uploads to S3 temp bucket, uses S3Object reference.
 * For images: uses inline Bytes.
 */
import { TextractClient, AnalyzeExpenseCommand } from '@aws-sdk/client-textract';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const textract = new TextractClient({});
const s3 = new S3Client({});

const BUCKET = process.env.STORAGE_BUCKET_NAME || '';

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

  // Detect if PDF by checking magic bytes (%PDF)
  const isPdf = imageBytes[0] === 0x25 && imageBytes[1] === 0x50 && imageBytes[2] === 0x44 && imageBytes[3] === 0x46;

  let document: any;
  let s3Key = '';

  if (isPdf && BUCKET) {
    // PDF: upload to S3 temporarily, reference via S3Object
    s3Key = `temp-receipts/${Date.now()}.pdf`;
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, Body: imageBytes, ContentType: 'application/pdf' }));
    document = { S3Object: { Bucket: BUCKET, Name: s3Key } };
  } else {
    document = { Bytes: imageBytes };
  }

  try {
    const response = await textract.send(new AnalyzeExpenseCommand({ Document: document }));

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

        if ((type === 'TOTAL' || type === 'AMOUNT_PAID') && !total) total = value;
        else if ((type === 'INVOICE_RECEIPT_DATE' || type === 'ORDER_DATE') && !date) date = value;
        else if ((type === 'VENDOR_NAME' || type === 'SUPPLIER_NAME') && !vendor) vendor = value;
        else if (type === 'TAX' && !tax) tax = value;
      }
    }

    return {
      success: true,
      extracted: { total: total.replace(/[^0-9.]/g, ''), date, vendor, tax: tax.replace(/[^0-9.]/g, '') },
      allFields: fields,
    };
  } finally {
    // Clean up temp S3 file
    if (s3Key && BUCKET) {
      try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key })); } catch {}
    }
  }
};
