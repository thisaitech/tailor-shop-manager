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
  measurements: Measurements;
  createdAt: number;
  updatedAt: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  measurements: Measurements;
  fabricDetails: string;
  designNotes: string;
  assignedTailor: string;
  status: OrderStatus;
  deliveryDate: number;
  createdAt: number;
  updatedAt: number;
}

export interface Tailor {
  id: string;
  name: string;
}

export type Language = 'en' | 'ta';
