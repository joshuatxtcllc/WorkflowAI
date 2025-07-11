import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface POSStatus {
  success: boolean;
  error?: string;
  message?: string;
}

export default function POSIntegrationSimple() {
  const { data: posStatus, isLoading, error } = useQuery<POSStatus>({
    queryKey: ["/api/pos/status"],
  });

  if (isLoading) {
    return <div className="p-6">Loading POS status...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">POS Integration</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>Success: {posStatus?.success ? 'Yes' : 'No'}</p>
            <p>Error: {posStatus?.error || 'None'}</p>
            <p>Message: {posStatus?.message || 'None'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}