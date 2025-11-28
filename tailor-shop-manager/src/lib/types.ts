export type Gender = 'male' | 'female';

export type OrderStatus = 'pending' | 'in-progress' | 'ready' | 'delivered';

export interface Measurements {
  // Shirt measurements (inches)
  shirt?: {
    chest?: number;
    waist?: number;
    length?: number;
    shoulder?: number;
  };
  // Pant measurements (inches)
  pant?: {
    waist?: number;
    inseam?: number;
    outseam?: number;
    rise?: number;
    thigh?: number;
    hips?: number;
    legOpening?: number;
  };
  // Coat measurements (inches)
  coat?: {
    standardSize?: string;
    chest?: number;
    waist?: number;
    length?: number;
    shoulder?: number;
  };
  // Chudithar Top measurements (inches)
  chuditharTop?: {
    shoulder?: number;
    bust?: number;
    waist?: number;
    hip?: number;
    length?: number;
  };
  // Chudithar Pant measurements (inches)
  chuditharPant?: {
    waist?: number;
    hip?: number;
    inseam?: number;
    fullLength?: number;
  };
  // Blouse measurements (inches)
  blouse?: {
    shoulder?: number;
    chest?: number;
    neckDepthFront?: number;
    neckDepthBack?: number;
    armhole?: number;
    halfSleeve?: number;
    fullSleeve?: number;
  };
  // Trouser measurements (inches)
  trouser?: {
    waist?: number;
    inseam?: number;
    outseam?: number;
    rise?: number;
    thigh?: number;
    hips?: number;
    legOpening?: number;
  };
  // Legacy fields for backward compatibility
  blazer?: {
    length?: number;
    shoulder?: number;
    chest?: number;
    waist?: number;
    sleeve?: number;
  };
  jocket?: {
    length?: number;
    shoulder?: number;
    chest?: number;
    sleeve?: number;
  };
  sudhar?: {
    length?: number;
    shoulder?: number;
    chest?: number;
    waist?: number;
    hip?: number;
    sleeve?: number;
  };
  kurta?: {
    length?: number;
    shoulder?: number;
    chest?: number;
    sleeve?: number;
  };
}

export interface Customer {
  id: string; // Auto-generated customer code
  name: string; // Customer Name (max 40 chars, required)
  aliasName?: string; // Alias Name (max 40 chars, optional)
  phone: string; // Contact Number (display format: "+91 9876543210")
  phoneNormalized?: string; // Normalized for queries ("+919876543210")
  email: string; // Email address (mandatory)
  whatsappNumber?: string; // WhatsApp Number (display format: "+91 9876543210")
  whatsappNormalized?: string; // Normalized for queries ("+919876543210")
  place: string; // City (required)
  address1?: string; // Address 1 (max 40 chars)
  address2?: string; // Address 2 (max 40 chars)
  pincode?: string; // Pincode (exactly 6 digits)
  region?: string; // Region
  state?: string; // State
  country?: string; // Country
  gender: Gender;
  measurements?: Measurements;
  createdAt: number;
  updatedAt: number;
}

// Service Order
export type OrderCategory = 'male' | 'female' | 'kids';
export type ServiceOrderStatus = 'open' | 'allotment' | 'job-network' | 'ready' | 'delivered';

// Unit of Measurement (UOM)
export type UOM = 'Nos' | 'Cms' | 'Inches' | 'Meters' | 'Yards' | 'Feet' | 'Pieces' | 'Sets';

// Dress Type for line items
export type DressType = 'shirt' | 'pant' | 'coat' | 'chuditharTop' | 'chuditharPant' | 'blouse' | 'trouser' | 'other';

// Individual dress line item in a service order
export interface DressItem {
  id: string; // Unique ID within the order (e.g., "ITEM-1", "ITEM-2")
  dressType: DressType; // Type of dress
  dressName: string; // Custom name or description
  quantity: number; // Quantity for this dress type
  stitchingCost: number; // Cost for this dress item
  measurements?: Measurements; // Specific measurements for this item
  designImages?: string[]; // Design images for this item
  notes?: string; // Special instructions for this item
  isAllotted?: boolean; // Whether this item has been assigned to a tailor
}

