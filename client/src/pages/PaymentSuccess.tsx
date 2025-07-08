
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const invoiceNumber = searchParams.get('invoice');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {invoiceNumber && (
            <p className="text-gray-600">
              Thank you for your payment for invoice <strong>#{invoiceNumber}</strong>
            </p>
          )}
          <div className="space-y-2 text-sm text-gray-500">
            <p>Your payment has been processed successfully.</p>
            <p>You will receive a confirmation email shortly.</p>
          </div>
          <div className="pt-4">
            <a 
              href="/" 
              className="inline-block bg-jade-500 hover:bg-jade-400 text-black px-6 py-2 rounded-md font-medium"
            >
              Return to Dashboard
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
