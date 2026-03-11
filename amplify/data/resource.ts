import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

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
      status: a.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
      pdfUrl: a.string(),
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
    .authorization((allow) => allow.owner()),

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
    .authorization((allow) => allow.owner()),

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
      status: a.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
      userId: a.string().required(),
      user: a.belongsTo('User', 'userId'),
    })
    .authorization((allow) => allow.owner()),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
