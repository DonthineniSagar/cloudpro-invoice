/**
 * Process Expense Email Lambda
 *
 * Triggered by SES inbound email → S3 → this Lambda.
 * Flow: Parse email → check sender whitelist → extract attachments
 *       → Textract (PDF) or Bedrock Vision (images)
 *       → Bedrock Haiku (interpret & structure) → create draft Expense in DynamoDB.
 */
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { TextractClient, AnalyzeExpenseCommand } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import { createHash } from 'crypto';

const s3 = new S3Client({});
const textract = new TextractClient({});
const bedrock = new BedrockRuntimeClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const EXPENSE_TABLE = process.env.EXPENSE_TABLE_NAME!;
const COMPANY_PROFILE_TABLE = process.env.COMPANY_PROFILE_TABLE_NAME!;
const NOTIFICATION_TABLE = process.env.NOTIFICATION_TABLE_NAME || '';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL_ID!;

interface ExtractedExpense {
  vendor: string;
  description: string;
  total: string;
  tax: string;
  date: string;
  category: string;
  confidence: 'high' | 'low';
}

interface IngestConfig {
  owner: string;
  userId: string;
  identityId?: string;
  expenseIngestActive: boolean;
  expenseWhitelistedEmails?: string[];
}

interface SESEvent {
  Records: Array<{
    ses: {
      mail: {
        messageId: string;
        destination: string[];
        source: string;
      };
      receipt: {
        recipients: string[];
      };
    };
  }>;
}

