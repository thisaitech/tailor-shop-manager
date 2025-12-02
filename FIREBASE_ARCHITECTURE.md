# Firebase Data Architecture

## Overview

This document explains how data is stored and synchronized in Firebase for the Tailor Shop Manager application.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │ Android App  │  │   iOS App    │          │
│  │   (React)    │  │ (Capacitor)  │  │ (Capacitor)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
│         └─────────────────┴─────────────────┘                    │
│                           │                                      │
│                  ┌────────▼────────┐                            │
│                  │ Firebase SDK    │                            │
│                  │ (Offline Cache) │                            │
│                  └────────┬────────┘                            │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  NETWORK LAYER  │
                   └────────┬────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                      FIREBASE BACKEND                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              FIREBASE AUTHENTICATION                     │    │
│  │  (Optional - for user management)                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 CLOUD FIRESTORE                          │    │
│  │                                                          │    │
│  │  Collections:                                           │    │
│  │  ├── customers/                                         │    │
│  │  │   └── {customerId}                                  │    │
│  │  │       ├── id, name, phone, email, address           │    │
│  │  │       └── createdAt, updatedAt                      │    │
│  │  │                                                      │    │
│  │  ├── orders/                                           │    │
│  │  │   └── {orderId}                                    │    │
│  │  │       ├── customerId, measurements, status         │    │
│  │  │       ├── fabricPhotos[], designPhotos[]           │    │
│  │  │       └── deliveryDate, assignedTailor             │    │
│  │  │                                                      │    │
│  │  ├── inventory/                                        │    │
│  │  │   └── {itemId}                                     │    │
│  │  │       ├── name, category, quantity, unit           │    │
│  │  │       └── minStock, lastRestocked                  │    │
│  │  │                                                      │    │
│  │  ├── transactions/                                     │    │
│  │  │   └── {transactionId}                              │    │
│  │  │       ├── itemId, type, quantity, reason           │    │
│  │  │       └── createdAt                                 │    │
│  │  │                                                      │    │
│  │  └── tailors/                                          │    │
│  │      └── {tailorId}                                    │    │
│  │          └── id, name                                  │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              FIREBASE STORAGE                            │    │
│  │                                                          │    │
│  │  Buckets:                                               │    │
│  │  ├── customers/photos/                                  │    │
│  │  │   └── {timestamp}_{filename}                        │    │
│  │  │                                                      │    │
│  │  └── orders/                                            │    │
│  │      ├── fabric/{timestamp}_{filename}                 │    │
│  │      └── design/{timestamp}_{filename}                 │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              FIREBASE HOSTING                            │    │
│  │  Serves: Static web assets (HTML, CSS, JS)             │    │
│  │  URL: https://your-project-id.web.app                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Create Operation (e.g., Add Customer)

```
User Action (Web/Mobile)
    ↓
useFirestore Hook
    ↓
Update Local State
    ↓
Firebase SDK (Offline Queue)
    ↓
Network Request → Cloud Firestore
    ↓
Document Created
    ↓
Real-time Listener Triggered
    ↓
All Connected Clients Updated
```

### 2. Read Operation (e.g., View Orders)

```
Component Mount
    ↓
useFirestore Hook (onSnapshot)
    ↓
Check Local Cache
    ↓ (if available)
Display Cached Data ──→ User sees data immediately
    ↓ (meanwhile)
Fetch from Server
    ↓
Update Local Cache
    ↓
Update UI (if data changed)
```

### 3. Photo Upload Flow

```
User Selects Photo
    ↓
File Object Created
    ↓
uploadPhoto() function
    ↓
Firebase Storage
    ↓
File Uploaded → Cloud Storage Bucket
    ↓
Download URL Generated
    ↓
URL Saved in Firestore Document
    ↓
Real-time Update → All Clients
```

## Data Synchronization

### Real-time Sync
- Uses Firestore's `onSnapshot()` listeners
- Automatic bi-directional sync
- Multiple users can work simultaneously
- Changes appear in real-time across all devices

### Offline Support
- **IndexedDB Cache**: Data cached locally in browser
- **Offline Queue**: Write operations queued when offline
- **Auto-sync**: Changes sync when connection restored
- **Conflict Resolution**: Last-write-wins by default

## Collection Schemas

### Customers Collection
```typescript
{
  id: string;              // "CUS1699999999999"
  name: string;            // "John Doe"
  phone: string;           // "+919876543210"
  email?: string;          // "john@example.com"
  address?: string;        // "123 Main St, City"
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
}
```

