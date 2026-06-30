# CrownCo Frontend

This directory contains all frontend applications for the CrownCo CRM system. The frontend is built using **Next.js 16** with **React 19** and **TypeScript**, providing a modern, responsive, and performant user experience.

## 📁 Directory Structure

```
Frontend/
├── crownco-manager-frontend/        # Manager dashboard and analytics
├── crownco-pre-to-sales-frontend/   # Unified Pre-to-Sales interface
├── crownco-presales-frontend/       # Presales team interface
├── crownco-sales-frontend/          # Sales team interface
└── readme.md                        # This file
```

## 🎯 Frontend Applications

### 1. **Manager Frontend** (`crownco-manager-frontend/`)
**Purpose**: Dashboard and analytics for managers and team leads

**Key Features**:
- Employee management and team oversight
- Lead routing configuration
- Performance overview and analytics
- Team performance tracking
- Dashboard with KPIs and metrics

**Tech Stack**:
- Next.js 16 with App Router
- React 19 + TypeScript
- Tailwind CSS 4
- Redux Toolkit for state management

---

### 2. **Pre-to-Sales Frontend** (`crownco-pre-to-sales-frontend/`)
**Purpose**: Unified interface for sales executives handling both Pre-Sales and Sales workflows

**Key Features**:
- **Unified Lead Pipeline**: Continuous journey from Pre-Sales to Sales
- **Lead Management**: Qualification, communication, follow-ups
- **Site Visit Planning**: Scheduling and tracking
- **Negotiation Management**: Price discussions and unit selection
- **Quotation System**: Create, share, and manage quotations
- **Booking Management**: Finalize bookings with document upload
- **Project Inventory**: Browse projects and available units
- **Dashboard Analytics**: KPIs, pipeline visualization, leaderboard

**Philosophy**: 
- One lead, one continuous journey
- Context preservation across all stages
- Unified experience for seamless workflow

**See**: [Pre-to-Sales Overview](./crownco-pre-to-sales-frontend/Pre-to-Sales-Overview.md) for detailed documentation

---

### 3. **Presales Frontend** (`crownco-presales-frontend/`)
**Purpose**: Dedicated interface for presales team operations

**Key Features**:
- Lead qualification and management
- Call and communication tracking
- Follow-up scheduling
- Site visit coordination
- Lead nurturing workflows

---

### 4. **Sales Frontend** (`crownco-sales-frontend/`)
**Purpose**: Dedicated interface for sales team operations

**Key Features**:
- Lead negotiation and pricing
- Quotation creation and management
- Booking finalization
- Document management
- Project inventory access
- Sales pipeline tracking

**Improvements**: See [Improvements Summary](./crownco-sales-frontend/IMPROVEMENTS_SUMMARY.md) for recent enhancements

---

## 🛠️ Tech Stack

### Core Technologies
- **Next.js 16.1.1** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first CSS framework

### UI Libraries
- **Phosphor React** - Icon library
- **Lucide React** - Additional icons
- **Recharts** - Chart and visualization library
- **Chart.js** - Alternative charting solution

### State Management
- **Redux Toolkit** - Global state management
- **React Redux** - Redux bindings
- **React Context API** - Lightweight state sharing

### Utilities
- **date-fns** - Date formatting and manipulation
- **use-debounce** - Search debouncing
- **sonner** - Toast notifications

---

## 🏗️ Architecture Overview

### Application Structure

Each frontend application follows a similar structure:

```
app-name/
├── my-app/                    # Next.js application
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/        # Reusable components
│   │   │   └── ui/          # UI component library
│   │   ├── constants/        # Application constants
│   │   ├── contexts/         # React contexts
│   │   ├── store/            # Redux store
│   │   └── features/         # Feature modules
│   ├── public/               # Static assets
│   ├── package.json
│   └── tsconfig.json
├── html/                      # HTML mockups (if applicable)
└── README.md                  # Application-specific docs
```

### Design Principles

1. **Component Reusability**: Shared UI components across applications
2. **Type Safety**: Full TypeScript coverage
3. **Responsive Design**: Mobile-first approach
4. **Performance**: Optimized with memoization and code splitting
5. **Accessibility**: ARIA labels and keyboard navigation
6. **Error Handling**: Error boundaries and graceful error states

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Setup Instructions

