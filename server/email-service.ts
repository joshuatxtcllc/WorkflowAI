import { logger } from './circuit-breaker';

export class EmailServiceWrapper {
  private sendgrid: any = null;
  private fallbackMode: boolean = false;

  constructor() {
    try {
      if (process.env.SENDGRID_API_KEY) {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sendgrid = sgMail;
        logger.info('SendGrid email service initialized');
      } else {
        this.fallbackMode = true;
        logger.warn('SendGrid not configured, using fallback email service');
      }
    } catch (error) {
      this.fallbackMode = true;
      logger.warn('SendGrid initialization failed, using fallback email service', { error });
    }
  }

  async sendOrderNotification(
    to: string,
    subject: string,
    text: string,
    html?: string
  ): Promise<boolean> {
    if (this.fallbackMode) {
      // Log the email instead of sending it
      logger.info('Email notification (fallback mode)', {
        to,
        subject,
        text: text.substring(0, 100) + '...',
        type: 'order_notification'
      });
      return true;
    }

    try {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@jaysframes.com',
        subject,
        text,
        html: html || text
      };

      await this.sendgrid.send(msg);
      logger.info('Email sent successfully', { to, subject });
      return true;
    } catch (error) {
      logger.error('Failed to send email', { to, subject, error });
      return false;
    }
  }

  async sendBulkNotifications(
    notifications: Array<{
      to: string;
      subject: string;
      text: string;
      html?: string;
    }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      const result = await this.sendOrderNotification(
        notification.to,
        notification.subject,
        notification.text,
        notification.html
      );
      
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  isConfigured(): boolean {
    return !this.fallbackMode;
  }
}

export const emailService = new EmailServiceWrapper();