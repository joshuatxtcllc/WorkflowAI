import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { OrderWithDetails } from '@shared/schema';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Phone,
  Calendar
} from 'lucide-react';
import { format, isPast, addDays } from 'date-fns';

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  overdueReminders: boolean;
  completionAlerts: boolean;
  pickupReminders: boolean;
}

interface Notification {
  id: string;
  type: 'overdue' | 'ready' | 'completed' | 'reminder';
  title: string;
  message: string;
  orderId: string;
  timestamp: Date;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

export default function Notifications() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    overdueReminders: true,
    completionAlerts: true,
    pickupReminders: true
  });

  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  // Generate notifications based on order data
  const generateNotifications = (): Notification[] => {
    const notifications: Notification[] = [];
    const now = new Date();

    orders.forEach(order => {
      const dueDate = new Date(order.dueDate);
      
      // Overdue notifications
      if (isPast(dueDate) && order.status !== 'PICKED_UP') {
        notifications.push({
          id: `overdue-${order.id}`,
          type: 'overdue',
          title: 'Order Overdue',
          message: `Order #${order.trackingId} for ${order.customer?.name} is overdue`,
          orderId: order.id,
          timestamp: dueDate,
          read: false,
          priority: 'high'
        });
      }

      // Ready for pickup notifications
      if (order.status === 'COMPLETED') {
        notifications.push({
          id: `ready-${order.id}`,
          type: 'ready',
          title: 'Order Ready for Pickup',
          message: `Order #${order.trackingId} is completed and ready for customer pickup`,
          orderId: order.id,
          timestamp: new Date(order.updatedAt),
          read: false,
          priority: 'medium'
        });
      }

      // Due soon reminders
      if (dueDate <= addDays(now, 2) && dueDate > now && order.status !== 'PICKED_UP') {
        notifications.push({
          id: `reminder-${order.id}`,
          type: 'reminder',
          title: 'Order Due Soon',
          message: `Order #${order.trackingId} is due ${format(dueDate, 'MMM d')}`,
          orderId: order.id,
          timestamp: now,
          read: false,
          priority: 'medium'
        });
      }
    });

    return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const notifications = generateNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'reminder': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  const updateSetting = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Manage alerts and notification preferences</p>
        </div>
        
        <Badge variant={unreadCount > 0 ? "destructive" : "secondary"}>
          {unreadCount} unread
        </Badge>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Delivery Methods</h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="email">Email Notifications</Label>
                </div>
                <Switch
                  id="email"
                  checked={settings.emailNotifications}
                  onCheckedChange={() => updateSetting('emailNotifications')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="sms">SMS Notifications</Label>
                </div>
                <Switch
                  id="sms"
                  checked={settings.smsNotifications}
                  onCheckedChange={() => updateSetting('smsNotifications')}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Alert Types</h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="overdue">Overdue Reminders</Label>
                </div>
                <Switch
                  id="overdue"
                  checked={settings.overdueReminders}
                  onCheckedChange={() => updateSetting('overdueReminders')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="completion">Completion Alerts</Label>
                </div>
                <Switch
                  id="completion"
                  checked={settings.completionAlerts}
                  onCheckedChange={() => updateSetting('completionAlerts')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="pickup">Pickup Reminders</Label>
                </div>
                <Switch
                  id="pickup"
                  checked={settings.pickupReminders}
                  onCheckedChange={() => updateSetting('pickupReminders')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm">
                Mark All Read
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications at this time</p>
                <p className="text-sm">You'll see alerts for overdue orders, completions, and reminders here</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-4 border-l-4 rounded-lg ${getPriorityColor(notification.priority)} ${
                    !notification.read ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{notification.title}</h4>
                      {!notification.read && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(notification.timestamp, 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    View Order
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Overdue Orders</h3>
            <p className="text-2xl font-bold text-red-600">
              {orders.filter(order => isPast(new Date(order.dueDate)) && order.status !== 'PICKED_UP').length}
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              View Overdue
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Ready for Pickup</h3>
            <p className="text-2xl font-bold text-green-600">
              {orders.filter(order => order.status === 'COMPLETED').length}
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Notify Customers
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Due This Week</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {orders.filter(order => {
                const dueDate = new Date(order.dueDate);
                const weekFromNow = addDays(new Date(), 7);
                return dueDate <= weekFromNow && dueDate > new Date() && order.status !== 'PICKED_UP';
              }).length}
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Review Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}