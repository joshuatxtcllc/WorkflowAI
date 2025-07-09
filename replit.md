# Jay's Frames - AI-Powered Frame Shop Management System

## Overview

Jay's Frames is a comprehensive frame shop management system that combines traditional craftsmanship with modern AI-powered workflow optimization. This full-stack application serves as a production management hub for custom framing orders, featuring real-time collaboration, intelligent workload analysis, and customer self-service capabilities.

The system is designed to handle the complete lifecycle of custom frame orders, from initial customer contact through final pickup, with built-in AI assistance for workflow optimization and bottleneck detection.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with custom shadcn/ui components
- **State Management**: Zustand for client-side state, TanStack Query for server state
- **Animation**: Framer Motion for enhanced user interactions
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based with bcrypt password hashing
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket for live updates
- **File Handling**: Multer for image uploads and artwork management

### Database Design
- **Primary Database**: PostgreSQL 16 (Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Key Entities**: Users, Customers, Orders, Materials, Status History, Time Entries
- **Session Storage**: PostgreSQL-backed express sessions

## Key Components

### 1. Kanban Workflow System
The core workflow spans 9 distinct stages:
- **Order Processed**: Initial order entry and validation
- **Materials Ordered**: Required materials identified and ordered
- **Materials Arrived**: Inventory confirmed and available
- **Frame Cut**: Frame components prepared and cut
- **Mat Cut**: Mat boards cut to specifications
- **Prepped**: All components assembled and ready
- **Completed**: Final quality check passed
- **Picked Up**: Customer collection confirmed
- **Mystery Unclaimed**: Special category for unclaimed mystery items

### 2. AI Assistant Integration
- **Workload Analysis**: Intelligent assessment of shop capacity and bottlenecks
- **Multiple AI Providers**: OpenAI, Anthropic Claude, and Perplexity support
- **Contextual Recommendations**: AI suggestions based on current shop status
- **Learning System**: Adaptive AI that learns from shop patterns and outcomes

### 3. Customer Management
- **Self-Service Portal**: Customers can track orders using tracking IDs
- **Contact Management**: Phone, email, and address information
- **Order History**: Complete customer interaction timeline
- **Preference Tracking**: Customer material and style preferences

### 4. Material and Vendor Integration
- **Vendor Order Generation**: Automated purchase order creation
- **Material Tracking**: Inventory management and arrival notifications
- **Cost Analysis**: Material cost tracking and profit margin analysis
- **Supplier Coordination**: Multi-vendor order consolidation

## Data Flow

### Order Processing Flow
1. **Order Creation**: Customer details and requirements captured
2. **AI Analysis**: Workload impact and resource requirements assessed
3. **Material Planning**: Required materials identified and vendor orders generated
4. **Production Tracking**: Real-time status updates through workflow stages
5. **Customer Notification**: Automated updates via email/SMS
6. **Completion Tracking**: Quality control and pickup coordination

### Real-time Updates
- **WebSocket Communication**: Live status changes across all connected clients
- **Event Broadcasting**: Order updates, priority changes, and alerts
- **Collaborative Features**: Multiple users can work simultaneously
- **Push Notifications**: Critical alerts and customer communications

### Data Import System
The system includes multiple import mechanisms for production data:
- **TSV File Processing**: Bulk order import from existing systems
- **Customer Migration**: Existing customer database integration
- **Material Catalog Import**: Vendor material catalogs and pricing
- **Authentic Data Processing**: Real production order history integration

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database hosting
- **Connection Pooling**: @neondatabase/serverless for efficient connections

### AI Services
- **OpenAI GPT**: Primary AI analysis and recommendations
- **Anthropic Claude**: Alternative AI provider for enhanced responses
- **Perplexity**: Specialized AI for research and complex queries

### Communication Services
- **SendGrid**: Email notification delivery
- **SMS Integration**: Customer status update notifications
- **Real-time Sync**: WebSocket-based live updates

### UI Framework
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Consistent iconography
- **Tailwind CSS**: Utility-first styling framework

## Deployment Strategy

### Development Environment
- **Replit Infrastructure**: Integrated development and hosting
- **Hot Reload**: Vite development server with instant updates
- **Database Provisioning**: Automatic PostgreSQL setup
- **Environment Configuration**: Seamless development-to-production workflow

### Production Deployment
- **Autoscale Deployment**: Replit autoscale deployment target
- **Build Process**: Vite production build with server-side rendering
- **Port Configuration**: Port 5000 internal, Port 80 external
- **Static Asset Serving**: Express static file serving for uploads

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Token signing secret
- `SESSION_SECRET`: Session encryption key
- `OPENAI_API_KEY`: AI service authentication
- `ANTHROPIC_API_KEY`: Alternative AI provider
- `SENDGRID_API_KEY`: Email service authentication

## Recent Changes

- July 9, 2025: Implemented comprehensive stability infrastructure for production resilience
  - Added comprehensive logging system with structured output and file rotation
  - Implemented circuit breaker pattern for all external service integrations
  - Created retry logic with exponential backoff for transient failures
  - Built database transaction wrapper with Drizzle ORM for data consistency
  - Developed health check system monitoring all critical services
  - Enhanced API service wrappers with fallback mechanisms
  - Implemented React Error Boundaries to prevent frontend cascading failures
  - Added specialized error boundaries for frame catalogs, pricing engine, and inventory
  - Created comprehensive health check endpoint at /api/health
  - Added deployment fixes documentation for future reference

- July 4, 2025: Fixed deployment issues and implemented robust build system
  - Created fallback build system to handle complex Vite build timeouts
  - Fixed CSS compilation errors with Tailwind @apply directives
  - Added proper build directory structure (dist/public/) for deployment
  - Implemented graceful error handling for missing build dependencies
  - Created deploy-build.js script with intelligent timeout management
  - Verified server configuration for Cloud Run deployment (0.0.0.0:5000)
  - Added comprehensive build verification and fallback mechanisms
  - Fixed static file serving paths for production deployment

- December 17, 2024: Enhanced confetti celebration system with performance tracking
  - Added sparkly confetti burst animation with multiple colorful particle bursts
  - Implemented comprehensive performance tracking (daily, total, and streak statistics)
  - Created achievement system with unlockable milestones and progress bars
  - Added Team Stats dashboard showing completion metrics and achievements
  - Enhanced completion celebrations with randomized congratulatory messages
  - Fixed database constraint error preventing order status updates
  - Fixed critical order creation bug by adding proper ID generation to createOrder method

## Changelog

- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.