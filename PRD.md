# Planning Guide

A premium digital platform that transforms traditional tailor shop operations into a modern, efficient, and customer-centric ecosystem with role-based access control, supporting seamless order tracking, staff coordination, and bilingual communication across Owner/Admin, Tailor, and Customer portals.

**Experience Qualities**: 
1. **Effortless** - Staff should complete common tasks (new order, status update) in under 30 seconds with minimal clicks
2. **Trustworthy** - Clear visual hierarchy and consistent patterns build confidence for non-technical users
3. **Responsive** - Instant feedback on every action with smooth transitions that feel natural and professional

**Complexity Level**: Complex Application (advanced functionality, accounts)
  - Multiple user roles (Owner/Admin, Tailor, Customer) with distinct permissions and dashboards, comprehensive order workflow management, real-time status tracking, bilingual support, secure authentication, and interconnected data relationships requiring sophisticated state management and persistence.

## Essential Features

### Authentication & Role-Based Access Control
- **Functionality**: Secure login system with three distinct user roles: Owner/Admin (full access), Tailor (restricted access), and Customer (personal data only)
- **Purpose**: Protect sensitive information and provide appropriate access levels for each user type
- **Trigger**: User opens application or session expires
- **Progression**: Enter Username & Password → Validate Credentials → Route to Role-Specific Dashboard
- **Success criteria**: Users can only access data and features appropriate to their role, session persists across page refreshes, default test accounts available for each role

### Owner/Admin Dashboard
- **Functionality**: Full access to all customers, orders, inventory, and tailors with complete CRUD operations; view analytics and manage all aspects of the shop
- **Purpose**: Enable complete business oversight and management for shop owners
- **Trigger**: Owner logs in with admin credentials
- **Progression**: Login → Dashboard Overview → Manage Customers/Orders/Inventory → Track Performance
- **Success criteria**: Owner can see all customer details including phone and address, create/edit/delete all records, view complete analytics, and manage inventory

### Tailor Dashboard
- **Functionality**: View assigned orders with customer name, gender, and measurements (no phone/address); update order status; edit measurement details for assigned orders; view personal workload statistics
- **Purpose**: Provide tailors with necessary work information while protecting customer privacy
- **Trigger**: Tailor logs in with tailor credentials
- **Progression**: Login → View Assigned Orders → Update Status/Measurements → Track Personal Progress
- **Success criteria**: Tailor sees only customer name and gender (no phone/place), can edit measurements on their orders, update order status from pending → in-progress → ready → delivered, view dashboard with pending/in-progress/ready/completed counts

### Customer Dashboard
- **Functionality**: View personal profile information, saved measurements, and order history with status tracking
- **Purpose**: Allow customers to track their orders and view their information without staff assistance
- **Trigger**: Customer logs in with customer credentials
- **Progression**: Login → View Profile → Check Measurements → Track Orders
- **Success criteria**: Customer can see their personal info, all saved measurements, order history with current status, assigned tailor name, and delivery dates

### Customer Profile Management
- **Functionality**: Create, view, edit customer profiles with personal details (name, phone, address, gender) and comprehensive measurements (Pant, Shirt, Coat, Blazer, Jocket, Sudhar, Kurta)
- **Purpose**: Centralize customer data for quick reuse and maintain measurement history
- **Trigger**: Staff clicks "Add Customer" or searches existing customer
- **Progression**: Click Add Customer → Fill form (name, phone, place, gender) → Add measurements → Save → View in customer list
- **Success criteria**: Customer appears in searchable list, measurements persist, can be recalled for new orders

### Order Creation & Assignment
- **Functionality**: Create orders with customer selection, measurements, fabric details, design notes, assign to tailor, set delivery date
- **Purpose**: Track work from intake to completion with clear ownership
- **Trigger**: Staff clicks "New Order" from dashboard or customer profile
- **Progression**: Select Customer → Confirm/Edit Measurements → Add Fabric & Design Notes → Assign Tailor → Set Delivery Date → Create Order
- **Success criteria**: Order appears in dashboard with "Pending" status, assigned tailor receives notification

### Order Status Workflow
- **Functionality**: Move orders through status pipeline: Pending → In Progress → Ready for Delivery → Delivered
- **Purpose**: Provide real-time visibility into order progress for staff and customers
- **Trigger**: Tailor/Staff updates status from order detail view
- **Progression**: View Order → Click Status → Select New Status → Confirm → Notification Sent → Dashboard Updates
- **Success criteria**: Status change reflects immediately, customer can see update in tracking portal

### Customer Order Tracking Portal
- **Functionality**: Customers enter phone number or order ID to view current status, assigned tailor, and delivery date
- **Purpose**: Reduce phone inquiries and empower customers with self-service
- **Trigger**: Customer accesses tracking page and enters phone/order ID
- **Progression**: Enter Phone/Order ID → View Orders → See Status, Tailor, Delivery Date → (Optional) Receive Notifications
- **Success criteria**: Customer sees accurate real-time status without staff intervention