// Embedded allotment within ServiceOrder (unified structure)
export interface EmbeddedAllotment {
  id: string; // Job Work No (JOB0001, etc.)
  jobWorkDate: number;
  dressItemId?: string;
  dressItemName?: string;
  dressType?: string;
  stitchingAllotment: StitchingAllotmentType;
  assignedTo: string;
  assignedName: string;
  jobWorkNo?: string;
  jobWorkTailorId?: string;
  jobWorkTailorName?: string;
  status?: 'allotted' | 'in_progress' | 'stitched' | 'rejected' | 'delivered';
  assignedDate?: number;
  orderNumber?: string;
  stitchedId?: string;
  stitchedDate?: number;
  deliveredDate?: number;
  reassigned?: boolean;
  reassignedDate?: number;
  rejectedDate?: number;
  materialCost: number;
  jobWorkCost: number;
  expectedDeliveryDate: number;
  orderStatus: OrderTicketStatus;
  createdAt: number;
  updatedAt: number;
  history?: OrderAllotmentHistoryEntry[];
}

export interface ServiceOrder {
  id: string; // Service Order No (SO0001, SO0002, etc.)
  serviceOrderDate: number; // Auto-set to current date
  customerId: string; // Reference to Customer
  customerName: string; // Denormalized for display
  orderCategory: OrderCategory; // Male/Female/Kids
  measurements?: Measurements; // Current measurements (will be saved to customer profile)
  previousMeasurements?: Measurements; // Measurement history - customer's measurements at order creation time
  dressItems?: DressItem[]; // Array of dress line items (new - multiple dresses)
  orderQty: number; // Total numeric quantity (sum of all dress items)
  uom: UOM; // Unit of Measurement (Nos, Cms, Inches, etc.)
  designList: string[]; // Array of design image URLs (legacy)
  stitchingCost: number; // Total INR amount (sum of all dress items)
  expectedDeliveryDate: number; // Delivery date timestamp
  reference?: string; // Notes, instructions
  orderStatus: ServiceOrderStatus; // In-Progress/Pending/Ready/Delivered
  // Embedded allotments (unified structure - all order data in one place)
  allotments?: EmbeddedAllotment[];
  createdAt: number;
  updatedAt: number;
}

// Order Allotment
export type StitchingAllotmentType = 'employee' | 'vendor';
export type OrderTicketStatus = 'open' | 'in-progress' | 'closed';

export interface OrderAllotment {
  id: string; // Job Work No (JOB0001, JOB0002, etc.)
  jobWorkDate: number; // Auto-set to current date
  serviceOrderNo: string; // Reference to Service Order ID
  dressItemId?: string; // Reference to specific dress item ID (new)
  dressItemName?: string; // Dress item name for display (new)
  dressType?: string; // Dress type for display (shirt, pant, etc.)
  customerName: string; // Denormalized from service order
  customerId: string; // Customer ID reference
  stitchingAllotment: StitchingAllotmentType; // Employee or Vendor
  assignedTo: string; // Employee ID or Vendor ID
  assignedName: string; // Employee/Vendor name (denormalized)
  // Job Work Tailor specific fields (when stitchingAllotment === 'vendor')
  jobWorkNo?: string; // Job work number for vendor orders
  jobWorkTailorId?: string; // Vendor/Job Work Tailor ID (TAL0001, etc.)
  jobWorkTailorName?: string; // Vendor name (denormalized)
  status?: 'allotted' | 'in_progress' | 'stitched' | 'rejected' | 'delivered'; // Job work status
  assignedDate?: number; // Date when allotted to job work tailor
  orderNumber?: string; // Service order number for job work reference
  stitchedId?: string; // Unique stitched ID (ST0001, ST0002, etc.)
  stitchedDate?: number; // Date when marked as stitched
  deliveredDate?: number; // Date when marked as delivered
  reassigned?: boolean; // Flag to indicate if order has been reassigned
  reassignedDate?: number; // Date when order was reassigned
  rejectedDate?: number; // Date when order was rejected
  // End of Job Work Tailor fields
  materialCost: number; // Material cost in INR
  jobWorkCost: number; // Job work cost in INR
  expectedDeliveryDate: number; // Delivery date timestamp
  orderStatus: OrderTicketStatus; // Open/In Progress/Closed
  serviceOrderStatus: ServiceOrderStatus; // Status to update in service order
  companyId: string; // Company unique ID
  adminId: string; // Admin user ID who created allotment
  createdAt: number;
  updatedAt: number;
  // History tracking for reassignments and status changes
  history?: OrderAllotmentHistoryEntry[];
}

