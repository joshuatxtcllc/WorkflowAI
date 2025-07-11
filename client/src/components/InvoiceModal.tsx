
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
              <div ref={printRef} className="space-y-6 p-6 bg-white text-black">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-black">Jay's Frames</h1>
                  <p className="text-gray-600">Custom Frame Shop</p>
                </div>

                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold mb-2 text-black">Bill To:</h3>
                    <p className="font-medium text-black">{invoiceData.customer.name}</p>
                    <p className="text-black">{invoiceData.customer.email}</p>
                    {invoiceData.customer.phone && <p className="text-black">{invoiceData.customer.phone}</p>}
                    {invoiceData.customer.address && <p className="text-black">{invoiceData.customer.address}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-black"><strong>Invoice #:</strong> {invoiceData.invoiceNumber}</p>
                    <p className="text-black"><strong>Date:</strong> {new Date(invoiceData.date).toLocaleDateString()}</p>
                    <p className="text-black"><strong>Due Date:</strong> {new Date(invoiceData.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left text-black">Description</th>
                      <th className="border border-black p-2 text-center text-black">Qty</th>
                      <th className="border border-black p-2 text-right text-black">Price</th>
                      <th className="border border-black p-2 text-right text-black">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="border border-black p-2 text-black">{item.description}</td>
                        <td className="border border-black p-2 text-center text-black">{item.quantity}</td>
                        <td className="border border-black p-2 text-right text-black">${item.price.toFixed(2)}</td>
                        <td className="border border-black p-2 text-right text-black">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="ml-auto w-64">
                  <div className="flex justify-between py-1">
                    <span className="text-black">Subtotal:</span>
                    <span className="text-black">${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-black">Tax ({invoiceData.taxRate}%):</span>
                    <span className="text-black">${calculateTax().toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span className="text-black">Total:</span>
                    <span className="text-black">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {invoiceData.notes && (
                  <div>
                    <h3 className="font-semibold mb-2 text-black">Notes:</h3>
                    <p className="text-gray-700">{invoiceData.notes}</p>
                  </div>
                )}
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
