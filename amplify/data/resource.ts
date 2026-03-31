import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { sendInvoiceEmail } from '../functions/send-invoice-email/resource';
import { processReceipt } from '../functions/process-receipt/resource';

const schema = a.schema({
  // Company Profile - stores user's business details
  CompanyProfile: a
    .model({
      companyName: a.string().required(),
      companyEmail: a.string(),
      companyPhone: a.string(),
      companyAddress: a.string(),
      companyCity: a.string(),
      companyState: a.string(),
      companyPostalCode: a.string(),
      companyCountry: a.string().default('New Zealand'),
      gstNumber: a.string(), // NZ GST number
      bankAccount: a.string(), // NZ bank account
      defaultCurrency: a.string().default('NZD'),
      defaultGstRate: a.float().default(15), // NZ GST is 15%
      logoUrl: a.string(),
      // Email preferences
      emailSubjectTemplate: a.string().default('Invoice {invoiceNumber} from {companyName}'),
      emailBodyTemplate: a.string().default('Please find attached invoice {invoiceNumber} for {total}. Payment is due by {dueDate}. Thank you for your business.'),
      emailReplyTo: a.string(),
      emailCcSelf: a.boolean().default(true),
      defaultTemplate: a.string().default('modern'),
      // Reminder settings
      reminderEnabled: a.boolean().default(false),
      reminderDaysBefore: a.string().default('7,3,1'),
      reminderDaysAfter: a.string().default('1,7,14'),
      reminderSubjectTemplate: a.string().default('Reminder: Invoice {invoiceNumber} from {companyName}'),
      reminderBodyTemplate: a.string().default('This is a friendly reminder that invoice {invoiceNumber} for {total} is due on {dueDate}. Please arrange payment at your earliest convenience.'),
      userId: a.string().required(),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization((allow) => allow.owner()),

  User: a
    .model({
      email: a.string().required(),
      firstName: a.string(),
      lastName: a.string(),
      companyProfile: a.hasOne('CompanyProfile', 'userId'),
      invoices: a.hasMany('Invoice', 'userId'),
      clients: a.hasMany('Client', 'userId'),
      expenses: a.hasMany('Expense', 'userId'),
    })
    .authorization((allow) => allow.owner()),

  Client: a
    .model({
      name: a.string().required(),
      email: a.string(),
      phone: a.string(),
      address: a.string(),
      city: a.string(),
      state: a.string(),
      postalCode: a.string(),
      country: a.string().default('New Zealand'),
      notes: a.string(),
      userId: a.string().required(),
      user: a.belongsTo('User', 'userId'),
      invoices: a.hasMany('Invoice', 'clientId'),
    })
    .authorization((allow) => allow.owner()),

  Invoice: a
    .model({
      invoiceNumber: a.string().required(),
      clientName: a.string().required(),
      clientEmail: a.string(),
      clientAddress: a.string(),
      issueDate: a.datetime().required(),
      dueDate: a.datetime(),
      items: a.hasMany('InvoiceItem', 'invoiceId'),
      notes: a.string(),
      paymentTerms: a.string().default('Due within 30 days'),
      subtotal: a.float().required(),
      gstRate: a.float().default(15), // NZ GST rate
      gstAmount: a.float(),
      total: a.float().required(),
      currency: a.string().default('NZD'),
      status: a.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
      pdfUrl: a.string(),
      portalToken: a.string(),
      lastReminderSent: a.datetime(),
      reminderCount: a.integer().default(0),
      // Company details at time of invoice (snapshot)
      companyName: a.string(),
      companyEmail: a.string(),
      companyPhone: a.string(),
      companyAddress: a.string(),
      gstNumber: a.string(),
      bankAccount: a.string(),
      userId: a.string().required(),
      user: a.belongsTo('User', 'userId'),
      clientId: a.string(),
      client: a.belongsTo('Client', 'clientId'),
    })
    .authorization((allow) => [allow.owner(), allow.publicApiKey().to(['read'])]),

  InvoiceItem: a
    .model({
      description: a.string().required(),
      wbs: a.string(), // Work Breakdown Structure / Project code
      quantity: a.float().required(),
      unitPrice: a.float().required(),
      amount: a.float().required(),
      invoiceId: a.string().required(),
      invoice: a.belongsTo('Invoice', 'invoiceId'),
    })
    .authorization((allow) => [allow.owner(), allow.publicApiKey().to(['read'])]),

  Expense: a
    .model({
      description: a.string().required(),
      category: a.string(),
      amount: a.float().required(),
      amountExGst: a.float(), // Amount excluding GST
      gstAmount: a.float(), // GST component
      gstClaimable: a.boolean().default(true), // Can claim GST back
      date: a.datetime().required(),
      receiptUrl: a.string(),
      notes: a.string(),
      status: a.enum(['PENDING', 'APPROVED', 'REJECTED']),
      userId: a.string().required(),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization((allow) => allow.owner()),

  RecurringInvoice: a
    .model({
      clientId: a.string().required(),
      clientName: a.string().required(),
      clientEmail: a.string(),
      frequency: a.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
      nextDate: a.date().required(),
      endDate: a.date(),
      active: a.boolean().default(true),
      lineItems: a.json(), // JSON array of {description, wbs, quantity, unitPrice, amount}
      notes: a.string(),
      paymentTerms: a.string().default('Due within 30 days'),
      currency: a.string().default('NZD'),
      generatedCount: a.integer().default(0),
      lastGeneratedDate: a.date(),
      userId: a.string().required(),
    })
    .authorization((allow) => allow.owner()),

  // Custom mutation for sending invoice emails
  sendInvoiceEmail: a
    .mutation()
    .arguments({
      to: a.string().required(),
      cc: a.string(),
      replyTo: a.string(),
      subject: a.string().required(),
      body: a.string().required(),
      pdfBase64: a.string().required(),
      fileName: a.string().required(),
      fromName: a.string(),
    })
    .returns(a.json())
    .authorization((allow) => allow.authenticated())
    .handler(a.handler.function(sendInvoiceEmail)),

  processReceipt: a
    .mutation()
    .arguments({
      imageBase64: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => allow.authenticated())
    .handler(a.handler.function(processReceipt)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
