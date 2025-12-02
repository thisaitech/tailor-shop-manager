import { InventoryTransaction } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowCircleDown, ArrowCircleUp } from '@phosphor-icons/react';
import { format } from 'date-fns';

interface TransactionHistoryProps {
  transactions: InventoryTransaction[];
  limit?: number;
}

export function TransactionHistory({ transactions, limit = 10 }: TransactionHistoryProps) {
  const { t } = useLanguage();

  const sortedTransactions = [...(transactions || [])]
    .sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0))
    .slice(0, limit);

  if (sortedTransactions.length === 0) {
    return (
      <div
        className="rounded-xl border shadow-md"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
          borderColor: 'rgba(167, 139, 250, 0.3)'
        }}
      >
        <div className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('recentTransactions')}</h3>
        </div>
        <div className="p-4 sm:p-6 pt-0">
          <p className="text-center text-sm sm:text-base text-gray-500 py-6 sm:py-8">{t('noTransactions')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border shadow-md"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
        borderColor: 'rgba(167, 139, 250, 0.3)'
      }}
    >
      <div className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('recentTransactions')}</h3>
      </div>
      <div className="p-4 sm:p-6 pt-0">
        <div className="space-y-2 sm:space-y-3">
          {sortedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-start gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-purple-100 last:border-0 last:pb-0"
            >
              <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                transaction.type === 'in'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-rose-100 text-rose-600'
              }`}>
                {transaction.type === 'in' ? (
                  <ArrowCircleDown size={16} className="sm:size-5" weight="fill" />
                ) : (
                  <ArrowCircleUp size={16} className="sm:size-5" weight="fill" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{transaction.itemName}</p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{transaction.reason}</p>
                    {transaction.tailorName && (
                      <p className="text-xs text-purple-700 font-medium mt-0.5">
                        Tailor: {transaction.tailorName}
                      </p>
                    )}
                  </div>
                  <Badge variant={transaction.type === 'in' ? 'default' : 'outline'} className={`text-xs flex-shrink-0 ${transaction.type === 'in' ? 'bg-emerald-600' : 'border-rose-300 text-rose-600'}`}>
                    {transaction.type === 'in' ? '+' : '-'}{transaction.quantity}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {transaction?.createdAt ? format(transaction.createdAt, 'PPp') : 'N/A'}
                  </p>
                  {transaction.orderId && (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs bg-purple-100 text-purple-700">
                      {transaction.orderId.slice(0, 10)}...
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
