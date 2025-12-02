import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { deleteStitchedOrdersFromOrderAllotment, getCollectionStats } from '@/lib/firestore/migrationService';

export function AdminDataCleanup() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCleanup = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Get stats before
      const statsBefore = await getCollectionStats();
      console.log('Stats before cleanup:', statsBefore);

      // Execute cleanup
      const cleanupResult = await deleteStitchedOrdersFromOrderAllotment();
      console.log('Cleanup result:', cleanupResult);

      // Get stats after
      const statsAfter = await getCollectionStats();
      console.log('Stats after cleanup:', statsAfter);

      setResult({
        deletedCount: cleanupResult.deletedCount,
        errors: cleanupResult.errors,
        statsBefore,
        statsAfter,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Cleanup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getCollectionStats();
      setStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Order Data Cleanup</h2>

      {/* Stats Section */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Database Statistics</h3>
        {stats ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded border border-blue-200">
              <div className="text-sm text-gray-600">Order Allotments</div>
              <div className="text-2xl font-bold text-blue-600">{stats.orderAllotmentCount}</div>
            </div>
            <div className="bg-white p-4 rounded border border-orange-200">
              <div className="text-sm text-gray-600">Stitched Orders</div>
              <div className="text-2xl font-bold text-orange-600">{stats.stitchedCount}</div>
            </div>
            <div className="bg-white p-4 rounded border border-green-200">
              <div className="text-sm text-gray-600">New Orders</div>
              <div className="text-2xl font-bold text-green-600">{stats.newOrdersCount}</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Click "Check Stats" to load statistics</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleGetStats}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
          Check Stats
        </button>
        <button
          onClick={handleCleanup}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
          Delete Stitched Orders
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-red-900">Error</h4>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-900">Cleanup Complete</h4>
              <p className="text-green-700">Successfully deleted {result.deletedCount} stitched orders</p>
            </div>
          </div>

          {/* Before/After Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-semibold mb-2">Before</h5>
              <div className="text-sm space-y-1">
                <p>Order Allotments: <span className="font-bold">{result.statsBefore.orderAllotmentCount}</span></p>
                <p>Stitched: <span className="font-bold">{result.statsBefore.stitchedCount}</span></p>
                <p>New Orders: <span className="font-bold">{result.statsBefore.newOrdersCount}</span></p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-semibold mb-2">After</h5>
              <div className="text-sm space-y-1">
                <p>Order Allotments: <span className="font-bold">{result.statsAfter.orderAllotmentCount}</span></p>
                <p>Stitched: <span className="font-bold">{result.statsAfter.stitchedCount}</span></p>
                <p>New Orders: <span className="font-bold">{result.statsAfter.newOrdersCount}</span></p>
              </div>
            </div>
          </div>

          {/* Errors if any */}
          {result.errors.length > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h5 className="font-semibold text-orange-900 mb-2">Errors ({result.errors.length})</h5>
              <div className="max-h-40 overflow-y-auto">
                {result.errors.map((err: any, idx: number) => (
                  <p key={idx} className="text-sm text-orange-700">
                    Order {err.orderId}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Information */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-2">
        <h4 className="font-semibold text-gray-900 mb-2">About this cleanup:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Deletes all documents with status='stitched' from orderAllotment collection</li>
          <li>This is a one-way operation. Ensure you have backups before proceeding</li>
          <li>Operations are performed in batches for efficiency</li>
          <li>Statistics show current database state</li>
        </ul>
      </div>
    </div>
  );
}