1. **Navigate to the application directory**:
   ```bash
   cd crownco-pre-to-sales-frontend  # or any other app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## 📱 Features Overview

### Common Features Across Applications

- **Dashboard Analytics**: KPIs, charts, and performance metrics
- **Lead Management**: CRUD operations, filtering, search
- **Communication Tracking**: Call history, chat logs
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Real-time Updates**: Live data synchronization (when backend integrated)
- **Export Functionality**: CSV/Excel export for reports

### Application-Specific Features

| Feature | Manager | Pre-to-Sales | Presales | Sales |
|---------|---------|--------------|----------|-------|
| Team Management | ✅ | ❌ | ❌ | ❌ |
| Lead Routing | ✅ | ❌ | ❌ | ❌ |
| Unified Pipeline | ❌ | ✅ | ❌ | ❌ |
| Quotation System | ❌ | ✅ | ❌ | ✅ |
| Booking Management | ❌ | ✅ | ❌ | ✅ |
| Site Visit Planning | ❌ | ✅ | ✅ | ❌ |
| Negotiation | ❌ | ✅ | ❌ | ✅ |

---

## 🔗 Integration with Backend

### API Integration Status

Currently, frontend applications use:
- **Local State**: Component state and Redux for UI state
- **LocalStorage**: Temporary data persistence
- **Mock Data**: For development and testing

**Future Integration**:
- RESTful API endpoints from Backend services
- Real-time WebSocket connections
- Authentication and authorization
- File upload to cloud storage

### Expected API Structure

```typescript
// Example API endpoints
GET    /api/leads              // List leads okkkkkk
GET    /api/leads/:id         // Get lead details
POST   /api/leads             // Create lead
PUT    /api/leads/:id         // Update lead
GET    /api/dashboard/stats   // Dashboard KPIs
GET    /api/quotations        // List quotations
POST   /api/quotations        // Create quotation
```

See [Backend API Services Summary](../Backend/API_SERVICES_SUMMARY.md) for complete API documentation.

---

## 📝 Development Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting with Next.js config
- **Prettier**: Code formatting
- **Component Structure**: Functional components with hooks
- **File Naming**: PascalCase for components, camelCase for utilities

### Best Practices
- **Context Preservation**: Never lose lead history during updates
- **Performance**: Use memoization for expensive computations
- **Accessibility**: Include ARIA labels and keyboard navigation
- **Error Handling**: Implement error boundaries
- **Responsive Design**: Test on multiple screen sizes

### Component Organization
```
components/
├── ui/                    # Reusable UI components
│   ├── Button.tsx
│   ├── DataTable.tsx
│   ├── KPI.tsx
│   └── ...
├── Sidebar.tsx            # Layout components
├── Topbar.tsx
└── ErrorBoundary.tsx      # Error handling
```

---

## 🧪 Testing

### Current Status
- Manual testing during development
- Browser testing on Chrome, Firefox, Safari

### Future Testing Strategy
- Unit tests with Jest and React Testing Library
- Integration tests for workflows
- E2E tests with Playwright or Cypress
- Visual regression testing

---

## 📦 Deployment

### Vercel Deployment
Each application can be deployed independently to Vercel:

1. Connect repository to Vercel
2. Configure build settings
3. Set environment variables
4. Deploy

**Note**: Vercel tokens are stored in application directories (for CI/CD)

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.crownco.com
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## 🔄 Version Control

### Git Workflow
- **Main Branch**: Production-ready code
- **Feature Branches**: New features and improvements
- **Development Branch**: Integration testing

### Commit Guidelines
- Use descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic

---

## 📚 Documentation

### Application-Specific Docs
- [Pre-to-Sales Overview](./crownco-pre-to-sales-frontend/Pre-to-Sales-Overview.md)
- [Sales Improvements Summary](./crownco-sales-frontend/IMPROVEMENTS_SUMMARY.md)
- Individual README files in each application directory

### Related Documentation
- [Backend API Documentation](../Backend/API_SERVICES_SUMMARY.md)
- [Database Schema](../Backend/Database/README.md)

---

## 🐛 Known Issues & Future Improvements

### Current Limitations
- Backend API integration pending
- Some features use mock data
- Real-time updates not yet implemented
- Advanced analytics features in development

### Planned Enhancements
- Complete backend integration
- Real-time WebSocket connections
- Advanced filtering and search
- Dark mode support
- Mobile app (React Native)
- Performance optimizations
- Enhanced accessibility features

---

## 👥 Team & Support

### Development Team
- Frontend developers working on Next.js applications
- UI/UX designers for design system
- QA team for testing

### Getting Help
- Check application-specific README files
- Review component documentation
- Consult Backend API documentation
- Contact development team

---

## 📄 License

[Add license information if applicable]

---

## 🎯 Quick Links

- [Backend Services](../Backend/)
- [Database Schema](../Backend/Database/)
- [Infrastructure](../Infra/)
- [Project Root](../)

---

**Last Updated**: [Current Date]  
**Framework**: Next.js 16 (App Router)  
**Language**: TypeScript + React 19  
**Status**: Active Development