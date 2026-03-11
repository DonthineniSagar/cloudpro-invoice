import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a
    .model({
      email: a.string().required(),
      firstName: a.string(),
      lastName: a.string(),
      companyName: a.string(),
      subscriptionStatus: a.enum(['TRIAL', 'ACTIVE', 'CANCELLED', 'EXPIRED']),
      subscriptionTier: a.enum(['FREE', 'PRO', 'BUSINESS']),
      trialEndDate: a.datetime(),
      invoices: a.hasMany('Invoice', 'userId'),
      clients: a.hasMany('Client', 'userId'),
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
      country: a.string(),
      notes: a.string(),
      userId: a.string(),
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
      terms: a.string(),
      subtotal: a.float().required(),
      taxRate: a.float(),
      taxAmount: a.float(),
      total: a.float().required(),
      status: a.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
      pdfUrl: a.string(),
      userId: a.string(),
      user: a.belongsTo('User', 'userId'),
      clientId: a.string(),
      client: a.belongsTo('Client', 'clientId'),
    })
    .authorization((allow) => allow.owner()),

  InvoiceItem: a
    .model({
      description: a.string().required(),
      quantity: a.float().required(),
      unitPrice: a.float().required(),
      amount: a.float().required(),
      invoiceId: a.string(),
      invoice: a.belongsTo('Invoice', 'invoiceId'),
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
