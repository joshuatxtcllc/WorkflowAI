
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoiceCustomer {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  customer?: InvoiceCustomer;
  notes?: string;
  taxRate?: number;
  subtotal?: number;
  tax?: number;
  total?: number;
}

export interface InvoiceFormData {
  invoiceNumber: string;
  customer: InvoiceCustomer;
  dueDate: string;
  notes: string;
  taxRate: number;
}
