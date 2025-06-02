
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface DataStatus {
  totalCustomers: number;
  totalOrders: number;
  realOrders: number;
  statusCounts: Record<string, number>;
  recentOrders: Array<{
    trackingId: string;
    status: string;
    createdAt: string;
  }>;
}

export default function DataRecovery() {
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkDataStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data/status');
      const status = await response.json();
      setDataStatus(status);
    } catch (error) {
      setMessage('Failed to check data status');
    } finally {
      setLoading(false);
    }
  };

  const recoverData = async () => {
    setRecovering(true);
    setMessage(null);
    try {
      const response = await fetch('/api/import/recover-data', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ Recovery completed! Imported ${result.imported} orders, skipped ${result.skipped}`);
        // Refresh status
        await checkDataStatus();
      } else {
        setMessage('❌ Recovery failed');
      }
    } catch (error) {
      setMessage('❌ Recovery process failed');
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Recovery</h1>
        <p className="text-muted-foreground">
          Check your current data status and recover any missing orders from your production files.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Database Status</CardTitle>
          <CardDescription>
            Check what data is currently in your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={checkDataStatus} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? 'Checking...' : 'Check Data Status'}
          </Button>

          {dataStatus && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{dataStatus.totalCustomers}</div>
                    <div className="text-sm text-muted-foreground">Total Customers</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{dataStatus.totalOrders}</div>
                    <div className="text-sm text-muted-foreground">Total Orders</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{dataStatus.realOrders}</div>
                    <div className="text-sm text-muted-foreground">Real Production Orders</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Orders by Status</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(dataStatus.statusCounts).map(([status, count]) => (
                    <Badge key={status} variant="outline">
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Recent Orders</h3>
                <div className="space-y-2">
                  {dataStatus.recentOrders.map((order, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <span className="font-mono">{order.trackingId}</span>
                      <Badge variant="secondary">{order.status}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Recovery</CardTitle>
          <CardDescription>
            Re-import your authentic production orders from the source files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will re-import all your real orders from the TSV files in your attached_assets folder. 
            Existing orders will be skipped to avoid duplicates.
          </p>
          
          <Button 
            onClick={recoverData} 
            disabled={recovering}
            variant="default"
          >
            {recovering ? 'Recovering Data...' : 'Start Data Recovery'}
          </Button>

          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
