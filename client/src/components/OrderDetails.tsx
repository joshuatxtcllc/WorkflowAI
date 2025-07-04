import React from 'react';

interface OrderDetailsProps {
  orderId: string;
  onClose: () => void;
}

export function OrderDetails({ orderId, onClose }: OrderDetailsProps) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-white text-lg mb-4">Order Details - {orderId}</h2>
      <p className="text-gray-300 mb-4">Order details component is being rebuilt for improved functionality.</p>
      <button 
        onClick={onClose}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Close
      </button>
    </div>
  );
}

export default OrderDetails;