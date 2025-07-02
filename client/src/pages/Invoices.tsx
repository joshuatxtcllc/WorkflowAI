
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Search, Eye, Download, Calendar, User, DollarSign } from 'lucide-react';
import InvoiceModal from '@/components/InvoiceModal';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: string;
  dueDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export default function Invoices() {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Mock data - in real app this would come from API
  const mockInvoices: Invoice[] = [
    {
      id: '1',
      invoiceNumber: 'INV-12001',
      customerName: 'John Smith',
      customerEmail: 'john@example.com',
      amount: 250.00,
      status: 'paid',
      createdAt: '2025-06-01T10:00:00Z',
      dueDate: '2025-07-01T10:00:00Z',
      lineItems: [
        { description: 'Custom Frame 16x20', quantity: 1, price: 250.00, total: 250.00 }
      ]
    },
    {
      id: '2',
      invoiceNumber: 'INV-12002',
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah@example.com',
      amount: 185.50,
      status: 'sent',
      createdAt: '2025-06-15T14:30:00Z',
      dueDate: '2025-07-15T14:30:00Z',
      lineItems: [
        { description: 'Photo Matting', quantity: 2, price: 75.00, total: 150.00 },
        { description: 'Glass Upgrade', quantity: 1, price: 35.50, total: 35.50 }
      ]
    },
    {
      id: '3',
      invoiceNumber: 'INV-12003',
      customerName: 'Mike Wilson',
      customerEmail: 'mike@example.com',
      amount: 420.75,
      status: 'overdue',
      createdAt: '2025-05-20T09:15:00Z',
      dueDate: '2025-06-20T09:15:00Z',
      lineItems: [
        { description: 'Large Canvas Frame 24x36', quantity: 1, price: 420.75, total: 420.75 }
      ]
    },
    {
      id: '4',
      invoiceNumber: 'INV-12004',
      customerName: 'Emily Davis',
      customerEmail: 'emily@example.com',
      amount: 95.00,
      status: 'draft',
      createdAt: '2025-07-01T16:45:00Z',
      dueDate: '2025-08-01T16:45:00Z',
      lineItems: [
        { description: 'Document Framing', quantity: 1, price: 95.00, total: 95.00 }
      ]
    }
  ];

  // Filter invoices based on search term and status
  const filteredInvoices = mockInvoices.filter(invoice => {
    const matchesSearch = !searchTerm || 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Create downloadable invoice data
    const invoiceData = {
      ...invoice,
      downloadedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(invoiceData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by invoice number, customer name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice List ({filteredInvoices.length} found)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Create your first invoice to get started.'}
              </p>
              <Button 
                onClick={() => setShowInvoiceModal(true)}
                className="bg-jade-500 hover:bg-jade-400 text-black"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{invoice.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold">${invoice.amount.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Created: {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-500">
                          Items: {invoice.lineItems.map(item => item.description).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Creation Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
      />

      {/* Invoice Viewer Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Invoice Details</h2>
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold">Invoice Number:</label>
                    <p>{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <label className="font-semibold">Status:</label>
                    <Badge className={getStatusColor(selectedInvoice.status)}>
                      {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold">Customer:</label>
                    <p>{selectedInvoice.customerName}</p>
                    <p className="text-sm text-gray-600">{selectedInvoice.customerEmail}</p>
                  </div>
                  <div>
                    <label className="font-semibold">Amount:</label>
                    <p className="text-2xl font-bold">${selectedInvoice.amount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold">Created:</label>
                    <p>{format(new Date(selectedInvoice.createdAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                  <div>
                    <label className="font-semibold">Due Date:</label>
                    <p>{format(new Date(selectedInvoice.dueDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                <div>
                  <label className="font-semibold">Line Items:</label>
                  <div className="mt-2 border rounded">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2">Description</th>
                          <th className="text-center p-2">Qty</th>
                          <th className="text-right p-2">Price</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.lineItems.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{item.description}</td>
                            <td className="text-center p-2">{item.quantity}</td>
                            <td className="text-right p-2">${item.price.toFixed(2)}</td>
                            <td className="text-right p-2">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
