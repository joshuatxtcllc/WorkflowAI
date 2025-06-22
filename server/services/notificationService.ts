import { storage } from "../storage";
import { twilioVoiceService } from "./twilioVoiceService";
import type { OrderWithDetails, InsertNotification } from "@shared/schema";

export class NotificationService {
  async sendStatusUpdate(order: OrderWithDetails): Promise<void> {
    try {
      const customer = order.customer;
      
      // Create email notification
      const emailNotification: InsertNotification = {
        customerId: customer.id,
        orderId: order.id,
        type: order.status === 'COMPLETED' ? 'READY_FOR_PICKUP' : 'STATUS_UPDATE',
        channel: 'EMAIL',
        subject: `Order Update - ${order.trackingId}`,
        content: this.generateEmailContent(order),
        metadata: {
          orderStatus: order.status,
          trackingId: order.trackingId
        }
      };

      await storage.createNotification(emailNotification);

      // Create SMS notification if phone number is available
      if (customer.phone) {
        const smsNotification: InsertNotification = {
          customerId: customer.id,
          orderId: order.id,
          type: order.status === 'COMPLETED' ? 'READY_FOR_PICKUP' : 'STATUS_UPDATE',
          channel: 'SMS',
          subject: 'Order Update',
          content: this.generateSMSContent(order),
          metadata: {
            orderStatus: order.status,
            trackingId: order.trackingId,
            phone: customer.phone
          }
        };

        await storage.createNotification(smsNotification);
      }

      // Make voice call for completed orders if phone number is available
      if (order.status === 'COMPLETED' && customer.phone) {
        try {
          const callSid = await twilioVoiceService.makeOrderReadyCall(
            customer.phone,
            order.trackingId,
            customer.name
          );
          
          // Create voice call notification record
          const voiceNotification: InsertNotification = {
            customerId: customer.id,
            orderId: order.id,
            type: 'READY_FOR_PICKUP',
            channel: 'VOICE',
            subject: 'Order Ready - Voice Call',
            content: `Voice call made to notify customer that order ${order.trackingId} is ready for pickup`,
            metadata: {
              orderStatus: order.status,
              trackingId: order.trackingId,
              phone: customer.phone,
              callSid: callSid
            }
          };

          await storage.createNotification(voiceNotification);
          console.log(`Voice call initiated for order ${order.trackingId}: ${callSid}`);
        } catch (voiceError) {
          console.error('Failed to make voice call:', voiceError);
          // Don't fail the entire notification process if voice call fails
        }
      }

      console.log(`Notifications created for order ${order.trackingId}`);
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  }

  async sendOverdueReminder(order: OrderWithDetails): Promise<void> {
    try {
      const customer = order.customer;
      
      const notification: InsertNotification = {
        customerId: customer.id,
        orderId: order.id,
        type: 'OVERDUE_REMINDER',
        channel: 'EMAIL',
        subject: `Order Delayed - ${order.trackingId}`,
        content: this.generateOverdueContent(order),
        metadata: {
          orderStatus: order.status,
          trackingId: order.trackingId,
          dueDate: order.dueDate
        }
      };

      await storage.createNotification(notification);
      console.log(`Overdue reminder created for order ${order.trackingId}`);
    } catch (error) {
      console.error('Error creating overdue reminder:', error);
    }
  }

  async sendMaterialUpdate(order: OrderWithDetails, materialType: string): Promise<void> {
    try {
      const customer = order.customer;
      
      const notification: InsertNotification = {
        customerId: customer.id,
        orderId: order.id,
        type: 'MATERIAL_UPDATE',
        channel: 'EMAIL',
        subject: `Material Update - ${order.trackingId}`,
        content: this.generateMaterialUpdateContent(order, materialType),
        metadata: {
          orderStatus: order.status,
          trackingId: order.trackingId,
          materialType
        }
      };

      await storage.createNotification(notification);
      console.log(`Material update notification created for order ${order.trackingId}`);
    } catch (error) {
      console.error('Error creating material update notification:', error);
    }
  }

  private generateEmailContent(order: OrderWithDetails): string {
    const statusMessages = {
      'ORDER_PROCESSED': 'Your order has been processed and is now in our production queue.',
      'MATERIALS_ORDERED': 'We have ordered the materials for your custom frame. We will notify you when they arrive.',
      'MATERIALS_ARRIVED': 'Your materials have arrived and your order will begin production soon.',
      'FRAME_CUT': 'Your frame has been cut and is moving to the next stage of production.',
      'MAT_CUT': 'Your mat has been cut and your order is progressing nicely.',
      'PREPPED': 'Your order has been prepped and is almost ready for final assembly.',
      'COMPLETED': 'Great news! Your custom frame is ready for pickup.',
      'DELAYED': 'We wanted to let you know that your order has been delayed. We will update you with a new timeline soon.',
    };

    const statusMessage = statusMessages[order.status as keyof typeof statusMessages] || 'Your order status has been updated.';

    return `
Dear ${order.customer.name},

${statusMessage}

Order Details:
- Order Number: ${order.trackingId}
- Order Type: ${order.orderType}
- Current Status: ${order.status.replace('_', ' ')}
${order.status === 'COMPLETED' ? `
Your order is ready for pickup at Jay's Frames. Please bring this email or your order number when you come to collect your frame.

Pickup Hours:
Monday - Friday: 9:00 AM - 6:00 PM
Saturday: 10:00 AM - 4:00 PM
Sunday: Closed
` : `
- Due Date: ${new Date(order.dueDate).toLocaleDateString()}
`}

Thank you for choosing Jay's Frames!

Best regards,
The Jay's Frames Team

---
You can track your order anytime at: [Track Order Link]
    `.trim();
  }

  private generateSMSContent(order: OrderWithDetails): string {
    const statusMessages = {
      'COMPLETED': `Your custom frame (${order.trackingId}) is ready for pickup at Jay's Frames!`,
      'DELAYED': `Your order ${order.trackingId} has been delayed. We'll update you with a new timeline soon.`,
    };

    return statusMessages[order.status as keyof typeof statusMessages] || 
           `Order update: ${order.trackingId} status changed to ${order.status.replace('_', ' ')}.`;
  }

  private generateOverdueContent(order: OrderWithDetails): string {
    return `
Dear ${order.customer.name},

We wanted to reach out regarding your custom frame order ${order.trackingId}, which was originally due on ${new Date(order.dueDate).toLocaleDateString()}.

We sincerely apologize for the delay. Our team is working diligently to complete your order, and we expect to have it ready within the next 2-3 business days.

We understand how important your custom frame is to you, and we appreciate your patience as we ensure the highest quality for your piece.

We will send you another update as soon as your order is completed.

Thank you for your understanding.

Best regards,
The Jay's Frames Team
    `.trim();
  }

  private generateMaterialUpdateContent(order: OrderWithDetails, materialType: string): string {
    return `
Dear ${order.customer.name},

We have an update on the materials for your custom frame order ${order.trackingId}.

The ${materialType.toLowerCase()} materials for your order have arrived and your frame will begin production shortly.

Current Status: ${order.status.replace('_', ' ')}
Expected Completion: ${new Date(order.dueDate).toLocaleDateString()}

We'll continue to keep you updated on your order's progress.

Best regards,
The Jay's Frames Team
    `.trim();
  }

  async processPendingNotifications(): Promise<void> {
    // This method would integrate with actual email/SMS services
    // For now, it just updates the notification status
    try {
      const pendingNotifications = await storage.getPendingNotifications();
      
      for (const notification of pendingNotifications) {
        // Here you would integrate with SendGrid, Twilio, etc.
        console.log(`Would send ${notification.channel} notification:`, {
          to: notification.channel === 'SMS' ? notification.metadata?.phone : notification.customerId,
          subject: notification.subject,
          content: notification.content
        });

        // Mark as sent (in a real implementation, only mark as sent after successful delivery)
        await storage.updateNotification(notification.id, {
          status: 'SENT',
          sentAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }
}