### Orders Collection
```typescript
{
  id: string;              // "ORD1699999999999"
  customerId: string;      // "CUS1699999999999"
  customerName: string;    // "John Doe"
  customerPhone: string;   // "+919876543210"
  measurements: {
    chest?: number;
    waist?: number;
    shoulder?: number;
    length?: number;
    sleeve?: number;
    // ... other measurements
  };
  fabricDetails: string;   // Description of fabric
  designNotes: string;     // Design specifications
  fabricPhotos?: string[]; // Array of Storage URLs
  designPhotos?: string[]; // Array of Storage URLs
  assignedTailor: string;  // "Kumar"
  deliveryDate: number;    // Unix timestamp
  status: "pending" | "in-progress" | "ready" | "completed";
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
}
```

### Inventory Collection
```typescript
{
  id: string;              // "INV1699999999999"
  name: string;            // "Cotton Fabric"
  category: "fabric" | "thread" | "button" | "zipper" | "other";
  quantity: number;        // 100
  unit: string;            // "meters", "pieces", "boxes"
  minStock: number;        // 20 (alert threshold)
  lastRestocked?: number;  // Unix timestamp
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
}
```

### Transactions Collection
```typescript
{
  id: string;              // "TXN1699999999999"
  itemId: string;          // "INV1699999999999"
  itemName: string;        // "Cotton Fabric"
  type: "in" | "out";      // Stock in or out
  quantity: number;        // 50
  reason: string;          // "New stock arrival" or "Used in order"
  createdAt: number;       // Unix timestamp
}
```

### Tailors Collection
```typescript
{
  id: string;              // "1"
  name: string;            // "Kumar"
}
```

## Storage Structure

### Photos Organization
```
storage/
├── customers/
│   └── photos/
│       └── 1699999999999_customer_photo.jpg
│
└── orders/
    ├── fabric/
    │   └── 1699999999999_fabric_sample.jpg
    └── design/
        └── 1699999999999_design_reference.jpg
```

### Photo Upload Process
1. User selects file from device
2. File converted to Blob/File object
3. Uploaded to Firebase Storage with timestamp-based name
4. Download URL received
5. URL stored in Firestore document
6. Photo accessible via URL

## Security Rules

### Development (Current)
```javascript
// Firestore - Open access
allow read, write: if true;

// Storage - Open access
allow read, write: if true;
```

### Production (Recommended)
```javascript
// Firestore - Authenticated users only
allow read, write: if request.auth != null;

// Storage - Authenticated users only
allow read, write: if request.auth != null;

// Or more granular:
allow read: if true;  // Public read
allow write: if request.auth != null;  // Authenticated write
```

## Performance Optimization

### Indexing
Firestore automatically indexes single fields. For complex queries, create composite indexes in `firestore.indexes.json`.

### Pagination
For large datasets, implement pagination:
```typescript
const query = collection(db, 'orders')
  .orderBy('createdAt', 'desc')
  .limit(20);
```

### Caching Strategy
- **Aggressive caching**: Data served from cache first
- **Stale-while-revalidate**: Show cached data while fetching updates
- **Background sync**: Updates happen in background

## Backup & Recovery

### Automatic Backups
Firebase doesn't provide automatic backups on free tier. For production:
1. Use Cloud Functions to export data periodically
2. Use Firebase Admin SDK for bulk exports
3. Consider Firebase Blaze plan for managed backups

### Manual Export
```bash
# Export Firestore data
gcloud firestore export gs://your-bucket/backup

# Export Storage files
gsutil -m cp -r gs://your-project.appspot.com gs://backup-bucket
```

## Monitoring

### Firebase Console
- **Usage Dashboard**: Track reads/writes
- **Performance**: Monitor query performance
- **Rules**: Test security rules

### Alerts
Set up alerts for:
- High read/write usage
- Storage quota limits
- Hosting bandwidth limits

## Scaling Considerations

### Free Tier Limits (Spark Plan)
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Storage**: 5GB, 1GB downloads/day
- **Hosting**: 10GB bandwidth/month

### When to Upgrade
- More than 100 orders/day
- More than 500MB photos
- More than 1,000 daily users

### Optimization Tips
1. Use batched writes for bulk operations
2. Implement lazy loading for images
3. Use compressed image formats (WebP)
4. Clean up old data periodically
5. Use Cloud Functions for heavy operations

---

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Deploy Firestore rules
3. ✅ Configure Storage
4. 🔐 Add authentication (optional)
5. 📊 Set up monitoring
6. 🔄 Configure backups

For implementation details, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
