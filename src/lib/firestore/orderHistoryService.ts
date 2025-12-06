import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import type { AssignedUser, OrderStatus } from './newOrderService';

const ORDER_HISTORY_COLLECTION = 'orderHistory';

export interface OrderHistoryEntry {
  id: string;
  orderId: string;
  status: OrderStatus;
  action: string;
  performedBy: AssignedUser;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  timestamp: number;
}

export async function addOrderHistory(
  orderId: string,
  status: OrderStatus,
  action: string,
  performedBy: AssignedUser,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const db = await getDb();
    const historyId = `history_${orderId}_${Date.now()}`;
    const now = Timestamp.now();

    const entry: OrderHistoryEntry = {
      id: historyId,
      orderId,
      status,
      action,
      performedBy,
      metadata,
      createdAt: now,
      timestamp: Date.now(),
    };

    await setDoc(doc(db, ORDER_HISTORY_COLLECTION, historyId), entry);
    console.log(`[OrderHistoryService] History entry created for order ${orderId}`);
  } catch (error) {
    console.error('[OrderHistoryService] Error adding history entry:', error);
    throw error;
  }
}

export async function getOrderHistory(orderId: string): Promise<OrderHistoryEntry[]> {
  try {
    const db = await getDb();
    const q = query(
      collection(db, ORDER_HISTORY_COLLECTION),
      where('orderId', '==', orderId),
      orderBy('createdAt', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderHistoryEntry));
  } catch (error) {
    console.error('[OrderHistoryService] Error fetching order history:', error);
    throw error;
  }
}

export async function getUserActionHistory(userId: string): Promise<OrderHistoryEntry[]> {
  try {
    const db = await getDb();
    const q = query(
      collection(db, ORDER_HISTORY_COLLECTION),
      where('performedBy.userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderHistoryEntry));
  } catch (error) {
    console.error('[OrderHistoryService] Error fetching user action history:', error);
    throw error;
  }
}
