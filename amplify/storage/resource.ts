import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'cloudproInvoices',
  access: (allow) => ({
    'invoices/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'receipts/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
