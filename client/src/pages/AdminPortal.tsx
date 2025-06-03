
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminPortal() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300">Admin portal functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
