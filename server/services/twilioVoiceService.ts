
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+15017122661'; // Default from your example

let client: twilio.Twilio | null = null;

// Initialize Twilio client
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
  console.log('✓ Twilio client initialized');
} else {
  console.log('⚠️ Twilio credentials not found in environment variables');
}

interface CallOptions {
  to: string;
  message: string;
  voice?: string;
  recordCall?: boolean;
}

interface CallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

export class TwilioVoiceService {
  /**
   * Make an outbound call with a custom message
   */
  static async makeCall(options: CallOptions): Promise<CallResult> {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Check credentials.'
      };
    }

    try {
      const twimlMessage = this.generateTwiML(options.message, options.voice);
      
      const call = await client.calls.create({
        from: twilioPhoneNumber,
        to: options.to,
        twiml: twimlMessage,
        record: options.recordCall || false,
        recordingStatusCallback: `${process.env.BASE_URL || 'http://localhost:5000'}/api/webhooks/twilio/recording`,
        statusCallback: `${process.env.BASE_URL || 'http://localhost:5000'}/api/webhooks/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      console.log(`📞 Call initiated: ${call.sid} to ${options.to}`);
      
      return {
        success: true,
        callSid: call.sid
      };
    } catch (error: any) {
      console.error('Twilio call error:', error);
      return {
        success: false,
        error: error.message || 'Failed to make call'
      };
    }
  }

  /**
   * Generate TwiML for voice messages
   */
  private static generateTwiML(message: string, voice: string = 'Polly.Amy'): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="${voice}">${message}</Say>
    <Pause length="1"/>
    <Say voice="${voice}">Thank you for choosing Jay's Frames. Have a great day!</Say>
</Response>`;
  }

  /**
   * Call customer about order ready for pickup
   */
  static async notifyOrderReady(customerPhone: string, orderTrackingId: string, customerName: string): Promise<CallResult> {
    const message = `Hello ${customerName}, this is Jay's Frames calling to let you know that your custom frame order ${orderTrackingId} is now ready for pickup. Please call us at your convenience to schedule a pickup time. Thank you!`;
    
    return this.makeCall({
      to: customerPhone,
      message,
      recordCall: true
    });
  }

  /**
   * Call customer about overdue pickup
   */
  static async notifyOverduePickup(customerPhone: string, orderTrackingId: string, customerName: string, daysPastDue: number): Promise<CallResult> {
    const message = `Hello ${customerName}, this is Jay's Frames. Your custom frame order ${orderTrackingId} has been ready for pickup for ${daysPastDue} days. Please contact us to arrange pickup at your earliest convenience. Thank you!`;
    
    return this.makeCall({
      to: customerPhone,
      message,
      recordCall: true
    });
  }

  /**
   * Call customer about delayed order
   */
  static async notifyOrderDelay(customerPhone: string, orderTrackingId: string, customerName: string, newDueDate: string, reason: string): Promise<CallResult> {
    const message = `Hello ${customerName}, this is Jay's Frames calling about your order ${orderTrackingId}. We need to inform you of a slight delay due to ${reason}. Your new estimated completion date is ${newDueDate}. We apologize for any inconvenience and appreciate your patience.`;
    
    return this.makeCall({
      to: customerPhone,
      message,
      recordCall: true
    });
  }

  /**
   * Make a custom call with any message
   */
  static async makeCustomCall(customerPhone: string, customMessage: string): Promise<CallResult> {
    return this.makeCall({
      to: customerPhone,
      message: customMessage,
      recordCall: true
    });
  }

  /**
   * Test the Twilio connection
   */
  static async testConnection(): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Check credentials.'
      };
    }

    try {
      const account = await client.api.accounts(accountSid).fetch();
      return {
        success: true,
        accountInfo: {
          friendlyName: account.friendlyName,
          status: account.status,
          type: account.type
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Twilio'
      };
    }
  }

  /**
   * Get call logs for a specific time period
   */
  static async getCallLogs(startDate?: Date, endDate?: Date) {
    if (!client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const calls = await client.calls.list({
        startTime: startDate,
        endTime: endDate,
        limit: 50
      });

      return calls.map(call => ({
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        price: call.price,
        direction: call.direction
      }));
    } catch (error: any) {
      console.error('Error fetching call logs:', error);
      throw error;
    }
  }
}

// Export instance for compatibility with existing imports
export const twilioVoiceService = TwilioVoiceService;
