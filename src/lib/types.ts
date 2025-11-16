export type Gender = 'male' | 'female';

export type OrderStatus = 'pending' | 'in-progress' | 'ready' | 'delivered';

export interface Measurements {
  pant?: {
    length?: number;
    waist?: number;
    hip?: number;
    thigh?: number;
    bottom?: number;
  };
  shirt?: {
    length?: number;
    shoulder?: number;
    chest?: number;
    waist?: number;
    sleeve?: number;
    neck?: number;
  };
  coat?: {
    length?: number;
    shoulder?: number;
    chest?: number;
    waist?: number;
    sleeve?: number;
  };
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
  id: string;
  name: string;
  phone: string;
  place: string;
  gender: Gender;
  measurements?: Measurements;
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
