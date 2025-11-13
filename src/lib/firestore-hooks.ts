import { useKV } from '@github/spark/hooks';

/**
 * Custom hook to sync data with Spark KV store
 * Wrapper around useKV to maintain the same API as before
 * 
 * @param collectionName - Key name for storage
 * @param initialValue - Initial value if key doesn't exist
 * @returns [data, setData] - Current data and setter function
 */
export function useFirestore<T>(
  collectionName: string,
  initialValue: T
): [T | undefined, (value: T | ((prev: T | undefined) => T)) => void] {
  const [data, setData] = useKV<T>(collectionName, initialValue);
  
  return [data, setData];
}
