import { z } from 'zod';

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  clientId: z.string().min(1, 'Please select a client'),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive('Quantity must be greater than 0'),
    unitPrice: z.number().min(0, 'Rate cannot be negative'),
  })).min(1, 'At least one line item is required'),
}).refine(
  (data) => new Date(data.dueDate) >= new Date(data.issueDate),
  { message: 'Due date must be on or after issue date', path: ['dueDate'] }
);

export const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
});

export const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
});

export const companySchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyEmail: z.string().email('Invalid email address').or(z.literal('')).optional(),
  gstNumber: z.string().regex(/^\d{2,3}-?\d{3}-?\d{3}$/, 'Invalid NZ GST number (e.g. 12-345-678)').or(z.literal('')).optional(),
});

export type FormErrors = Record<string, string>;

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: FormErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const errors: FormErrors = {};
  result.error.errors.forEach((e) => {
    const key = e.path.join('.');
    if (!errors[key]) errors[key] = e.message;
  });
  return { success: false, errors };
}