### Dashboard Analytics
- **Functionality**: Real-time overview showing total customers, active orders, ready for delivery, completed orders, tailor workloads, overdue orders
- **Purpose**: Enable quick decision-making and identify bottlenecks
- **Trigger**: Admin/Staff opens application
- **Progression**: Login → Dashboard loads with live metrics → Identify priorities → Take action (view overdue, reassign work)
- **Success criteria**: Metrics update in real-time, clicking any metric filters to relevant orders

### Bilingual Interface (English/Tamil)
- **Functionality**: Toggle between English and Tamil throughout entire interface
- **Purpose**: Ensure accessibility for local staff and customers
- **Trigger**: User clicks language toggle in header
- **Progression**: Click language icon → Select English/Tamil → Interface updates → Preference saved
- **Success criteria**: All UI elements, labels, buttons translate instantly, preference persists across sessions

### Inventory Management
- **Functionality**: Track fabrics, threads, buttons, zippers, and accessories with quantity, supplier, color, price; receive low-stock alerts; manage stock in/out transactions
- **Purpose**: Prevent material shortages, track costs, and manage supplier relationships
- **Trigger**: Staff navigates to Inventory tab
- **Progression**: View inventory → Add new item or Update stock → Stock In/Out dialog → Enter quantity & reason → Save → Transaction recorded
- **Success criteria**: Items show accurate quantities, low-stock items highlighted with alerts, transaction history tracked with timestamps

### WhatsApp Customer Communication
- **Functionality**: Send WhatsApp messages to customers directly from the app with order status updates, quick greetings, and custom messages
- **Purpose**: Enable instant, convenient communication with customers via their preferred messaging platform
- **Trigger**: Staff clicks WhatsApp icon next to customer phone number in Customer List, Order List, or Order Tracking
- **Progression**: Click WhatsApp icon → WhatsApp opens with pre-filled message → Staff can edit message → Send via WhatsApp
- **Success criteria**: WhatsApp web/app opens with correctly formatted phone number and context-appropriate message template based on order status or customer interaction

## Edge Case Handling

- **Empty States**: Show helpful prompts with "Add Customer" or "Create Order" when lists are empty
- **Duplicate Phone Numbers**: Warn before creating customer with existing phone, offer to view existing profile
- **Overdue Orders**: Highlight in red with alert icon, filter option to show all overdue
- **Missing Measurements**: Allow partial measurements, clearly mark incomplete fields
- **Network Offline**: Show clear message, queue actions for retry when connection restored
- **Invalid Phone/Order ID**: Display friendly "No orders found" with suggestions to verify input
- **Tailor Overload**: Dashboard shows warning when tailor has >10 active orders
- **Out of Stock Materials**: Prevent negative inventory, show clear alert when attempting to use unavailable materials
- **Duplicate Item Names**: Warn when adding inventory item with similar name to existing item
- **Invalid Login**: Show clear error message for incorrect username/password
- **Unauthorized Access**: Prevent users from accessing features/data outside their role permissions
- **Session Persistence**: Maintain login state across page refreshes and browser restarts
- **No Assigned Orders (Tailor)**: Show friendly empty state when tailor has no current assignments
- **Customer Without Orders**: Display helpful message when customer has no order history

## Design Direction

The design should evoke a sense of refined professionalism and modern efficiency—elegant like a premium fashion atelier yet practical for daily shop operations. It should feel both cutting-edge and approachable, with a minimal interface that allows information to breathe while providing rich functionality when needed.

## Color Selection

Custom palette - Professional tailor-themed colors combining sophistication with warmth and clarity.

