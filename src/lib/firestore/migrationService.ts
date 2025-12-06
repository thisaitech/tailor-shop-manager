import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  Timestamp,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

const ORDER_ALLOTMENTS_COLLECTION = 'orderAllotment';
const NEW_ORDERS_COLLECTION = 'newOrders';
const BATCH_SIZE = 500;

interface StitchedOrder {
  id: string;
  [key: string]: any;
}

export async function deleteStitchedOrdersFromOrderAllotment(): Promise<{
  deletedCount: number;
  errors: Array<{ orderId: string; error: string }>;
}> {
  try {
    const db = await getDb();
    console.log('[MigrationService] Starting cleanup: Deleting stitched orders from orderAllotment collection...');

    const q = query(
      collection(db, ORDER_ALLOTMENTS_COLLECTION),
      where('status', '==', 'stitched')
    );

    const querySnapshot = await getDocs(q);
    const stitchedOrders: StitchedOrder[] = [];

    querySnapshot.forEach((doc) => {
      stitchedOrders.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log(`[MigrationService] Found ${stitchedOrders.length} stitched orders to delete`);

    const errors: Array<{ orderId: string; error: string }> = [];
    let deletedCount = 0;

    // Delete in batches to avoid hitting limits
    for (let i = 0; i < stitchedOrders.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchOrders = stitchedOrders.slice(i, i + BATCH_SIZE);

      for (const order of batchOrders) {
        try {
          batch.delete(doc(db, ORDER_ALLOTMENTS_COLLECTION, order.id));
          deletedCount++;
        } catch (error) {
          errors.push({
            orderId: order.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      await batch.commit();
      console.log(`[MigrationService] Deleted batch of ${batchOrders.length} orders`);
    }

    console.log(
      `[MigrationService] Cleanup completed. Deleted: ${deletedCount}, Errors: ${errors.length}`
    );

    return {
      deletedCount,
      errors,
    };
  } catch (error) {
    console.error('[MigrationService] Error during cleanup:', error);
    throw error;
  }
}

export async function migrateOrderAllotmentsToNewOrders(): Promise<{
  migratedCount: number;
  skippedCount: number;
  errors: Array<{ orderId: string; error: string }>;
}> {
  try {
    const db = await getDb();
    console.log(
      '[MigrationService] Starting migration: Migrating non-stitched orders from orderAllotment to newOrders...'
    );

    const q = query(
      collection(db, ORDER_ALLOTMENTS_COLLECTION),
      where('status', '!=', 'stitched')
    );

    const querySnapshot = await getDocs(q);
    const ordersToMigrate: Array<{ id: string; data: any }> = [];

    querySnapshot.forEach((doc) => {
      ordersToMigrate.push({
        id: doc.id,
        data: doc.data(),
      });
    });

    console.log(`[MigrationService] Found ${ordersToMigrate.length} orders to migrate`);

    const errors: Array<{ orderId: string; error: string }> = [];
    let migratedCount = 0;
    let skippedCount = 0;

    // Check if order already exists in newOrders
    for (const order of ordersToMigrate) {
      try {
        // Map old status to new status
        const oldStatus = order.data.status;
        let newStatus: string;

        switch (oldStatus) {
          case 'allotted':
            newStatus = 'awaiting_acceptance';
            break;
          case 'in_progress':
            newStatus = 'in_progress';
            break;
          case 'rejected':
            newStatus = 'rejected';
            break;
          case 'stitched':
            newStatus = 'job_completed';
            break;
          default:
            newStatus = 'open';
        }

        const newOrderData = {
          ...order.data,
          status: newStatus,
          previousStatus: oldStatus,
          id: order.id,
          createdAt: order.data.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now(),
          statusHistory: {
            [newStatus]: Timestamp.now(),
          },
        };

        // Skip if already migrated
        const existingDoc = await getDocs(
          query(collection(db, NEW_ORDERS_COLLECTION), where('id', '==', order.id))
        );

        if (existingDoc.size > 0) {
          console.log(`[MigrationService] Order ${order.id} already exists in newOrders, skipping`);
          skippedCount++;
          continue;
        }

        await setDoc(doc(db, NEW_ORDERS_COLLECTION, order.id), newOrderData);
        migratedCount++;
      } catch (error) {
        errors.push({
          orderId: order.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(
      `[MigrationService] Migration completed. Migrated: ${migratedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`
    );

    return {
      migratedCount,
      skippedCount,
      errors,
    };
  } catch (error) {
    console.error('[MigrationService] Error during migration:', error);
    throw error;
  }
}

export async function getCollectionStats(): Promise<{
  orderAllotmentCount: number;
  stitchedCount: number;
  newOrdersCount: number;
}> {
  try {
    const db = await getDb();
    const allAllotments = await getDocs(collection(db, ORDER_ALLOTMENTS_COLLECTION));
    const stitched = await getDocs(
      query(collection(db, ORDER_ALLOTMENTS_COLLECTION), where('status', '==', 'stitched'))
    );
    const newOrders = await getDocs(collection(db, NEW_ORDERS_COLLECTION));

    return {
      orderAllotmentCount: allAllotments.size,
      stitchedCount: stitched.size,
      newOrdersCount: newOrders.size,
    };
  } catch (error) {
    console.error('[MigrationService] Error getting collection stats:', error);
    throw error;
  }
}
