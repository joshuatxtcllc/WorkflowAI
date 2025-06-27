
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { 
  Phone, 
  PhoneCall, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Volume2,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function TwilioManagement() {
  const [customPhone, setCustomPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const { toast } = useToast();

  // Test Twilio connection
  const { data: connectionTest, isLoading: testingConnection, refetch: testConnection } = useQuery({
    queryKey: ['twilio-test'],
    queryFn: async () => {
      const response = await fetch('/api/twilio/test');
      return response.json();
    },
    enabled: false
  });

  // Get call logs
  const { data: callLogs, isLoading: loadingCalls } = useQuery({
    queryKey: ['twilio-calls'],
    queryFn: async () => {
      const response = await fetch('/api/twilio/calls');
      return response.json();
    }
  });

  // Make custom call
  const { mutate: makeCustomCall, isPending: makingCall } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/twilio/call/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customPhone,
          message: customMessage
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Call Initiated",
          description: `Voice call started successfully (SID: ${data.callSid})`,
        });
        setCustomPhone('');
        setCustomMessage('');
      } else {
        toast({
          title: "Call Failed",
          description: data.error || "Unable to make call",
          variant: "destructive"
        });
      }
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'no-answer':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'busy':
        return <Phone className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      'completed': 'default',
      'failed': 'destructive',
      'no-answer': 'destructive',
      'busy': 'secondary',
      'in-progress': 'secondary'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Volume2 className="h-8 w-8" />
            Twilio Voice Management
          </h1>
          <p className="text-muted-foreground">
            Manage voice calls and customer notifications
          </p>
        </div>

        <div className="grid gap-6 max-w-4xl mx-auto">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Twilio Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Connection Status:</span>
                {connectionTest?.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Connected</span>
                  </div>
                ) : connectionTest?.success === false ? (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">Disconnected</span>
                  </div>
                ) : (
                  <span className="text-gray-500">Not tested</span>
                )}
              </div>

              {connectionTest?.accountInfo && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">Account:</span> {connectionTest.accountInfo.friendlyName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Status:</span> {connectionTest.accountInfo.status}
                  </div>
                </div>
              )}

              {connectionTest?.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{connectionTest.error}</p>
                </div>
              )}

              <Button 
                onClick={() => testConnection()}
                disabled={testingConnection}
                variant="outline"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            </CardContent>
          </Card>

          {/* Make Custom Call */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />
                Make Custom Call
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Enter your custom message here..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={() => makeCustomCall()}
                disabled={makingCall || !customPhone || !customMessage}
                className="w-full"
              >
                {makingCall ? 'Making Call...' : 'Make Call'}
              </Button>
            </CardContent>
          </Card>

          {/* Call History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Call History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCalls ? (
                <div className="text-center py-4">Loading call history...</div>
              ) : callLogs?.calls?.length > 0 ? (
                <div className="space-y-3">
                  {callLogs.calls.slice(0, 10).map((call: any) => (
                    <div key={call.sid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(call.status)}
                        <div>
                          <div className="font-medium">{call.to}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(call.startTime).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {call.duration && (
                          <span className="text-sm text-gray-500">
                            {call.duration}s
                          </span>
                        )}
                        {call.price && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <DollarSign className="h-3 w-3" />
                            {Math.abs(parseFloat(call.price)).toFixed(3)}
                          </div>
                        )}
                        {getStatusBadge(call.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No call history available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
