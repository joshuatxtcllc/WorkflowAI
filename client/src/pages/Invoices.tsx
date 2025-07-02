
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import InvoiceModal from '@/components/InvoiceModal';

export default function Invoices() {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-gray-600">Create and manage customer invoices</p>
        </div>
        <Button 
          onClick={() => setShowInvoiceModal(true)}
          className="bg-jade-500 hover:bg-jade-400 text-black"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Create Your First Invoice</h3>
            <p className="text-gray-600 mb-6">
              Generate professional invoices with automatic calculations for tax and totals.
              Perfect for custom frame orders and additional services.
            </p>
            <Button 
              onClick={() => setShowInvoiceModal(true)}
              className="bg-jade-500 hover:bg-jade-400 text-black"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
      />
    </div>
  );
}