export const handler = async (event: SESEvent) => {
  const record = event.Records[0];
  const { messageId, source: senderEmail } = record.ses.mail;
  // Use receipt.recipients (SES envelope recipient) — mail.destination contains
  // the original To: header which may be a forwarding address like Gmail
  const recipients = record.ses.receipt.recipients || record.ses.mail.destination;
  const recipientEmail = recipients[0]?.toLowerCase();

  // Extract ingest key from recipient email
  const ingestKey = extractIngestKey(recipientEmail);
  if (!ingestKey) {
    console.error('Could not extract ingest key from:', recipientEmail);
    return { status: 'ignored', reason: 'no_ingest_key' };
  }

  // Look up config for this ingest key
  const config = await lookupIngestConfig(ingestKey);
  if (!config) {
    console.error('No ingest config found for key:', ingestKey);
    return { status: 'ignored', reason: 'unknown_key' };
  }

  if (!config.expenseIngestActive) {
    console.log('Ingest disabled for key:', ingestKey);
    return { status: 'ignored', reason: 'inactive' };
  }

  // === WHITELIST CHECK ===
  const sender = senderEmail.toLowerCase().trim();
  if (!isSenderWhitelisted(sender, config.expenseWhitelistedEmails)) {
    console.warn(`Sender ${sender} not whitelisted for ingest key ${ingestKey}. Ignoring.`);
    return { status: 'rejected', reason: 'sender_not_whitelisted', sender };
  }

  // Fetch raw email from S3
  const bucket = process.env.SES_BUCKET_NAME!;
  const key = `inbound-emails/${messageId}`;

  // === DEDUP: Check if this email was already processed ===
  const existingByMessageId = await findExpenseByField(config.owner, 'emailMessageId', messageId);
  if (existingByMessageId) {
    console.log(`Email ${messageId} already processed. Skipping.`);
    return { status: 'skipped', reason: 'duplicate_email' };
  }

  const raw = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const emailBuffer = Buffer.from(await raw.Body!.transformToByteArray());

  const parsed: ParsedMail = await simpleParser(emailBuffer);
  const results: Array<{ expense: ExtractedExpense; contentHash: string; attachmentBytes?: Buffer; filename?: string; contentType?: string }> = [];

  // Process attachments
  for (const att of parsed.attachments || []) {
    const hash = createHash('sha256').update(att.content).digest('hex');

    // Check if this exact file was already processed
    const existingByHash = await findExpenseByField(config.owner, 'contentHash', hash);
    if (existingByHash) {
      console.log(`Attachment hash ${hash.substring(0, 12)} already processed. Skipping.`);
      continue;
    }

    try {
      if (isPdf(att)) {
        const extracted = await processPdfWithTextractAndAI(att.content);
        if (extracted) results.push({ expense: extracted, contentHash: hash, attachmentBytes: att.content, filename: att.filename || 'receipt.pdf', contentType: 'application/pdf' });
      } else if (isImage(att)) {
        const extracted = await processImageWithVision(att.content, att.contentType);
        if (extracted) results.push({ expense: extracted, contentHash: hash, attachmentBytes: att.content, filename: att.filename || 'receipt.jpg', contentType: att.contentType || 'image/jpeg' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Failed to process attachment ${att.filename || 'unknown'} (${att.contentType}): ${msg}. Skipping.`);
    }
  }

  // If no attachments, try email body (text or HTML)
  if (results.length === 0) {
    const bodyText = parsed.text || (parsed.html ? String(parsed.html).replace(/<[^>]*>/g, ' ') : '');
    if (bodyText.trim()) {
      const bodyHash = createHash('sha256').update(bodyText).digest('hex');
      const extracted = await extractFromEmailBody(bodyText, sender);
      if (extracted) results.push({ expense: extracted, contentHash: bodyHash });
    }
  }

  // Create draft expenses with fuzzy duplicate detection
  let created = 0;
  for (const { expense, contentHash, attachmentBytes, filename, contentType } of results) {
    const duplicate = await findFuzzyDuplicate(config.owner, expense);
    await createDraftExpense(expense, config.owner, config.userId, config.identityId || '', sender, messageId, contentHash, duplicate, attachmentBytes, filename, contentType);
    created++;
  }

  console.log(`Processed ${created} expenses from ${sender} for key ${ingestKey}`);
  return { status: 'processed', expenses: created };
};

/**
 * Check if sender is in the whitelist.
 * Supports exact email match and wildcard domain match (*@domain.com).
 * Empty/undefined whitelist = reject all (secure by default).
 */
function isSenderWhitelisted(sender: string, whitelist?: string[]): boolean {
  if (!whitelist || whitelist.length === 0) return false;

  return whitelist.some((entry) => {
    const rule = entry.toLowerCase().trim();
    if (rule.startsWith('*@')) {
      // Domain wildcard: *@spark.co.nz matches anything@spark.co.nz
      const domain = rule.substring(2);
      return sender.endsWith(`@${domain}`);
    }
    return sender === rule;
  });
}

function extractIngestKey(email: string): string | null {
  const plusMatch = email.match(/^expenses\+([a-z0-9]+)@/);
  if (plusMatch) return plusMatch[1];
  const subdomainMatch = email.match(/^([a-z0-9]+)@expenses\./);
  if (subdomainMatch) return subdomainMatch[1];
  return null;
}

async function lookupIngestConfig(ingestKey: string): Promise<IngestConfig | undefined> {
  const result = await ddb.send(new QueryCommand({
    TableName: COMPANY_PROFILE_TABLE,
    IndexName: 'companyProfilesByExpenseIngestKey',
    KeyConditionExpression: 'expenseIngestKey = :key',
    ExpressionAttributeValues: { ':key': ingestKey },
    Limit: 1,
  }));
  return result.Items?.[0] as IngestConfig | undefined;
}

function isPdf(att: Attachment): boolean {
  return att.contentType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf') || false;
}

function isImage(att: Attachment): boolean {
  return att.contentType?.startsWith('image/') || false;
}

async function processPdfWithTextractAndAI(pdfBytes: Buffer): Promise<ExtractedExpense | null> {
  // Use SES bucket for temp PDFs — Lambda already has full access and Textract can read from it
  const bucket = process.env.SES_BUCKET_NAME!;
  const tempKey = `temp-receipts/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.pdf`;

  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: tempKey, Body: pdfBytes, ContentType: 'application/pdf' }));

  try {
    const textractResult = await textract.send(new AnalyzeExpenseCommand({
      Document: { S3Object: { Bucket: bucket, Name: tempKey } },
    }));

    const fields: Array<{ type: string; value: string; confidence: number }> = [];
    for (const doc of textractResult.ExpenseDocuments || []) {
      for (const field of doc.SummaryFields || []) {
        fields.push({
          type: field.Type?.Text || '',
          value: field.ValueDetection?.Text || '',
          confidence: field.ValueDetection?.Confidence || 0,
        });
      }
    }

    return await interpretWithAI(JSON.stringify(fields));
  } finally {
    try { await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: tempKey })); } catch {}
  }
}

async function processImageWithVision(imageBytes: Buffer, contentType?: string): Promise<ExtractedExpense | null> {
  const base64 = imageBytes.toString('base64');

  // Detect actual media type from magic bytes instead of trusting contentType
  let mediaType = contentType || 'image/jpeg';
  if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) mediaType = 'image/png';
  else if (imageBytes[0] === 0xFF && imageBytes[1] === 0xD8) mediaType = 'image/jpeg';
  else if (imageBytes[0] === 0x47 && imageBytes[1] === 0x49) mediaType = 'image/gif';
  else if (imageBytes[0] === 0x52 && imageBytes[1] === 0x49) mediaType = 'image/webp';

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    contentType: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  }));

  return parseAIResponse(Buffer.from(response.body).toString());
}

async function extractFromEmailBody(bodyText: string, senderEmail: string): Promise<ExtractedExpense | null> {
  const prompt = `${EXTRACTION_PROMPT}\n\nSender: ${senderEmail}\n\nEmail body:\n${bodyText.substring(0, 4000)}`;
  return await interpretWithAI(prompt);
}

async function interpretWithAI(ocrOrText: string): Promise<ExtractedExpense | null> {
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    contentType: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nOCR/Source data:\n${ocrOrText.substring(0, 8000)}`,
      }],
    }),
  }));

  return parseAIResponse(Buffer.from(response.body).toString());
}

