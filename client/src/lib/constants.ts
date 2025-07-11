export const KANBAN_COLUMNS = [
  {
    title: 'Order Processed',
    status: 'ORDER_PROCESSED',
    description: 'New orders ready for production',
    color: 'jade'
  },
  {
    title: 'Materials Ordered',
    status: 'MATERIALS_ORDERED',
    description: 'Materials ordered from suppliers',
    color: 'blue'
  },
  {
    title: 'Materials Arrived',
    status: 'MATERIALS_ARRIVED',
    description: 'Materials received and ready',
    color: 'green'
  },
  {
    title: 'Frame Cut',
    status: 'FRAME_CUT',
    description: 'Frame cutting in progress',
    color: 'purple'
  },
  {
    title: 'Mat Cut',
    status: 'MAT_CUT',
    description: 'Mat cutting in progress',
    color: 'pink'
  },
  {
    title: 'Prepped',
    status: 'PREPPED',
    description: 'Assembly preparation complete',
    color: 'orange'
  },
  {
    title: 'Completed',
    status: 'COMPLETED',
    description: 'Ready for customer pickup',
    color: 'green'
  },
  {
    title: 'Delayed',
    status: 'DELAYED',
    description: 'Orders with delays',
    color: 'red'
  },
  {
    title: 'Picked Up',
    status: 'PICKED_UP',
    description: 'Completed and collected',
    color: 'blue'
  },
  {
    title: 'Mystery/Unclaimed',
    status: 'MYSTERY_UNCLAIMED',
    description: 'Unclaimed items from mystery drawers',
    color: 'purple'
  }
] as const;

export const ORDER_TYPES = [
  { value: 'FRAME', label: 'Frame Only', emoji: '🪟' },
  { value: 'MAT', label: 'Mat Only', emoji: '🖼️' },
  { value: 'SHADOWBOX', label: 'Shadow Box', emoji: '🎨' }
] as const;

export const PRIORITY_LEVELS = [
  { 
    value: 'LOW', 
    label: 'Low', 
    color: 'gray',
    bgColor: 'bg-gray-500',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
    icon: '📋',
    urgencyScore: 1
  },
  { 
    value: 'MEDIUM', 
    label: 'Medium', 
    color: 'orange',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-300',
    icon: '⚠️',
    urgencyScore: 2
  },
  { 
    value: 'HIGH', 
    label: 'High', 
    color: 'orange',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-300',
    icon: '🔥',
    urgencyScore: 3
  },
  { 
    value: 'URGENT', 
    label: 'Urgent', 
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-300',
    icon: '🚨',
    urgencyScore: 4
  }
] as const;

export const MATERIAL_TYPES = [
  { value: 'FRAME', label: 'Frame', icon: '🪟' },
  { value: 'MAT', label: 'Mat', icon: '🎨' },
  { value: 'GLASS', label: 'Glass', icon: '🔍' },
  { value: 'HARDWARE', label: 'Hardware', icon: '🔧' },
  { value: 'OTHER', label: 'Other', icon: '📦' }
] as const;

export const NOTIFICATION_TYPES = [
  'ORDER_CREATED',
  'STATUS_UPDATE',
  'READY_FOR_PICKUP',
  'OVERDUE_REMINDER',
  'MATERIAL_UPDATE'
] as const;

export const NOTIFICATION_CHANNELS = [
  'EMAIL',
  'SMS',
  'BOTH'
] as const;

export const AI_MESSAGE_TYPES = [
  'user',
  'assistant',
  'alert'
] as const;

export const AI_SEVERITY_LEVELS = [
  'info',
  'warning',
  'urgent',
  'success'
] as const;

export const WEBSOCKET_MESSAGE_TYPES = {
  CONNECTED: 'connected',
  ORDER_UPDATED: 'order-updated',
  ORDER_STATUS_UPDATE: 'order-status-update',
  AI_ALERT: 'ai-alert',
  AI_ALERTS: 'ai-alerts',
  JOIN_ROOM: 'join-room'
} as const;

export const BUSINESS_INFO = {
  name: "Jay's Frames",
  phone: "+1 (555) 123-4567",
  email: "info@jaysframes.com",
  address: "123 Art Street, Creative City, ST 12345",
  hours: {
    weekdays: "Monday - Friday: 9:00 AM - 6:00 PM",
    saturday: "Saturday: 10:00 AM - 4:00 PM",
    sunday: "Sunday: Closed"
  }
} as const;

export const APP_CONFIG = {
  refetchInterval: 30000, // 30 seconds
  aiCheckInterval: 30000, // 30 seconds
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
  workingHoursPerDay: 8,
  alertThresholdHours: 24
} as const;

export const DRAG_AND_DROP = {
  ITEM_TYPES: {
    ORDER: 'order'
  }
} as const;

export const FORM_VALIDATION = {
  trackingId: {
    minLength: 6,
    pattern: /^JF\d{4}\d{6}$/
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    pattern: /^\+?[\d\s\-\(\)]+$/
  }
} as const;

export const DATE_FORMATS = {
  display: 'MMM dd, yyyy',
  displayWithTime: 'MMM dd, yyyy hh:mm a',
  iso: 'yyyy-MM-dd',
  timeOnly: 'hh:mm a'
} as const;

export const CURRENCY_FORMAT = {
  locale: 'en-US',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
} as const;

export const THEME_COLORS = {
  jade: {
    50: '#E6FAF7',
    100: '#CCF5EF',
    200: '#99EBDE',
    300: '#66E0CE',
    400: '#33D6BD',
    500: '#00A693',
    600: '#007A6C',
    700: '#005C52',
    800: '#003D37',
    900: '#001F1C'
  },
  gray: {
    50: '#F5F5FA',
    100: '#E8E8F0',
    200: '#C4C4CC',
    300: '#A0A0A8',
    400: '#767684',
    500: '#62626E',
    600: '#4E4E58',
    700: '#3A3A42',
    800: '#26262C',
    850: '#1C1C21',
    900: '#131316',
    950: '#0A0A0B'
  }
} as const;
