# PROJECT OVERVIEW - CrownCo Unified Pre-Sales & Sales Frontend

## 📖 Table of Contents
1. [What is This Project?](#what-is-this-project)
2. [Core Philosophy](#core-philosophy)
3. [Who Uses This System?](#who-uses-this-system)
4. [Complete Customer Journey](#complete-customer-journey)
5. [System Architecture](#system-architecture)
6. [Page Structure & Navigation](#page-structure--navigation)
7. [Tech Stack](#tech-stack)
8. [Project Structure](#project-structure)
9. [Data Flow & State Management](#data-flow--state-management)
10. [Key Features](#key-features)
11. [Workflow Examples](#workflow-examples)
12. [Development Guidelines](#development-guidelines)
13. [Getting Started](#getting-started)

---

## 🎯 What is This Project?

**CrownCo Pre-to-Sales Frontend** ek **unified real-estate management system** hai jo ek hi person ko **Pre-Sales se Sales tak** ka complete workflow provide karta hai. 

### Simple Explanation

Imagine ek real estate company jahan:
- **Pre-Sales Team**: Leads ko call karti hai, qualify karti hai, site visits schedule karti hai
- **Sales Team**: Negotiation handle karti hai, quotations banati hai, bookings finalize karti hai

**Lekin is system mein:**
- ✅ **Ek hi person** dono kaam karta hai
- ✅ **Ek hi lead** Pre-Sales se Sales tak journey karta hai
- ✅ **Context kabhi lost nahi hota** - har step ki history save rahti hai
- ✅ **System unified hai** - do alag tools nahi, ek continuous pipeline

### Real-World Example

**Scenario**: Rajesh Kumar naam ka ek customer property dhundh raha hai

1. **Day 1 (Pre-Sales)**: 
   - Lead entry hui website se
   - Sales executive ne call kiya
   - Qualification complete ki
   - Follow-up schedule kiya

2. **Day 3 (Pre-Sales)**:
   - Follow-up complete kiya
   - Site visit schedule ki "Maaz Palace" project ke liye
   - Visit complete ki

3. **Day 5 (Sales Transition)**:
   - Lead automatically "Negotiation" stage par move hua
   - Price discuss ki
   - Unit select kiya (Wing A, Flat 301)

4. **Day 7 (Sales)**:
   - Quotation create kiya
   - Customer ko share kiya
   - Booking finalize ki
   - Documents upload kiye

**Key Point**: Har step par previous steps ki history visible thi. System ne context preserve kiya.

---

## 🧩 Core Philosophy

### The Fundamental Idea

**Ye system ek continuous pipeline hai, do alag tools nahi.**

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIFIED LEAD PIPELINE                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Lead Entry → Pre-Sales → Site Visit → Sales → Booking       │
│      ↓            ↓            ↓         ↓         ↓          │
│   Context     Context     Context   Context   Context        │
│   (Accumulates, Never Resets)                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Lead is the Central Object**
   - Har lead ek unique entity hai
   - Lead evolve hota hai, restart nahi hota
   - Pre-Sales aur Sales dono same lead ko track karte hain

2. **Context Preservation**
   - Har stage ki history save rahti hai
   - Previous steps always accessible hain
   - Data duplicate nahi hota

3. **Unified Experience**
   - Ek hi UI, different views
   - Same data model, different workflows
   - Role-aware but data-shared

4. **Continuous Journey**
   - Stage transitions smooth hain
   - No data loss during transitions
   - Full visibility across stages

### Mental Model

**Think of it like a story:**
- Lead = Main character
- Pre-Sales = Chapter 1-3 (Introduction, Development)
- Sales = Chapter 4-6 (Climax, Resolution)
- System = Complete book (all chapters connected)

**Not like:**
- ❌ Two separate books (Pre-Sales book + Sales book)
- ❌ Two different characters (Pre-Sales lead + Sales lead)
- ❌ Lost chapters (context lost during transition)

---

## 👥 Who Uses This System?

### Primary User: Unified Sales Executive

**Ek hi person dono roles handle karta hai:**

**As Pre-Sales Executive:**
- ✅ Leads ko call karta hai
- ✅ Qualification karta hai
- ✅ Follow-ups schedule karta hai
- ✅ Site visits plan karta hai
- ✅ Remarks add karta hai

**As Sales Executive:**
- ✅ Negotiation handle karta hai
- ✅ Quotations create karta hai
- ✅ Bookings finalize karta hai
- ✅ Documents manage karta hai

**Why This Matters:**
- Same person ko complete context milta hai
- No handoff issues
- Better customer relationship
- Faster decision making

### Secondary Users

**Team Leads/Managers:**
- Dashboard analytics dekhne ke liye
- Team performance monitor karne ke liye
- KPIs track karne ke liye
- Pipeline analysis karne ke liye

**Admin/HR:**
- Settings configure karne ke liye
- Team management ke liye
- User permissions set karne ke liye

### User Perspective

**Same Lead, Different Views:**

| User Type | What They See | Why They Need It |
|-----------|---------------|------------------|
| **Pre-Sales Executive** | Call history, remarks, follow-ups, visit readiness | To qualify and nurture leads |
| **Sales Executive** | Project inventory, units, pricing, quotations | To close deals and finalize bookings |
| **Manager** | KPIs, pipeline, conversion rates, team performance | To monitor and optimize operations |

**Important**: UI role-aware feel karega, but data **shared aur continuous** rahega.

---

## 🔄 Complete Customer Journey

### Stage-by-Stage Breakdown

#### **Stage 1: Lead Entry & Qualification (Pre-Sales)**

**Location**: `/caller/lead-list` → `/caller/lead-list/lead-detail/qualification`

**What Happens:**
1. Lead system mein entry hoti hai (Website, Walking, Assigned, Portals se)
2. Sales executive lead ko call karta hai
3. Call recording review hota hai
4. Remarks add kiye jaate hain
5. Lead card create/update hota hai
6. Decision: **Rejected** ya **Qualified**

**Key Features:**
- Call recording playback
- Remarks input with suggestions
- Lead card creation form
- Reject/Qualify actions

**Data Captured:**
- Lead contact information
- Source (Website, Walking, etc.)
- Initial remarks
- Qualification status
- Call recordings

---

#### **Stage 2: Communication & Follow-ups (Pre-Sales)**

**Location**: `/caller/lead-list/lead-detail/caller/overview`

**What Happens:**
1. Lead profile card dikhta hai
2. "Call Now" aur "Chat Now" buttons available hain
3. Recent calls aur chats history visible hai
4. Remarks list dikhta hai with input field
5. Follow-ups schedule kiye jaate hain
6. Decision: **Rejected** ya **Approved** (moves to Site Visit)

**Key Features:**
- Lead profile card
- Call/chat history timeline
- Remarks section with suggestions
- Follow-up scheduling
- Follow-up status tracking (Pending/Completed/Missed)

**Data Captured:**
- All call history
- Chat conversations
- All remarks
- Follow-up schedules
- Communication preferences

---

#### **Stage 3: Site Visit Planning (Pre-Sales → Sales Transition)**

**Location**: `/caller/lead-list/lead-detail/site-visit/overview`

**What Happens:**
1. Property visit schedule hoti hai
2. Visit details add hote hain (date, time, property)
3. Visit completion track hoti hai
4. Revisit scheduling available hai
5. **Transition Point**: Yahan se Sales phase start hota hai

**Key Features:**
- Visit scheduling form
- Visit completion tracking
- Revisit scheduling
- Visit remarks
- Property selection

**Data Captured:**
- Visit dates and times
- Property details
- Visit status (Pending/Completed/Revisit)
- Visit remarks
- Property preferences

**Critical Transition:**
- Jab visit complete hoti hai, lead automatically "Negotiation" stage par move hota hai
- **Context Preserved**: Pre-Sales ki saari history yahan se Sales tak carry hoti hai

---

#### **Stage 4: Negotiation & Unit Selection (Sales)**

**Location**: `/caller/lead-list/lead-detail/negotiation/overview`

**What Happens:**
1. Price breakdown discussion hoti hai
2. Unit selection hota hai (wing, flat number, floor)
3. Amenities select kiye jaate hain (base + extra)
4. Price negotiation track hoti hai
5. Final pricing decide hoti hai

**Key Features:**
- Price breakdown calculator
- Unit selection interface
- Amenities selection
- Negotiation history
- Price comparison

**Data Captured:**
- Selected unit details
- Price breakdown
- Amenities selected
- Negotiation notes
- Final agreed price

**Context Visibility:**
- Pre-Sales ki saari history (calls, remarks, visits) yahan visible rahegi
- User ko pata hoga ki lead kahan se aaya hai

---

#### **Stage 5: Quotation Creation (Sales)**

**Location**: `/quotation`

**What Happens:**
1. Quotation create hota hai
2. Project select hota hai
3. Flat details add hote hain (wing, flat no, floor)
4. Price breakdown finalize hoti hai
5. Customer info add hoti hai
6. Status set hota hai (Draft/Pending/Approved)
7. Share hota hai (copy link, email) ya export hota hai (CSV)

**Key Features:**
- Quotation creation form
- Project selection
- Unit allocation
- Price breakdown
- Status management
- Share functionality (link, email)
- Export to CSV

**Data Captured:**
- Quotation details
- Linked lead ID (important!)
- Project and unit information
- Price breakdown
- Customer information
- Status and dates

**Critical Link:**
- Har quotation **lead ID** se linked hota hai
- Quotation detail page par lead ki complete history visible hogi

---

#### **Stage 6: Booking & Documentation (Sales)**

**Location**: `/caller/lead-list/lead-detail/booking/overview`

**What Happens:**
1. Final booking confirmation hoti hai
2. Documents upload hote hain (agreements, IDs, etc.)
3. Payment tracking hoti hai
4. Booking status manage hota hai
5. Completion process finish hota hai

**Key Features:**
- Booking confirmation
- Document upload interface
- Payment tracking
- Status management
- Completion workflow

**Data Captured:**
- Booking details
- Uploaded documents
- Payment information
- Booking status
- Completion date

**Complete Journey Visible:**
- Booking page par lead ki **complete journey** visible hogi:
  - Initial qualification
  - All calls and chats
  - Site visits
  - Negotiation details
  - Quotation history
  - Final booking

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                          │
│  (Next.js 16 + React 19 + TypeScript)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Dashboard   │  │  Lead List    │  │  Quotation    │   │
│  │   (Unified)  │  │  (Pre-Sales)  │  │   (Sales)     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │  Lead Object  │                       │
│                    │  (Central)     │                       │
│                    │                │                       │
│                    │  - Pre-Sales  │                       │
│                    │    History    │                       │
│                    │  - Sales      │                       │
│                    │    History    │                       │
│                    │  - Complete   │                       │
│                    │    Context    │                       │
│                    └───────┬────────┘                       │
│                            │                                │
├────────────────────────────┼────────────────────────────────┤
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │  State Mgmt    │                       │
│                    │  - Redux       │                       │
│                    │  - Context     │                       │
│                    │  - LocalState  │                       │
│                    └───────┬────────┘                       │
│                            │                                │
├────────────────────────────┼────────────────────────────────┤
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │  Data Layer   │                       │
│                    │  - LocalStorage│                       │
│                    │  - Mock Data  │                       │
│                    │  - (Future:    │                       │
│                    │     API Calls) │                       │
│                    └────────────────┘                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
RootLayout
├── Providers (Redux + Context)
├── Sidebar (Navigation)
├── Topbar (Header)
└── Page Content
    ├── Dashboard
    │   ├── KPI Cards
    │   ├── Pipeline Graph
    │   ├── Bar Chart
    │   └── Tabbed Tables
    ├── Lead List
    │   ├── Filters
    │   ├── Tabs (Qualified/Sources/Bulk)
    │   └── Data Table / Cards
    ├── Lead Detail
    │   ├── Stepper (Qualification → Communication → Site Visit → Negotiation → Booking)
    │   ├── Qualification Page
    │   ├── Caller Overview
    │   ├── Site Visit
    │   ├── Negotiation
    │   └── Booking
    ├── Project Inventory
    │   ├── Project Cards
    │   └── Project Detail
    └── Quotation
        ├── Quotation List
        └── Quotation Detail
```

---

## 📱 Page Structure & Navigation

### Complete Route Map

```
/ (Root)
  └── Redirects to /caller/dashboard

/caller/dashboard
  └── Unified dashboard
      ├── KPI Cards (My Leads, Visits, Bookings, etc.)
      ├── Lead Pipeline Graph
      ├── Leads & Calls Bar Chart
      ├── Activities Tabbed Table (Priorities, Follow-ups, Visits)
      └── Performance Tabbed Table
          ├── Top Projects Tab (8 projects with visits, revisits, bookings, conversion)
          └── Top Performers Tab (Leaderboard with points and rankings)

/caller/lead-list
  ├── Lead List Page
  │   ├── Performance Summary KPIs
  │   ├── Filter Bar (Status, Source, Budget, Date, Project, Stage)
  │   ├── Tabs: Qualified / Sources / Bulk Data
  │   ├── Views: Cards (Mobile) / Table (Desktop)
  │   ├── Actions: Search, Filter, Export, Refresh, Delete
  │   │
  │   ├── /chat-now/          # (Future - Chat interface)
  │   └── /rejected-form/      # (Future - Rejected leads form)
  │
  └── /lead-detail/
      ├── Layout (Stepper: Qualification → Communication → Site Visit → Negotiation → Booking)
      │
      ├── /qualification
      │   └── Qualification Page
      │       ├── Call Recording
      │       ├── Remarks Section
      │       ├── Create Lead Card
      │       └── Actions: Rejected / Qualified
      │
      ├── /caller/overview
      │   └── Caller Overview Page
      │       ├── Lead Profile Card
      │       ├── Call Now / Chat Now Buttons
      │       ├── Recent Calls & Chats
      │       ├── Remarks List + Input
      │       ├── Tabs: Overview / Follow Ups
      │       └── Actions: Rejected / Approved
      │
      ├── /site-visit/overview
      │   └── Site Visit Page
      │       ├── Visit Scheduling
      │       ├── Visit History
      │       ├── Visit Details
      │       └── Revisit Scheduling
      │
      ├── /negotiation/overview
      │   └── Negotiation Page
      │       ├── Price Breakdown
      │       ├── Unit Selection
      │       ├── Amenities Selection
      │       └── Negotiation History
      │
      └── /booking/overview
          └── Booking Page
              ├── Booking Confirmation
              ├── Document Upload
              ├── Payment Tracking
              └── Complete Journey View

/caller/project-inventory
  ├── Project List Page
  │   ├── KPI Section (Active Projects, Units, Status)
  │   ├── Filter Bar (Project Name, Status, Budget)
  │   ├── Tabs: My Projects / All Projects
  │   ├── Project Cards Grid
  │   └── Pagination
  │
  └── /project-inventory-detail
      └── Project Detail Page
          ├── Project Info
          ├── Available Units Grid
          ├── Unit Selection
          ├── Project Amenities
          ├── Gallery Images
          └── Lead Sources Breakdown (Pie Chart)

/quotation
  ├── Quotation List Page
  │   ├── KPI Section (Total, Value, This Month, Status)
  │   ├── Filter Bar (Date, Project, Search)
  │   ├── Tabs: All / Approved / Pending / Draft
  │   ├── View Modes: Grid / List
  │   ├── Actions: Create, Edit, Share, Export, Delete
  │   └── Quotation Cards / Rows
  │
  └── /quotation-detail
      └── Quotation Detail Page
          ├── Quotation Info
          ├── Linked Lead History
          ├── Price Breakdown
          ├── Unit Details
          └── Status Management

/project-detail          # (Future - Placeholder)
/settings                # (Future - Placeholder)
/profile                 # (Future - Placeholder)
/hr-module               # (Future - Placeholder)
```

### Navigation Flow Example

**Complete Lead Journey Navigation:**

```
1. Dashboard (/caller/dashboard)
   └── Sees "My Leads: 128"
   
2. Lead List (/caller/lead-list)
   └── Filters by "New Leads Today"
   └── Selects "Rajesh Kumar" lead
   
3. Qualification (/caller/lead-list/lead-detail/qualification)
   └── Reviews call recording
   └── Adds remarks
   └── Clicks "Qualified"
   
4. Caller Overview (/caller/lead-list/lead-detail/caller/overview)
   └── Makes 3 calls
   └── Schedules 2 follow-ups
   └── Clicks "Approved"
   
5. Site Visit (/caller/lead-list/lead-detail/site-visit/overview)
   └── Schedules visit for "Maaz Palace"
   └── Completes visit
   └── System auto-transitions to Negotiation
   
6. Negotiation (/caller/lead-list/lead-detail/negotiation/overview)
   └── Selects unit (Wing A, Flat 301)
   └── Discusses price
   └── Finalizes pricing
   
7. Quotation (/quotation)
   └── Creates quotation
   └── Links to lead
   └── Shares with customer
   
8. Booking (/caller/lead-list/lead-detail/booking/overview)
   └── Confirms booking
   └── Uploads documents
   └── Completes booking
```

**Key Point**: Har step par user ko pata hota hai ki lead kahan hai aur previous steps ki history visible hoti hai.

---

## 🛠️ Tech Stack

### Frontend Framework
- **Next.js 16.1.1**
  - App Router (not Pages Router)
  - Server Components support
  - Built-in routing
  - Image optimization
  - Font optimization

- **React 19.2.3**
  - Latest React version
  - Hooks (useState, useEffect, useMemo, useCallback)
  - Component composition

- **TypeScript 5**
  - Type safety
  - Better IDE support
  - Compile-time error checking

### UI Libraries & Styling
- **Tailwind CSS 4**
  - Utility-first CSS framework
  - Responsive design
  - Custom CSS variables
  - PostCSS processing

- **Phosphor React 1.4.1**
  - Icon library
  - Consistent icon set

- **Lucide React 0.469.0**
  - Additional icons
  - Modern icon design

- **Recharts 3.6.0**
  - Chart library
  - Bar charts
  - Pie charts
  - Pipeline graphs

### State Management
- **Redux Toolkit 2.11.2**
  - Global state management
  - Simplified Redux
  - Built-in best practices

- **React Redux 9.2.0**
  - Redux bindings for React
  - Hooks support

- **React Context API**
  - SidebarContext for mobile menu
  - Lightweight state sharing

### Utilities
- **date-fns 4.1.0**
  - Date formatting
  - Relative time (e.g., "2 days ago")
  - Date manipulation

- **use-debounce 10.0.6**
  - Search debouncing
  - Performance optimization

- **sonner 2.0.7**
  - Toast notifications
  - User feedback

### Development Tools
- **ESLint 9**
  - Code linting
  - Next.js config

- **Prettier 3.7.4**
  - Code formatting
  - Consistent style

- **PostCSS**
  - CSS processing
  - Tailwind compilation

---

## 📁 Project Structure

### Directory Tree

```
my-app/
├── public/                          # Static assets
│   ├── Crown co Logo.svg
│   ├── property-*.png
│   ├── Avatar_images*.png
│   └── pexels-*.jpg
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── page.tsx                 # Root (redirects to dashboard)
│   │   ├── layout.tsx               # Root layout
│   │   ├── providers.tsx            # Redux + Context providers
│   │   ├── globals.css              # Global styles
│   │   │
│   │   ├── caller/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx         # Unified dashboard
│   │   │   │
│   │   │   ├── lead-list/
│   │   │   │   ├── page.tsx         # Lead list page
│   │   │   │   ├── layout.tsx       # Lead detail wrapper (with Stepper)
│   │   │   │   ├── chat-now/       # (Future - Chat interface)
│   │   │   │   ├── rejected-form/  # (Future - Rejected leads form)
│   │   │   │   └── lead-detail/
│   │   │   │       ├── qualification/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── caller/
│   │   │   │       │   └── overview/
│   │   │   │       │       └── page.tsx
│   │   │   │       ├── site-visit/
│   │   │   │       │   └── overview/
│   │   │   │       │       └── page.tsx
│   │   │   │       ├── negotiation/
│   │   │   │       │   └── overview/
│   │   │   │       │       └── page.tsx
│   │   │   │       └── booking/
│   │   │   │           └── overview/
│   │   │   │               └── page.tsx
│   │   │   │
│   │   │   └── project-inventory/
│   │   │       ├── page.tsx
│   │   │       └── project-inventory-detail/
│   │   │           └── page.tsx
│   │   │
│   │   ├── quotation/
│   │   │   ├── page.tsx
│   │   │   └── quotation-detail/
│   │   │       └── page.tsx
│   │   │
│   │   ├── profile/                 # (Future)
│   │   ├── settings/                # (Future)
│   │   └── hr-module/               # (Future)
│   │
│   ├── components/                  # Reusable components
│   │   ├── Sidebar.tsx              # Navigation sidebar
│   │   ├── Topbar.tsx               # Top navigation bar
│   │   ├── ErrorBoundary.tsx        # Error handling
│   │   │
│   │   └── ui/                      # UI Component Library
│   │       ├── badges.tsx           # Status badges
│   │       ├── Button.tsx           # Button component
│   │       ├── DataTable.tsx        # Data table
│   │       ├── TabbedTable.tsx      # Tabbed table
│   │       ├── Tabs.tsx             # Tab component
│   │       ├── kpi.tsx              # KPI card
│   │       ├── barChart.tsx          # Bar chart
│   │       ├── pieChart.tsx          # Pie chart
│   │       ├── pipelineGraph.tsx    # Pipeline graph
│   │       ├── leaderboard.tsx       # Leaderboard
│   │       ├── scheduledVisits.tsx  # Scheduled visits
│   │       ├── FollowUpsList.tsx    # Follow-ups list
│   │       ├── PriorityList.tsx     # Priority list
│   │       ├── TopProjects.tsx      # Top projects
│   │       ├── EmptyState.tsx       # Empty state
│   │       ├── Stepper.tsx          # Multi-stage stepper component
│   │       │
│   │       └── cards/               # Card Components (to be created)
│   │           ├── priceBreakdownCard.tsx    # (Future - Price breakdown display)
│   │           ├── aminityCard.tsx           # (Future - Amenities display)
│   │           ├── downloadCard.tsx          # (Future - Document downloads)
│   │           └── propertyVisitCard.tsx    # (Future - Site visit details)
│   │
│   ├── constants/                   # Application Constants
│   │   ├── routes.ts               # Route definitions (centralized)
│   │   └── ui.ts                   # UI constants
│   │
│   ├── contexts/                    # React Contexts
│   │   └── SidebarContext.tsx       # Sidebar state
│   │
│   ├── store/                       # Redux Store
│   │   ├── store.ts                 # Store config
│   │   ├── hooks.ts                 # Typed hooks
│   │   └── features/                 # Redux slices
│   │       └── counter/
│   │           └── counterSlice.ts  # Example slice
│   │
│   └── features/                    # Feature modules
│       └── counter/
│           └── counterSlice.ts
│
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── next.config.ts                   # Next.js config
├── postcss.config.mjs               # PostCSS config
├── eslint.config.mjs                # ESLint config
└── README.md                        # Project README
```

### Key File Explanations

**`src/app/layout.tsx`**
- Root layout component
- Wraps entire app with Providers, Sidebar, Topbar
- Sets up global structure

**`src/app/providers.tsx`**
- Redux Provider
- SidebarContext Provider
- Toaster (notifications)

**`src/components/Sidebar.tsx`**
- Navigation sidebar
- Unified menu (Pre-Sales + Sales routes)
- Mobile responsive

**`src/components/ui/TabbedTable.tsx`**
- Flexible tabbed table component
- Used for Activities and Performance tables
- Reusable across pages

**`src/app/globals.css`**
- Global styles
- CSS variables (colors, spacing)
- Tailwind imports

---

## 🔄 Data Flow & State Management

### Current Data Storage

**1. Local Component State (`useState`)**
- Filters and search queries
- Pagination state
- UI flags (modals, drawers, tabs)
- Selected items

**2. Context API (`SidebarContext`)**
- Mobile menu open/close state
- Responsive behavior

**3. Redux Toolkit**
- Store configured but minimal usage
- Ready for global state expansion
- Typed hooks available

**4. LocalStorage**
- Quotations persistence (key: `crownco_quotations`)
- User preferences (future)

### Data Flow Pattern

```
User Action
    ↓
Component Event Handler
    ↓
State Update (useState/Redux)
    ↓
UI Re-render
    ↓
User Sees Updated UI
```

### Example: Lead Qualification Flow

```
1. User clicks "Qualified" button
   ↓
2. handleQualify() function called
   ↓
3. Lead status updated in local state
   ↓
4. Remarks saved to lead object
   ↓
5. Component re-renders with new status
   ↓
6. Navigation to next stage (Caller Overview)
   ↓
7. Previous stage data preserved in lead object
```

### Future API Integration

**Expected Flow:**
```
Component
    ↓
API Service Function
    ↓
HTTP Request (fetch/axios)
    ↓
Backend API
    ↓
Database
    ↓
Response
    ↓
State Update
    ↓
UI Re-render
```

**Expected API Structure:**
```typescript
// Lead APIs
GET    /api/leads              // Get all leads
GET    /api/leads/:id         // Get lead with full history
POST   /api/leads             // Create lead
PUT    /api/leads/:id         // Update lead (preserves history)
DELETE /api/leads/:id         // Delete lead

// Quotation APIs
GET    /api/quotations        // Get all quotations
POST   /api/quotations        // Create (requires leadId)
PUT    /api/quotations/:id    // Update
GET    /api/quotations/:id    // Get with linked lead history

// Dashboard APIs
GET    /api/dashboard/stats    // Unified KPIs
GET    /api/pipeline          // Pipeline data (all stages)
GET    /api/leaderboard       // Top performers
```

**Critical API Design:**
- Har API response mein lead ki **complete history** include hogi
- Lead update karte waqt **previous context preserve** hoga
- Quotation create karte waqt **leadId mandatory** hoga

---

## ✨ Key Features

### Pre-Sales Features

1. **Lead Management**
   - Lead intake from multiple sources
   - Lead filtering and search
   - Lead qualification workflow
   - Lead status tracking

2. **Communication Tracking**
   - Call history
   - Chat history
   - Remarks management
   - Communication timeline

3. **Follow-up Management**
   - Follow-up scheduling
   - Follow-up status tracking
   - Follow-up reminders
   - Missed follow-up alerts

4. **Site Visit Planning**
   - Visit scheduling
   - Visit completion tracking
   - Revisit scheduling
   - Visit remarks

### Sales Features

1. **Negotiation Management**
   - Price breakdown
   - Unit selection
   - Amenities selection
   - Negotiation history

2. **Quotation System**
   - Quotation creation
   - Quotation editing
   - Quotation sharing (link, email)
   - Quotation export (CSV)
   - Status management (Draft/Pending/Approved)

3. **Booking Management**
   - Booking confirmation
   - Document upload
   - Payment tracking
   - Booking status

4. **Project Inventory**
   - Project listing
   - Project details
   - Unit availability
   - Project filtering

### Unified Features

1. **Dashboard Analytics**
   - Unified KPIs (Pre-Sales + Sales)
   - Pipeline visualization
   - Performance metrics
   - **Top Projects Tab**: Shows 8 top performing projects with visits, revisits, bookings, and conversion rates
   - **Top Performers Tab**: Shows leaderboard with points and rankings (already implemented via `PerformanceTabbedTable`)

2. **Context Preservation**
   - Complete lead history
   - Stage transitions
   - Data continuity
   - No context loss

3. **Responsive Design**
   - Mobile support
   - Tablet support
   - Desktop support
   - Adaptive layouts

4. **Advanced Filtering**
   - Multi-criteria filtering
   - Search functionality
   - Date range filtering
   - Status filtering

5. **Export Functionality**
   - CSV export
   - Data download
   - Report generation

---

## 📋 Workflow Examples

### Example 1: Complete Lead Journey (Detailed)

**Day 1 - Morning (Pre-Sales):**

1. **Dashboard Check** (`/caller/dashboard`)
   - Sales executive opens dashboard
   - Sees "My Leads: 128"
   - Sees "New Leads Today: 5"
   - Clicks on Lead List

2. **Lead List** (`/caller/lead-list`)
   - Filters by "New Leads Today"
   - Sees 5 new leads
   - Selects "Rajesh Kumar" lead
   - Opens lead detail

3. **Qualification** (`/caller/lead-list/lead-detail/qualification`)
   - Reviews call recording (2 minutes)
   - Adds remark: "Interested in 2BHK, budget 50L-60L"
   - Creates lead card with details
   - Clicks "Qualified"
   - System moves to Caller Overview

**Day 1 - Afternoon (Pre-Sales):**

4. **Caller Overview** (`/caller/lead-list/lead-detail/caller/overview`)
   - Sees lead profile card
   - Clicks "Call Now" → Makes call
   - Adds remark: "Discussed Maaz Palace project"
   - Schedules follow-up for Day 3
   - Makes second call in evening
   - Clicks "Approved"
   - System moves to Site Visit

**Day 3 (Pre-Sales):**

5. **Follow-up** (`/caller/lead-list/lead-detail/caller/overview`)
   - Follow-up reminder shows up
   - Makes follow-up call
   - Customer shows interest
   - Marks follow-up as "Completed"

6. **Site Visit** (`/caller/lead-list/lead-detail/site-visit/overview`)
   - Schedules visit for "Maaz Palace" project
   - Date: Day 5, Time: 10:00 AM
   - Sends confirmation to customer

**Day 5 (Pre-Sales → Sales Transition):**

7. **Site Visit Completion** (`/caller/lead-list/lead-detail/site-visit/overview`)
   - Visit completed
   - Adds visit remarks: "Customer liked Wing A, Flat 301"
   - Customer shows strong interest
   - **System automatically transitions to Negotiation stage**

**Day 5 - Evening (Sales):**

8. **Negotiation** (`/caller/lead-list/lead-detail/negotiation/overview`)
   - Sees complete Pre-Sales history (calls, remarks, visits)
   - Selects unit: Wing A, Flat 301
   - Discusses price: Base 55L + Parking 5L = 60L
   - Selects amenities: Clubhouse, Gym, Pool
   - Finalizes pricing
   - Customer agrees to proceed

**Day 6 (Sales):**

9. **Quotation Creation** (`/quotation`)
   - Creates new quotation
   - Links to "Rajesh Kumar" lead (automatic)
   - Project: Maaz Palace
   - Unit: Wing A, Flat 301
   - Price: 60L (Base) + 5L (Parking) + 2L (Amenities) = 67L
   - Status: Draft
   - Saves quotation

10. **Quotation Review** (`/quotation/quotation-detail`)
    - Reviews quotation
    - Sees linked lead history
    - Updates status to "Pending"
    - Shares quotation link with customer

**Day 7 (Sales):**

11. **Customer Approval**
    - Customer approves quotation
    - Sales executive updates status to "Approved"

12. **Booking** (`/caller/lead-list/lead-detail/booking/overview`)
    - Opens booking page
    - Sees complete journey:
      - Qualification (Day 1)
      - All calls (Day 1, Day 3)
      - Site visit (Day 5)
      - Negotiation (Day 5)
      - Quotation (Day 6)
    - Confirms booking
    - Uploads documents:
      - Aadhar card
      - Agreement
      - Payment receipt
    - Completes booking

**Result**: Lead successfully converted from entry to booking with complete context preserved at every step.

---

### Example 2: Manager Dashboard Analysis

**Manager opens Dashboard** (`/caller/dashboard`)

**Sees KPIs:**
- My Leads: 128
- Property Visited: 45
- Booking: 23
- Conversion: 18.2%

**Analyzes Pipeline Graph:**
- New Leads: 128 (100%)
- Contacted: 98 (76.6%) ← Good
- Qualified: 75 (58.6%) ← Good
- Site Visit: 45 (35.2%) ← Good
- Negotiation: 32 (25.0%) ← **Bottleneck!**
- Booking: 23 (18.0%) ← Target

**Identifies Issue:**
- 32 leads "Negotiation" stage par stuck hain
- Conversion rate 18% hai (target 20%+)
- Negotiation se Booking tak drop-off high hai

**Takes Action:**
- Negotiation training organize karta hai
- Team ko negotiation best practices batata hai
- Follow-up process improve karta hai

**Result**: Next month conversion rate 20%+ ho jata hai.

---

## 🎨 Development Guidelines

### Code Organization Rules

1. **Component Structure**
   - Pages in `src/app/`
   - Reusable components in `src/components/ui/`
   - Feature-specific components in page directories
   - Keep components small and focused

2. **File Naming**
   - Components: PascalCase (e.g., `TabbedTable.tsx`)
   - Pages: lowercase (e.g., `page.tsx`)
   - Utilities: camelCase (e.g., `formatDate.ts`)

3. **State Management**
   - Local state for UI: `useState`
   - Shared state: Redux or Context
   - Form state: Component state or form library
   - Server state: Future API integration

### Context Preservation Rules

1. **Never Break Context**
   ```typescript
   // ✅ Good: Preserves history
   const updateLead = (leadId: string, updates: Partial<Lead>) => {
     const lead = leads.find(l => l.id === leadId);
     return {
       ...lead,
       ...updates,
       history: [...lead.history, { ...updates, timestamp: Date.now() }]
     };
   };

   // ❌ Bad: Loses history
   const updateLead = (leadId: string, updates: Partial<Lead>) => {
     return updates; // History lost!
   };
   ```

2. **Stage Transitions**
   ```typescript
   // ✅ Good: Transitions with context
   const moveToNextStage = (lead: Lead) => {
     return {
       ...lead,
       currentStage: getNextStage(lead.currentStage),
       stageHistory: [...lead.stageHistory, {
         from: lead.currentStage,
         to: getNextStage(lead.currentStage),
         timestamp: Date.now()
       }]
     };
   };
   ```

3. **Quotation Linking**
   ```typescript
   // ✅ Good: Always link to lead
   const createQuotation = (quotation: Quotation, leadId: string) => {
     return {
       ...quotation,
       leadId, // Mandatory!
       linkedLeadHistory: getLeadHistory(leadId) // Include history
     };
   };
   ```

### Performance Best Practices

1. **Memoization**
   ```typescript
   // ✅ Good: Memoize expensive computations
   const filteredLeads = useMemo(() => {
     return leads.filter(lead => 
       lead.status === filterStatus &&
       lead.source === filterSource
     );
   }, [leads, filterStatus, filterSource]);
   ```

2. **Debouncing**
   ```typescript
   // ✅ Good: Debounce search
   const debouncedSearch = useDebounce(searchQuery, 300);
   ```

3. **Pagination**
   ```typescript
   // ✅ Good: Paginate large lists
   const paginatedData = useMemo(() => {
     const start = (currentPage - 1) * itemsPerPage;
     return data.slice(start, start + itemsPerPage);
   }, [data, currentPage, itemsPerPage]);
   ```

### UI/UX Guidelines

1. **Responsive Design**
   - Mobile-first approach
   - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
   - Test on multiple devices

2. **Loading States**
   - Show loading spinners
   - Skeleton screens for better UX
   - Optimistic UI updates

3. **Error Handling**
   - Error boundaries for component errors
   - Toast notifications for user actions
   - Graceful error messages

4. **Accessibility**
   - Semantic HTML
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

---

## 🚀 Getting Started

### For New Developers

**Step 1: Setup Environment**
```bash
# Clone repository (if applicable)
git clone <repository-url>

# Navigate to project
cd my-app

# Install dependencies
npm install

# Run development server
npm run dev
```

**Step 2: Understand the Structure**
1. Read this overview document completely
2. Explore `src/app/layout.tsx` - Root structure
3. Check `src/components/Sidebar.tsx` - Navigation
4. Review `src/app/caller/dashboard/page.tsx` - Dashboard implementation

**Step 3: Key Concepts to Remember**
- **One Lead, One Journey**: Lead ek hi entity hai, stages change hote hain
- **Context Accumulates**: Har stage par context add hota hai, replace nahi hota
- **Unified System**: Pre-Sales aur Sales phases hain, separate systems nahi
- **Role-Aware UI**: Same data, different views based on role/stage

**Step 4: Development Workflow**
1. Create feature branch
2. Implement feature following guidelines
3. Test on multiple devices
4. Ensure context preservation
5. Submit for review

### For Project Managers

**Understanding the System:**
- Read "What is This Project?" section
- Review "Complete Customer Journey"
- Check "Workflow Examples"

**Key Metrics to Track:**
- Lead conversion rate (New → Booking)
- Stage-wise drop-off rates
- Average time per stage
- Team performance (leaderboard)
- Project performance (top projects)

### For Designers

**Design Principles:**
- Continuity: Show lead history at every stage
- Context: Previous steps always accessible
- Clarity: Clear stage indicators
- Consistency: Unified design language

**Key Screens:**
- Dashboard: Unified view of all stages
- Lead Detail: Show complete journey
- Quotation: Link to lead history
- Booking: Final journey summary

---

## 📝 Important Notes

### Current Implementation Status

✅ **Completed:**
- Dashboard with unified KPIs
- Lead list with filters
- Basic navigation structure
- UI component library
- Responsive design
- **Top Projects & Top Performers** (implemented in Dashboard via `PerformanceTabbedTable` component)

⏳ **In Progress:**
- Lead detail workflows
- Quotation management
- Project inventory

📋 **Planned:**
- Stepper component for lead detail pages (5 stages)
- Missing card components (priceBreakdownCard, aminityCard, downloadCard, propertyVisitCard)
- Constants folder (routes.ts, ui.ts)
- Chat interface route (`/caller/lead-list/chat-now/`)
- Rejected leads form route (`/caller/lead-list/rejected-form/`)
- Backend API integration
- Real-time updates
- Advanced analytics
- Mobile app

### Critical Reminders

1. **Always Preserve Context**
   - Never lose lead history
   - Always link quotations to leads
   - Maintain stage transitions

2. **Unified Data Model**
   - One lead object for entire journey
   - Pre-Sales and Sales data in same structure
   - No duplicate data

3. **User Experience**
   - Show where lead currently is
   - Make previous steps accessible
   - Provide clear navigation

4. **Performance**
   - Optimize for large datasets
   - Use pagination
   - Implement caching

---

## 🎯 One-Line Summary

**CrownCo Pre-to-Sales Frontend ek unified real-estate management system hai jahan Pre-Sales aur Sales ek hi continuous journey ke do phases hain, har decision lead ko center mein rakhta hai, aur har UI decision continuity, history, aur stage awareness preserve karta hai.**

---

## 📚 Additional Resources

### Related Documents
- Sales Project Overview (for Sales-specific details)
- Pre-Sales Project Overview (for Pre-Sales-specific details)
- API Documentation (when available)
- Component Library Documentation

### Key Contacts
- Development Team: [Contact Info]
- Project Manager: [Contact Info]
- Design Team: [Contact Info]

---

**Last Updated**: [Current Date]  
**Framework**: Next.js 16 (App Router)  
**Language**: TypeScript + React 19  
**Status**: Active Development  
**Philosophy**: One Lead, One Journey, Continuous Context

---

## 🔄 Version History

- **v1.0** - Initial overview document
  - Complete project structure
  - Unified Pre-Sales & Sales concept
  - Detailed workflows
  - Development guidelines

---

**Note for Developers**: Is document ko regularly update karte raho as project evolves. Har major change ke baad relevant sections update karo.

**Note for New Team Members**: Is document ko carefully padho before starting development. Ye document project ka complete mental model provide karta hai.