const EXTRACTION_PROMPT = `You are extracting expense data from an invoice, receipt, or bill.
The OCR may contain errors. Use context clues to correct obvious mistakes.

Return ONLY valid JSON (no markdown, no explanation):
{
  "vendor": "company name",
  "description": "brief description of what this expense is for",
  "total": "123.45",
  "tax": "15.00",
  "date": "2026-01-15",
  "category": "one of: Advertising & Marketing, Communication (Phone & Internet), Depreciation, Entertainment (50% deductible), General & Administrative, Insurance, Interest & Bank Fees, Legal & Accounting, Motor Vehicle, Office Expenses, Rent & Rates, Repairs & Maintenance, Software & Subscriptions, Subcontractors, Travel & Accommodation, Other",
  "confidence": "high or low"
}

IMPORTANT: The date must come from the receipt/invoice itself (invoice date, receipt date, transaction date).
Do NOT guess or infer a date. If no date is clearly visible on the document, return an empty string for date.
Date format must be YYYY-MM-DD. Total should be the final amount including tax. Tax is the GST/tax component only.
If any other field cannot be determined, use empty string.`;

function parseAIResponse(responseBody: string): ExtractedExpense | null {
  try {
    const parsed = JSON.parse(responseBody);
    const text = parsed.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as ExtractedExpense;
  } catch {
    console.error('Failed to parse AI response');
    return null;
  }
}