// History entry for order allotment changes
export interface OrderAllotmentHistoryEntry {
  timestamp: number;
  action: 'created' | 'reassigned' | 'status_changed' | 'delivered';
  previousStatus?: string;
  newStatus?: string;
  previousAssignedTo?: string;
  previousAssignedName?: string;
  newAssignedTo?: string;
  newAssignedName?: string;
  previousStitchingAllotment?: StitchingAllotmentType;
  newStitchingAllotment?: StitchingAllotmentType;
  previousMaterialCost?: number;
  newMaterialCost?: number;
  previousJobWorkCost?: number;
  newJobWorkCost?: number;
  stitchedId?: string; // Preserved stitched ID if reassigning from stitched status
  stitchedDate?: number; // Preserved stitched date if reassigning from stitched status
  notes?: string;
  performedBy?: string; // Admin/user who performed the action
}

// Advance Payment
export type ModeOfPayment = 'cash' | 'qrpay' | 'nil';

export interface AdvancePayment {
  id: string; // Proforma Invoice No (PI0001, PI0002, etc.)
  proformaInvoiceNo: string; // Same as id
  invoiceNo: string; // Invoice No (INV0001, INV0002, etc.)
  proformaInvoiceDate: number; // Auto-set to current date
  serviceOrderNo: string; // Reference to Service Order ID
  jobWorkNo: string; // Reference to Job Work ID
  customerId: string; // Customer ID reference
  customerName: string; // Denormalized from service order
  modeOfPayment: ModeOfPayment; // Cash / QRpay / Nil
  amount: number; // Advance amount in INR
  totalJobCost: number; // Total cost (material + job work)
  remainingAmount: number; // Auto-calculated: totalJobCost - amount
  companyId: string; // Company unique ID
  adminId: string; // Admin user ID who created payment
  createdAt: number;
  updatedAt: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  garmentTypes: string[];
  measurements?: Measurements;
  fabricDetails: string;
  designNotes: string;
  fabricPhotos?: string[];
  designPhotos?: string[];
  assignedTailor: string;
  materialsUsed?: MaterialUsed[];
  status: OrderStatus;
  deliveryDate: number;
  createdAt: number;
  updatedAt: number;
}

export interface MaterialUsed {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: MaterialUnit;
}

export type SalaryType = 'monthly' | 'daily';

