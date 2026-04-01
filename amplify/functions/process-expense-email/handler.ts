/**
 * Process Expense Email Lambda
 *
 * Triggered by SES inbound email → S3 → this Lambda.
 * Flow: Parse email → check sender whitelist → extract attachments
 *       → Textract (PDF) or Bedrock Vision (images)
 *       → Bedrock Haiku (interpret & structure) → create draft Expense in DynamoDB.
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { TextractClient, AnalyzeExpenseCommand } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';

const s3 = new S3Client({});
const textract = new TextractClient({});
const bedrock = new BedrockRuntimeClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const EXPENSE_TABLE = process.env.EXPENSE_TABLE_NAME!;
const COMPANY_PROFILE_TABLE = process.env.COMPANY_PROFILE_TABLE_NAME!;
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
    };
  }>;
}

export const handler = async (event: SESEvent) => {
  const record = event.Records[0];
  const { messageId, destination, source: senderEmail } = record.ses.mail;
  const recipientEmail = destination[0]?.toLowerCase();

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
  const raw = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const emailBuffer = Buffer.from(await raw.Body!.transformToByteArray());

  const parsed: ParsedMail = await simpleParser(emailBuffer);
  const results: ExtractedExpense[] = [];

  // Process attachments
  for (const att of parsed.attachments || []) {
    if (isPdf(att)) {
      const extracted = await processPdfWithTextractAndAI(att.content);
      if (extracted) results.push(extracted);
    } else if (isImage(att)) {
      const extracted = await processImageWithVision(att.content);
      if (extracted) results.push(extracted);
    }
  }

  // If no attachments, try email body
  if (results.length === 0 && parsed.text) {
    const extracted = await extractFromEmailBody(parsed.text, sender);
    if (extracted) results.push(extracted);
  }

  // Create draft expenses
  for (const expense of results) {
    await createDraftExpense(expense, config.owner, config.userId, sender);
  }

  console.log(`Processed ${results.length} expenses from ${sender} for key ${ingestKey}`);
  return { status: 'processed', expenses: results.length };
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
    IndexName: 'byExpenseIngestKey',
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
  const textractResult = await textract.send(new AnalyzeExpenseCommand({
    Document: { Bytes: pdfBytes },
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
}

async function processImageWithVision(imageBytes: Buffer): Promise<ExtractedExpense | null> {
  const base64 = imageBytes.toString('base64');

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    contentType: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
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

async function createDraftExpense(expense: ExtractedExpense, owner: string, userId: string, senderEmail: string) {
  const total = parseFloat(expense.total) || 0;
  const tax = parseFloat(expense.tax) || 0;
  const now = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

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
      date: expense.date || '',
      notes: `Auto-created from email (${senderEmail}). Confidence: ${expense.confidence}${!expense.date ? '. Date not found on receipt — please review.' : ''}`,
      status: 'PENDING',
      source: 'email',
      sourceConfidence: expense.confidence,
      userId,
      owner,
      createdAt: now,
      updatedAt: now,
    },
  }));
}
