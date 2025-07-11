import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Plus, Trash2, FileText, Printer } from 'lucide-react';

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
  orderId?: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  prefilledCustomer?: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  prefilledItems?: {
    description: string;
    quantity: number;
    price: number;
  }[];
}

function InvoiceModal({ isOpen, onClose, orderId, customerInfo, prefilledCustomer, prefilledItems }: InvoiceModalProps) {
  const customer = prefilledCustomer || customerInfo;
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);
  const [customerName, setCustomerName] = useState(customer?.name || '');
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(customer?.address || '');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (prefilledItems && prefilledItems.length > 0) {
      return prefilledItems.map((item, index) => ({
        id: (index + 1).toString(),
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      }));
    }
    return [{ id: '1', description: '', quantity: 1, price: 0, total: 0 }];
  });
  const [includeTax, setIncludeTax] = useState(true);
  const [taxRate, setTaxRate] = useState(0.08); // Default 8% tax rate

  const printRef = useRef<HTMLDivElement>(null);

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      price: 0,
      total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          updated.total = updated.quantity * updated.price;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return includeTax ? calculateSubtotal() * taxRate : 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setInvoiceNumber(`INV-${Date.now()}`);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerAddress('');
    setDueDate('');
    setNotes('');
    setLineItems([{ id: '1', description: '', quantity: 1, price: 0, total: 0 }]);
    setIncludeTax(true);
    setTaxRate(0.08);
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
          {/* Customer Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="customerAddress">Address</Label>
                  <Textarea
                    id="customerAddress"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Customer address"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Line Items</h3>
                <Button onClick={addLineItem} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={`$${item.total.toFixed(2)}`}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tax Settings */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeTax"
                      checked={includeTax}
                      onCheckedChange={(checked) => setIncludeTax(!!checked)}
                    />
                    <Label htmlFor="includeTax">Include Tax</Label>
                  </div>
                  {includeTax && (
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="taxRate">Tax Rate (%):</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={(taxRate * 100).toFixed(2)}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100 || 0)}
                        className="w-20"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {includeTax && (
                      <div className="flex justify-between">
                        <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
                        <span>${calculateTax().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or terms..."
                rows={3}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Clear
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">
              <Printer className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InvoiceModal;