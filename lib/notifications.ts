import nodemailer from 'nodemailer';
import { connectToDatabase } from './mongodb';

interface NotificationOptions {
  userId: string;
  subject: string;
  message: string;
  type: 'case_update' | 'document_alert' | 'system';
}

export async function sendNotification({ userId, subject, message, type }: NotificationOptions) {
  try {
    const { db } = await connectToDatabase();
    
    // Get user's notification settings
    const userSettings = await db.collection('userSettings').findOne({ userId });
    if (!userSettings?.notifications?.emailNotifications) {
      return; // User has disabled email notifications
    }

    // Check if this type of notification is enabled
    if (type === 'case_update' && !userSettings.notifications.caseUpdates) {
      return;
    }
    if (type === 'document_alert' && !userSettings.notifications.documentAlerts) {
      return;
    }

    // Create email transporter using superadmin@pleadex.com
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Get user's email settings for the "From" name
    const userEmail = await db.collection('userEmails').findOne({ userId });
    const fromName = userEmail?.displayName || 'Pleadex';

    // Send the email
    await transporter.sendMail({
      from: `"${fromName}" <superadmin@pleadex.com>`,
      to: userSettings.notifications.notificationEmail,
      subject: `[Pleadex] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
            <div style="color: #666; line-height: 1.6;">
              ${message}
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 0.9em;">
              <p>This is an automated message from Pleadex. Please do not reply to this email.</p>
              <p>To manage your notification settings, please visit your account settings in the Pleadex application.</p>
            </div>
          </div>
        </div>
      `,
    });

    // Log the notification
    await db.collection('notificationLogs').insertOne({
      userId,
      type,
      subject,
      message,
      sentTo: userSettings.notifications.notificationEmail,
      sentAt: new Date(),
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    // Log the error but don't throw it to prevent breaking the main application flow
    await logNotificationError(userId, type, error);
  }
}

async function logNotificationError(userId: string, type: string, error: any) {
  try {
    const { db } = await connectToDatabase();
    await db.collection('notificationErrors').insertOne({
      userId,
      type,
      error: error.message || 'Unknown error',
      timestamp: new Date(),
    });
  } catch (logError) {
    console.error('Error logging notification error:', logError);
  }
} 