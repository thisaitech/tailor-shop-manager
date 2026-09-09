import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const SERIES_COLLECTION = 'numberSeries';

export type NumberSeriesType = 'serviceOrder' | 'jobWork' | 'dc' | 'grn' | 'customer' | 'custom';

export interface NumberSeries {
  id: string;
  companyId: string;
  prefix: string;
  name: string;
  digits: number;
  type: NumberSeriesType;
  createdAt: number;
}

const DEFAULT_SERIES: Array<Omit<NumberSeries, 'id' | 'companyId' | 'createdAt'>> = [
  { prefix: 'SO', name: 'Service Order', digits: 4, type: 'serviceOrder' },
  { prefix: 'JOB', name: 'Job Work', digits: 4, type: 'jobWork' },
  { prefix: 'DC', name: 'Delivery Challan', digits: 3, type: 'dc' },
  { prefix: 'GRN', name: 'Goods Receipt', digits: 3, type: 'grn' },
  { prefix: 'CUST', name: 'Customer', digits: 4, type: 'customer' },
];

const COLLECTION_BY_TYPE: Record<Exclude<NumberSeriesType, 'custom'>, string> = {
  serviceOrder: 'newOrder',
  jobWork: 'orderAllotment',
  dc: 'deliveryChallans',
  grn: 'goodsReceipts',
  customer: 'newcustomers',
};

export function formatSeriesNumber(prefix: string, num: number, digits: number): string {
  return `${prefix.toUpperCase()}${num.toString().padStart(digits, '0')}`;
}

async function maxNumberInCollection(
  collectionName: string,
  companyId: string,
  prefix: string
): Promise<number> {
  const ref = collection(db, collectionName);
  const snapshot = await getDocs(query(ref, where('companyId', '==', companyId)));
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`, 'i');
  let maxNum = 0;
  snapshot.docs.forEach((item) => {
    const ids = [item.id, item.data()?.id, item.data()?.dcNo, item.data()?.grnNo, item.data()?.jobWorkNo]
      .filter(Boolean)
      .map(String);
    ids.forEach((value) => {
      const match = value.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
  });
  return maxNum;
}

export async function previewNextNumber(companyId: string, series: NumberSeries): Promise<string> {
  const collections =
    series.type === 'custom'
      ? Object.values(COLLECTION_BY_TYPE)
      : [COLLECTION_BY_TYPE[series.type]];

  let maxNum = 0;
  for (const collectionName of collections) {
    const current = await maxNumberInCollection(collectionName, companyId, series.prefix);
    if (current > maxNum) maxNum = current;
  }
  return formatSeriesNumber(series.prefix, maxNum + 1, series.digits);
}

export async function generateNextNumber(
  companyId: string,
  prefix: string,
  digits: number,
  type: NumberSeriesType
): Promise<string> {
  return previewNextNumber(companyId, {
    id: '',
    companyId,
    prefix,
    name: prefix,
    digits,
    type,
    createdAt: Date.now(),
  });
}

export async function getNumberSeries(companyId: string): Promise<NumberSeries[]> {
  await ensureDefaultSeries(companyId);
  const ref = collection(db, SERIES_COLLECTION);
  const snapshot = await getDocs(query(ref, where('companyId', '==', companyId)));
  const list = snapshot.docs.map((item) => item.data() as NumberSeries);
  const order = ['SO', 'JOB', 'DC', 'GRN', 'CUST'];
  return list.sort((a, b) => {
    const ai = order.indexOf(a.prefix);
    const bi = order.indexOf(b.prefix);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.prefix.localeCompare(b.prefix);
  });
}

export async function ensureDefaultSeries(companyId: string): Promise<void> {
  const ref = collection(db, SERIES_COLLECTION);
  const snapshot = await getDocs(query(ref, where('companyId', '==', companyId)));
  const existing = new Set(snapshot.docs.map((item) => (item.data() as NumberSeries).prefix.toUpperCase()));

  for (const series of DEFAULT_SERIES) {
    if (existing.has(series.prefix)) continue;
    const id = `${companyId}_${series.prefix}`;
    const record: NumberSeries = {
      id,
      companyId,
      ...series,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, SERIES_COLLECTION, id), record);
  }
}

export async function addNumberSeries(
  companyId: string,
  data: { prefix: string; name: string; digits: number }
): Promise<NumberSeries> {
  const prefix = data.prefix.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (!prefix) {
    throw new Error('Prefix is required (letters only)');
  }
  if (data.digits < 1 || data.digits > 6) {
    throw new Error('Digits must be between 1 and 6');
  }

  const existing = await getNumberSeries(companyId);
  if (existing.some((item) => item.prefix.toUpperCase() === prefix)) {
    throw new Error(`Series ${prefix} already exists`);
  }

  const id = `${companyId}_${prefix}`;
  const record: NumberSeries = {
    id,
    companyId,
    prefix,
    name: data.name.trim() || prefix,
    digits: data.digits,
    type: 'custom',
    createdAt: Date.now(),
  };
  await setDoc(doc(db, SERIES_COLLECTION, id), record);
  return record;
}
