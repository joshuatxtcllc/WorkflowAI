
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Phone, Mail, User, Package, DollarSign, FileText, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import type { OrderWithDetails } from '@shared/schema';

interface SimpleInvoiceProps {
  order: OrderWithDetails;
  onClose?: () => void;
}

export default function SimpleInvoice({ order, onClose }: SimpleInvoiceProps) {
  const subtotal = order.price;
  const taxRate = 0.0825; // 8.25% Texas sales tax
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a simplified version for download
    const invoiceData = {
      invoiceNumber: order.invoiceNumber || order.trackingId,
      customer: order.customer,
      order: {
        id: order.trackingId,
        description: order.description,
        orderType: order.orderType,
        price: order.price,
        status: order.status,
        dueDate: order.dueDate
      },
      totals: {
        subtotal,
        tax: taxAmount,
        total
      },
      date: new Date().toISOString()
    };

    const dataStr = JSON.stringify(invoiceData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${order.invoiceNumber || order.trackingId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jay's Frames</h1>
          <p className="text-gray-600 mt-1">Custom Framing & Art Services</p>
          <div className="text-sm text-gray-500 mt-2">
            <p>Houston, Texas</p>
            <p>Phone: (713) 123-4567</p>
            <p>Email: info@jaysframes.com</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
          <p className="text-gray-600">#{order.invoiceNumber || order.trackingId}</p>
          <p className="text-sm text-gray-500 mt-1">
            Date: {format(new Date(), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Bill To
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold">{order.customer?.name || 'Unknown Customer'}</p>
              {order.customer?.email && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {order.customer.email}
                </p>
              )}
              {order.customer?.phone && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {order.customer.phone}
                </p>
              )}
              {order.customer?.address && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {order.customer.address}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Order ID:</span> {order.trackingId}
              </p>
              <p className="text-sm">
                <span className="font-medium">Order Type:</span> {order.orderType}
              </p>
              <p className="text-sm">
                <span className="font-medium">Due Date:</span> {format(new Date(order.dueDate), 'MMM d, yyyy')}
              </p>
              <p className="text-sm">
                <span className="font-medium">Status:</span>
                <Badge className="ml-2" variant="outline">{order.status}</Badge>
              </p>
              <p className="text-sm">
                <span className="font-medium">Estimated Hours:</span> {order.estimatedHours}h
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Items & Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Description</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Unit Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4">
                    <div>
                      <p className="font-medium">{order.orderType} - Custom Framing</p>
                      <p className="text-sm text-gray-600">{order.description}</p>
                      {order.notes && (
                        <p className="text-xs text-gray-500 mt-1">Note: {order.notes}</p>
                      )}
                    </div>
                  </td>
                  <td className="text-center py-4">1</td>
                  <td className="text-right py-4">${order.price.toFixed(2)}</td>
                  <td className="text-right py-4 font-medium">${order.price.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8.25%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Terms */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Payment Terms & Notes</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Payment is due upon completion of work</p>
            <p>• We accept cash, check, and major credit cards</p>
            <p>• Items not picked up within 90 days will be considered abandoned</p>
            <p>• Please bring this invoice when picking up your order</p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Hide when printing */}
      <div className="flex gap-4 justify-end print:hidden">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          @page {
            margin: 0.5in;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
