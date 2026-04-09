/**
 * Helper to create in-app notifications from frontend actions.
 * For Lambda-created notifications, write directly to DynamoDB.
 */
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

type NotificationType = 'EXPENSE_CREATED' | 'INVOICE_PAID' | 'INVOICE_OVERDUE' | 'REMINDER_SENT' | 'RECURRING_GENERATED' | 'OCR_COMPLETE' | 'SYSTEM';

export async function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  userId: string,
  link?: string,
) {
  try {
    const client = generateClient<Schema>();
    await client.models.Notification.create({
      type: type as any,
      title,
      message,
      read: false,
      link,
      userId,
    });
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}
