
import twilio from 'twilio';

export class TwilioVoiceService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || "+15017122661";

    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not configured');
      throw new Error('Twilio credentials missing');
    }

    this.client = twilio(accountSid, authToken);
    console.log('Twilio Voice Service initialized');
  }

  async makeOrderStatusCall(phoneNumber: string, orderTrackingId: string, status: string, useUrl?: boolean): Promise<string> {
    try {
      const message = this.generateStatusMessage(orderTrackingId, status);
      
      const callParams: any = {
        from: this.fromNumber,
        to: phoneNumber
      };

      if (useUrl) {
        // Use URL-based TwiML (you'd implement a TwiML endpoint)
        callParams.url = `${process.env.BASE_URL || 'http://localhost:5000'}/api/twiml/order-status?trackingId=${orderTrackingId}&status=${status}`;
        callParams.method = 'POST';
      } else {
        // Use inline TwiML
        callParams.twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${message}</Say>
    <Pause length="1"/>
    <Say voice="alice">Thank you for choosing Jay's Frames. Goodbye!</Say>
</Response>`;
      }

      const call = await this.client.calls.create(callParams);

      console.log(`Voice call initiated for order ${orderTrackingId}:`, call.sid);
      return call.sid;
    } catch (error) {
      console.error('Error making voice call:', error);
      throw error;
    }
  }

  async makeOrderReadyCall(phoneNumber: string, orderTrackingId: string, customerName: string, useUrl?: boolean): Promise<string> {
    try {
      const message = `Hello ${customerName}, this is Jay's Frames. Your custom frame order ${orderTrackingId} is ready for pickup. Please visit us during business hours Monday through Friday 9 AM to 6 PM, or Saturday 10 AM to 4 PM. Thank you for choosing Jay's Frames.`;
      
      const callParams: any = {
        from: this.fromNumber,
        to: phoneNumber
      };

      if (useUrl) {
        callParams.url = `${process.env.BASE_URL || 'http://localhost:5000'}/api/twiml/order-ready?trackingId=${orderTrackingId}&customerName=${encodeURIComponent(customerName)}`;
        callParams.method = 'POST';
      } else {
        callParams.twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${message}</Say>
    <Pause length="1"/>
    <Play>https://demo.twilio.com/docs/classic.mp3</Play>
    <Say voice="alice">We look forward to seeing you soon!</Say>
</Response>`;
      }

      const call = await this.client.calls.create(callParams);

      console.log(`Order ready call initiated for ${customerName}:`, call.sid);
      return call.sid;
    } catch (error) {
      console.error('Error making order ready call:', error);
      throw error;
    }
  }

  async makeCustomCall(phoneNumber: string, message: string, options?: { 
    voice?: string, 
    useUrl?: boolean, 
    includeMusic?: boolean,
    recordCall?: boolean 
  }): Promise<string> {
    try {
      const voice = options?.voice || 'alice';
      
      const callParams: any = {
        from: this.fromNumber,
        to: phoneNumber
      };

      if (options?.recordCall) {
        callParams.record = true;
        callParams.recordingStatusCallback = `${process.env.BASE_URL || 'http://localhost:5000'}/api/webhooks/recording-status`;
      }

      if (options?.useUrl) {
        callParams.url = `${process.env.BASE_URL || 'http://localhost:5000'}/api/twiml/custom?message=${encodeURIComponent(message)}&voice=${voice}&music=${options?.includeMusic || false}`;
        callParams.method = 'POST';
      } else {
        let twimlContent = `<Say voice="${voice}">${message}</Say>`;
        
        if (options?.includeMusic) {
          twimlContent += `<Pause length="1"/><Play>https://demo.twilio.com/docs/classic.mp3</Play>`;
        }

        callParams.twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    ${twimlContent}
</Response>`;
      }

      const call = await this.client.calls.create(callParams);

      console.log(`Custom voice call initiated:`, call.sid);
      return call.sid;
    } catch (error) {
      console.error('Error making custom voice call:', error);
      throw error;
    }
  }

  async getCallStatus(callSid: string) {
    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime
      };
    } catch (error) {
      console.error('Error fetching call status:', error);
      throw error;
    }
  }

  private generateStatusMessage(orderTrackingId: string, status: string): string {
    const statusMessages = {
      'ORDER_PROCESSED': `Your order ${orderTrackingId} has been processed and is now in our production queue.`,
      'MATERIALS_ORDERED': `We have ordered the materials for your custom frame order ${orderTrackingId}. We will notify you when they arrive.`,
      'MATERIALS_ARRIVED': `The materials for your order ${orderTrackingId} have arrived and production will begin soon.`,
      'FRAME_CUT': `Your frame for order ${orderTrackingId} has been cut and is moving to the next stage.`,
      'MAT_CUT': `The mat for your order ${orderTrackingId} has been cut and your order is progressing well.`,
      'PREPPED': `Your order ${orderTrackingId} has been prepped and is almost ready for final assembly.`,
      'COMPLETED': `Great news! Your custom frame order ${orderTrackingId} is ready for pickup at Jay's Frames.`,
      'DELAYED': `We wanted to let you know that your order ${orderTrackingId} has been delayed. We will update you with a new timeline soon.`
    };

    return statusMessages[status as keyof typeof statusMessages] || 
           `Your order ${orderTrackingId} status has been updated to ${status.replace('_', ' ').toLowerCase()}.`;
  }
}

// Generate TwiML for different call types
  generateTwiML(type: 'order-status' | 'order-ready' | 'custom', params: any): string {
    switch (type) {
      case 'order-status':
        const statusMessage = this.generateStatusMessage(params.trackingId, params.status);
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${statusMessage}</Say>
    <Pause length="1"/>
    <Say voice="alice">Thank you for choosing Jay's Frames. Goodbye!</Say>
</Response>`;

      case 'order-ready':
        const readyMessage = `Hello ${params.customerName}, this is Jay's Frames. Your custom frame order ${params.trackingId} is ready for pickup. Please visit us during business hours Monday through Friday 9 AM to 6 PM, or Saturday 10 AM to 4 PM. Thank you for choosing Jay's Frames.`;
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${readyMessage}</Say>
    <Pause length="1"/>
    <Play>https://demo.twilio.com/docs/classic.mp3</Play>
    <Say voice="alice">We look forward to seeing you soon!</Say>
</Response>`;

      case 'custom':
        let twimlContent = `<Say voice="${params.voice || 'alice'}">${params.message}</Say>`;
        if (params.music === 'true') {
          twimlContent += `<Pause length="1"/><Play>https://demo.twilio.com/docs/classic.mp3</Play>`;
        }
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    ${twimlContent}
</Response>`;

      default:
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Thank you for calling Jay's Frames!</Say>
</Response>`;
    }
  }

  // Make an interactive call with user input
  async makeInteractiveCall(phoneNumber: string, orderTrackingId: string): Promise<string> {
    try {
      const call = await this.client.calls.create({
        from: this.fromNumber,
        to: phoneNumber,
        url: `${process.env.BASE_URL || 'http://localhost:5000'}/api/twiml/interactive?trackingId=${orderTrackingId}`,
        method: 'POST'
      });

      console.log(`Interactive call initiated for order ${orderTrackingId}:`, call.sid);
      return call.sid;
    } catch (error) {
      console.error('Error making interactive call:', error);
      throw error;
    }
  }
}

export const twilioVoiceService = new TwilioVoiceService();