export interface Tailor {
  id: string;
  name: string;
  phone: string;
  specialization: string[];
  salaryType: SalaryType;
  salaryAmount: number;
  bonus?: number;
  isActive: boolean;
  hasSetupPassword: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MaterialCategory = 'fabric' | 'thread' | 'button' | 'zipper' | 'accessory' | 'other';

export type MaterialUnit = 'meter' | 'piece' | 'roll' | 'spool' | 'pack' | 'dozen';

export interface InventoryItem {
  id: string;
  name: string;
  category: MaterialCategory;
  quantity: number;
  unit: MaterialUnit;
  minQuantity: number;
  supplier?: string;
  color?: string;
  price?: number;
  lastRestocked?: number;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  orderId?: string;
  tailorName?: string;
  createdAt: number;
}

export type Language = 'en' | 'ta';

export type UserRole = 'owner' | 'tailor' | 'customer';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  phone?: string;
  tailorId?: string;
  customerId?: string;
  isActive: boolean;
  hasSetupPassword: boolean;
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Tailor attendance tracking
export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface AttendanceRecord {
  id: string; // ATT_<timestamp>
  tailorId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  hours?: number;
  note?: string;
  createdAt: number;
}

// Company Profile
export type BusinessType = 'service' | 'sales' | 'sales_and_services';

export interface CompanyProfile {
  id: string; // Auto-generated company ID
  companyName: string; // max 40 chars
  aliasName?: string; // max 40 chars, optional
  businessType: BusinessType;
  productCategory: string; // e.g., "Readymades"
  address1: string; // max 40 chars
  address2?: string; // max 40 chars
  city: string;
  pincode: string; // 6 digits
  region: string;
  state: string;
  country: string;
  contactNumber: string; // max 20 digits
  email: string; // Company email address (mandatory)
  panNumber: string; // 15 chars, uppercase
  udhyamMsmeNo?: string; // 15 chars, optional
  gstinNumber: string; // 15 chars
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branchName: string;
  ifscCode: string;
  bankContactNumber: string;
  createdAt: number;
  updatedAt: number;
}

// Employee
export type EmployeeRole = 'manager' | 'accountant' | 'staff' | 'tailor' | 'other';
export type EmployeeGender = 'male' | 'female';

export interface Employee {
  id: string; // Auto-generated employee code (EMP0001, EMP0002, etc.)
  employeeCode: string; // Same as id, for display
  name: string; // max 40 chars
  aliasName?: string; // max 40 chars
  gender: EmployeeGender;
  profilePicture?: string; // URL or base64 string for profile picture
  email: string; // Email address (mandatory)
  contactNumber: string; // max 15 digits, used as login ID
  whatsappNumber?: string; // max 15 digits
  address1?: string; // max 40 chars
  address2?: string; // max 40 chars
  city?: string;
  pincode?: string; // 6 digits
  region?: string;
  state?: string;
  country?: string;
  role: EmployeeRole;
  designation?: string;
  joiningDate: number;
  accessPermissions: string[]; // e.g., ['view_orders', 'manage_inventory']
  accessPermissionEnabled: boolean; // If true, employee can login and appears in list
  isActive: boolean;
  firstLogin: boolean; // true by default, set to false after password change
  passwordHistory?: string[]; // Array of previous passwords for history tracking
  companyId: string; // Company unique ID
  companyDocId: string; // Firestore document ID of company
  createdBy: string; // Admin user ID who created employee
  createdAt: number;
  updatedAt: number;
}

// Vendor (Tailor Master)
export type VendorGender = 'male' | 'female';
export type VendorBusinessType = 'stitching' | 'aari_work' | 'others';

export interface Vendor {
  id: string; // Auto-generated tailor code (TAL0001, TAL0002, etc.)
  tailorCode: string; // Same as id, for display
  tailorName: string; // max 40 chars
  aliasName?: string; // max 40 chars
  gender: VendorGender;
  businessType: VendorBusinessType;
  email: string; // Email address (mandatory)
  address1: string; // max 40 chars
  address2?: string; // max 40 chars
  city: string;
  pincode: string; // 6 digits
  region: string;
  state: string;
  country: string;
  contactNumber: string; // max 15 digits
  whatsappNumber: string; // max 15 digits
  password: string; // Encrypted password for login
  passwordHistory: Array<{ password: string; changedAt: number }>; // Password change history
  isFirstLogin: boolean; // Flag to force password change on first login
  lastPasswordChange: number; // Timestamp of last password change
  companyId: string; // Company unique ID
  companyDocId: string; // Firestore document ID of company
  createdBy: string; // Admin user ID who created vendor
  createdAt: number;
  updatedAt: number;
}
