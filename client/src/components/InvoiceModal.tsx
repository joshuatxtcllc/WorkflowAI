
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Printer, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledCustomer?: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  prefilledItems?: {
    description: string;
    quantity: number;
    price: number;
  }[];
}

export default function InvoiceModal({ isOpen, onClose, prefilledCustomer, prefilledItems }: InvoiceModalProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer: {
      name: prefilledCustomer?.name || '',
      email: prefilledCustomer?.email || '',
      phone: prefilledCustomer?.phone || '',
      address: prefilledCustomer?.address || ''
    },
    notes: '',
    taxRate: 8.5 // Default tax rate - can be adjusted
  });

  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (prefilledItems && prefilledItems.length > 0) {
      return prefilledItems.map((item, index) => ({
        id: `item-${index}`,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      }));
    }
    return [{
      id: 'item-1',
      description: '',
      quantity: 1,
      price: 0,
      total: 0
    }];
  });

  const addLineItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      price: 0,
      total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(items => 
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price') {
            updatedItem.total = updatedItem.quantity * updatedItem.price;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return (calculateSubtotal() * invoiceData.taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceData.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .invoice-header { text-align: center; margin-bottom: 30px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-info, .invoice-info { width: 45%; }
            .line-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .line-items th, .line-items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .line-items th { background-color: #f5f5f5; }
            .totals { margin-left: auto; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand-total { font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    toast({
      title: "Invoice Printed",
      description: "Invoice has been sent to printer.",
    });
  };

  const resetForm = () => {
    setInvoiceData({
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customer: { name: '', email: '', phone: '', address: '' },
      notes: '',
      taxRate: 8.5
    });
    setLineItems([{
      id: 'item-1',
      description: '',
      quantity: 1,
      price: 0,
      total: 0
    }]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.1"
                value={invoiceData.taxRate}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="invoiceDate">Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceData.date}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={invoiceData.dueDate}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={invoiceData.customer.name}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    customer: { ...prev.customer, name: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={invoiceData.customer.email}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    customer: { ...prev.customer, email: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={invoiceData.customer.phone}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    customer: { ...prev.customer, phone: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="customerAddress">Address</Label>
                <Input
                  id="customerAddress"
                  value={invoiceData.customer.address}
                  onChange={(e) => setInvoiceData(prev => ({ 
                    ...prev, 
                    customer: { ...prev.customer, address: e.target.value }
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button onClick={addLineItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Total</Label>
                      <Input
                        value={`$${item.total.toFixed(2)}`}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or terms..."
              rows={3}
            />
          </div>

          {/* Invoice Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={printRef} className="space-y-0 p-8 bg-white text-black min-h-[800px] border shadow-lg">
                {/* Header Section with Logo and Company Info */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-jade-500">
                  <div className="flex items-center space-x-4">
                    {/* Company Logo - Using a frame icon as placeholder */}
                    <div className="w-16 h-16 bg-jade-500 rounded-lg flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v8H8V8zm2 2v4h4v-4h-4z"/>
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">Jay's Frames</h1>
                      <p className="text-lg text-jade-600 font-medium">Custom Framing & Art Services</p>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Professional Custom Framing • Art Restoration • Gallery Services</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
                    <div className="bg-jade-50 p-3 rounded-lg border border-jade-200">
                      <p className="text-jade-800 font-semibold">#{invoiceData.invoiceNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Business Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg border-b border-gray-200 pb-2">From</h3>
                    <div className="space-y-1 text-gray-700">
                      <p className="font-semibold">Jay's Frames</p>
                      <p>Houston, Texas</p>
                      <p>Phone: (713) 123-4567</p>
                      <p>Email: info@jaysframes.com</p>
                      <p>Website: www.jaysframes.com</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-jade-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg border-b border-jade-200 pb-2">Bill To</h3>
                    <div className="space-y-1 text-gray-700">
                      <p className="font-semibold text-gray-900">{invoiceData.customer.name}</p>
                      {invoiceData.customer.email && <p>{invoiceData.customer.email}</p>}
                      {invoiceData.customer.phone && <p>{invoiceData.customer.phone}</p>}
                      {invoiceData.customer.address && <p>{invoiceData.customer.address}</p>}
                    </div>
                  </div>
                </div>

                {/* Invoice Details Section */}
                <div className="grid grid-cols-3 gap-4 mb-8 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Invoice Date</p>
                    <p className="font-semibold text-gray-900">{new Date(invoiceData.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Due Date</p>
                    <p className="font-semibold text-gray-900">{new Date(invoiceData.dueDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Terms</p>
                    <p className="font-semibold text-gray-900">Net 30</p>
                  </div>
                </div>

                {/* Line Items Section */}
                <div className="mb-8">
                  <h3 className="font-bold text-gray-900 mb-4 text-lg border-b-2 border-jade-500 pb-2">Items & Services</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-jade-500 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Description</th>
                          <th className="px-4 py-3 text-center font-semibold w-20">Qty</th>
                          <th className="px-4 py-3 text-right font-semibold w-24">Rate</th>
                          <th className="px-4 py-3 text-right font-semibold w-24">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {lineItems.map((item, index) => (
                          <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-4 py-3 text-gray-900">{item.description}</td>
                            <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-700">${item.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end mb-8">
                  <div className="w-80">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="space-y-3">
                        <div className="flex justify-between text-gray-700">
                          <span className="font-medium">Subtotal:</span>
                          <span>${calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span className="font-medium">Tax ({invoiceData.taxRate}%):</span>
                          <span>${calculateTax().toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-300 pt-3">
                          <div className="flex justify-between text-xl font-bold text-gray-900">
                            <span>Total Amount:</span>
                            <span className="text-jade-600">${calculateTotal().toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {invoiceData.notes && (
                  <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">Notes</h3>
                    <p className="text-gray-700 leading-relaxed">{invoiceData.notes}</p>
                  </div>
                )}

                {/* Payment Terms & Footer */}
                <div className="border-t-2 border-gray-200 pt-6 mt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Payment Information</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>• Payment is due within 30 days of invoice date</p>
                        <p>• We accept cash, check, and major credit cards</p>
                        <p>• Make checks payable to "Jay's Frames"</p>
                        <p>• Late payments subject to 1.5% monthly service charge</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Terms & Conditions</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>• Items not picked up within 90 days will be considered abandoned</p>
                        <p>• Please bring this invoice when picking up your order</p>
                        <p>• All sales are final unless defective</p>
                        <p>• Custom work is non-refundable</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center mt-6 pt-4 border-t border-gray-200">
                    <p className="text-jade-600 font-medium">Thank you for choosing Jay's Frames!</p>
                    <p className="text-sm text-gray-500 mt-1">Professional Custom Framing Services Since 1985</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Clear
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handlePrint} className="bg-jade-500 hover:bg-jade-400 text-black">
              <Printer className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
