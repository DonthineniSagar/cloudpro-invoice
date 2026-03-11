import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'cloudproInvoices',
  access: (allow) => ({
    'invoices/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