- **Primary Color**: Rich Indigo (#3730A3 / oklch(0.35 0.15 275)) - Communicates trustworthiness, professionalism, and premium quality associated with tailoring craftsmanship
- **Secondary Colors**: 
  - Warm Slate (#64748B / oklch(0.52 0.012 255)) - Neutral, professional for secondary actions
  - Soft Cream (#FFFBEB / oklch(0.98 0.03 85)) - Subtle backgrounds, cards
- **Accent Color**: Amber Gold (#F59E0B / oklch(0.72 0.15 70)) - Attention-grabbing for CTAs, ready orders, important actions
- **Foreground/Background Pairings**:
  - Background (White #FFFFFF / oklch(1 0 0)): Foreground Dark Slate (#0F172A / oklch(0.15 0.02 255)) - Ratio 14.8:1 ✓
  - Card (Soft Cream #FFFBEB / oklch(0.98 0.03 85)): Foreground Dark Slate (#0F172A) - Ratio 14.2:1 ✓
  - Primary (Rich Indigo #3730A3): White text (#FFFFFF) - Ratio 8.9:1 ✓
  - Secondary (Warm Slate #64748B): White text (#FFFFFF) - Ratio 4.8:1 ✓
  - Accent (Amber Gold #F59E0B): Dark Slate text (#0F172A) - Ratio 8.5:1 ✓
  - Muted (Light Gray #F1F5F9 / oklch(0.96 0.004 255)): Muted Foreground (#64748B) - Ratio 6.2:1 ✓

## Font Selection

Typography should convey modern professionalism with excellent readability for data-heavy interfaces while maintaining elegance. Using Inter for its superb legibility at all sizes and neutral, contemporary personality.

- **Typographic Hierarchy**:
  - H1 (Page Title): Inter Bold / 32px / -0.02em letter spacing / 1.2 line height
  - H2 (Section Header): Inter Semibold / 24px / -0.01em letter spacing / 1.3 line height
  - H3 (Card Title): Inter Semibold / 18px / normal letter spacing / 1.4 line height
  - Body (Primary Text): Inter Regular / 15px / normal letter spacing / 1.6 line height
  - Small (Labels): Inter Medium / 13px / normal letter spacing / 1.5 line height
  - Tiny (Captions): Inter Regular / 12px / 0.01em letter spacing / 1.4 line height

## Animations

Animations should feel purposeful and refined—quick enough to maintain efficiency but noticeable enough to provide spatial awareness and feedback. The balance leans toward subtle functionality with occasional delightful moments during key successes (order completion, status updates).

- **Purposeful Meaning**: Status changes animate with subtle slide and fade to communicate progression; cards lift slightly on hover to indicate interactivity
- **Hierarchy of Movement**: Dashboard metrics animate on load with staggered timing; order list updates slide in from relevant direction; modal dialogs scale in with slight bounce for warmth

## Component Selection

- **Components**: 
  - Dialog (order creation, customer forms, inventory management)
  - Card (dashboard metrics, customer/order list items with hover states, inventory items)
  - Tabs (customer measurements, order details sections, inventory stock in/out)
  - Select (tailor assignment, status updates, language toggle, category filters)
  - Input (customer details, search, measurements with clear focus states, inventory quantities)
  - Button (primary actions with filled style, secondary with outline, destructive for cancel)
  - Badge (status indicators with color coding: gray=pending, blue=in-progress, green=ready, slate=delivered; stock levels: red=out of stock, amber=low stock, green=in stock)
  - Table (order lists with sortable columns, row hover)
  - Avatar (tailor/customer initials with soft colors)
  - Popover (quick actions menu, notifications)
  - Form (react-hook-form integration for validation)

- **Customizations**: 
  - Status Timeline component (custom horizontal stepper showing order progression)
  - Measurement Grid component (structured input layout for clothing measurements)
  - Language Switcher (custom toggle with flag icons)
  - Tailor Workload Indicator (custom progress bar showing assigned orders)
  - Inventory Stock Level Indicator (visual progress bar with color-coded thresholds)
  - Transaction Timeline (chronological list with in/out indicators)
  - Quick Action Fab (floating action button for mobile - add order/customer)

- **States**: 
  - Buttons: default (solid primary with subtle shadow), hover (slight lift + brightness increase), active (pressed down), disabled (reduced opacity + no interaction)
  - Inputs: default (border-input), focused (ring-2 ring-primary with smooth transition), error (border-destructive with shake animation), filled (subtle background change)
  - Cards: default (border + subtle shadow), hover (shadow-lg + slight translate-y), selected (border-primary + background tint)

- **Icon Selection**: 
  - @phosphor-icons: User (customers), Scissors (orders), UserCircle (tailors), ClockCounterClockwise (status), Bell (notifications), MagnifyingGlass (search), Plus (add actions), CaretDown (dropdowns), Check (completed), Warning (overdue), Translate (language), Package (inventory), ArrowCircleDown (stock in), ArrowCircleUp (stock out), WarningCircle (low stock), Phone (call), WhatsappLogo (WhatsApp messaging)

- **Spacing**: 
  - Page padding: p-6 (desktop) / p-4 (mobile)
  - Card padding: p-6 (desktop) / p-4 (mobile)
  - Section gaps: gap-8 (major sections) / gap-4 (related items) / gap-2 (tight groups)
  - Button padding: px-6 py-2.5 (primary) / px-4 py-2 (secondary)
  - Consistent 4px baseline grid (0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24)

- **Mobile**: 
  - Navigation: Bottom tab bar on mobile (Dashboard, Orders, Customers, Inventory, Track) vs. sidebar on desktop
  - Dashboard: Stack metric cards vertically on mobile, 2x2 grid on tablet, 4-column on desktop
  - Forms: Full-screen modal on mobile with sticky footer buttons, centered dialog on desktop
  - Tables: Transform to stacked card list on mobile with key info visible, expandable for details
  - Search: Sticky header with persistent search bar, slides up on scroll down, reappears on scroll up
  - Inventory: 2-column grid on desktop, single column on mobile with transaction history below
  - Quick Actions: Floating action button (FAB) bottom-right on mobile for primary add actions