async function createDraftExpense(
  expense: ExtractedExpense, owner: string, userId: string, identityId: string | undefined, senderEmail: string,
  emailMessageId: string, contentHash: string, duplicateOf: string | null,
  attachmentBytes?: Buffer, filename?: string, contentType?: string
) {
  const total = parseFloat(expense.total) || 0;
  const tax = parseFloat(expense.tax) || 0;
  const now = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const isDuplicate = !!duplicateOf;

  // Upload receipt to S3 using Cognito identity ID path (matches app's S3 scoping)
  let receiptUrl: string | undefined;
  if (attachmentBytes && filename && identityId) {
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const s3Key = `receipts/${identityId}/${safeFilename}`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET_NAME!,
      Key: s3Key,
      Body: attachmentBytes,
      ContentType: contentType || 'application/octet-stream',
    }));
    receiptUrl = s3Key;
  }

  await ddb.send(new PutCommand({
    TableName: EXPENSE_TABLE,
    Item: {
      id,
      __typename: 'Expense',
      description: expense.vendor ? `${expense.vendor} - ${expense.description}` : expense.description,
      category: expense.category || 'Other',
      amount: total,
      amountExGst: total - tax,
      gstAmount: tax,
      gstClaimable: true,
      ...(expense.date ? { date: new Date(expense.date).toISOString() } : {}),
      ...(receiptUrl ? { receiptUrl } : {}),
      notes: `Auto-created from email (${senderEmail}). Confidence: ${expense.confidence}${!expense.date ? '. Date not found on receipt — please review.' : ''}${isDuplicate ? '. ⚠️ Possible duplicate detected.' : ''}`,
      status: 'PENDING',
      source: 'email',
      sourceConfidence: expense.confidence,
      emailMessageId,
      contentHash,
      suspectedDuplicate: isDuplicate,
      ...(duplicateOf ? { duplicateOf } : {}),
      userId,
      owner,
      createdAt: now,
      updatedAt: now,
    },
  }));

  // Create in-app notification
  if (NOTIFICATION_TABLE) {
    try {
      const desc = expense.vendor ? `${expense.vendor} - $${total.toFixed(2)}` : `$${total.toFixed(2)} expense`;
      await ddb.send(new PutCommand({
        TableName: NOTIFICATION_TABLE,
        Item: {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          __typename: 'Notification',
          type: 'EXPENSE_CREATED',
          title: 'Expense auto-created from email',
          message: `${desc} (${expense.confidence} confidence)`,
          read: false,
          link: `/expenses/${id}/edit`,
          userId,
          owner,
          createdAt: now,
          updatedAt: now,
        },
      }));
    } catch {}
  }
}

/** Find an existing expense by a specific field value for this owner */
async function findExpenseByField(owner: string, field: string, value: string): Promise<string | null> {
  const result = await ddb.send(new ScanCommand({
    TableName: EXPENSE_TABLE,
    FilterExpression: '#owner = :owner AND #field = :value',
    ExpressionAttributeNames: { '#owner': 'owner', '#field': field },
    ExpressionAttributeValues: { ':owner': owner, ':value': value },
    Limit: 1,
    ProjectionExpression: 'id',
  }));
  return result.Items?.[0]?.id || null;
}

/** Fuzzy match: same amount + similar vendor within ±5 days */
async function findFuzzyDuplicate(owner: string, expense: ExtractedExpense): Promise<string | null> {
  const total = parseFloat(expense.total) || 0;
  if (!total) return null;

  const result = await ddb.send(new ScanCommand({
    TableName: EXPENSE_TABLE,
    FilterExpression: '#owner = :owner AND #amount = :amount',
    ExpressionAttributeNames: { '#owner': 'owner', '#amount': 'amount', '#date': 'date' },
    ExpressionAttributeValues: { ':owner': owner, ':amount': total },
    ProjectionExpression: 'id, description, #amount, #date',
    Limit: 10,
  }));

  if (!result.Items?.length) return null;

  // Check for vendor name similarity + date proximity
  const expenseDate = expense.date ? new Date(expense.date).getTime() : 0;
  const vendor = (expense.vendor || '').toLowerCase();

  for (const item of result.Items) {
    const desc = (item.description || '').toLowerCase();
    const vendorMatch = vendor && desc.includes(vendor.substring(0, Math.min(vendor.length, 8)));

    if (expenseDate && item.date) {
      const daysDiff = Math.abs(new Date(item.date).getTime() - expenseDate) / (1000 * 60 * 60 * 24);
      // Only flag as duplicate if same day + same vendor — recurring daily expenses (e.g. parking) are legitimate
      if (daysDiff < 1 && vendorMatch) return item.id;
    } else if (vendorMatch) {
      return item.id; // Same amount + same vendor, no dates to compare
    }
  }

  return null;
}
