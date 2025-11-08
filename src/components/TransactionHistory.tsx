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

  const sortedTransactions = [...transactions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);

  if (sortedTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('recentTransactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">{t('noTransactions')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('recentTransactions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
            >
              <div className={`p-2 rounded-lg ${
                transaction.type === 'in' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {transaction.type === 'in' ? (
                  <ArrowCircleDown size={20} weight="fill" />
                ) : (
                  <ArrowCircleUp size={20} weight="fill" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium truncate">{transaction.itemName}</p>
                    <p className="text-sm text-muted-foreground">{transaction.reason}</p>
                  </div>
                  <Badge variant={transaction.type === 'in' ? 'default' : 'outline'}>
                    {transaction.type === 'in' ? '+' : '-'}{transaction.quantity}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {format(transaction.createdAt, 'PPp')}
                  </p>
                  {transaction.orderId && (
                    <Badge variant="secondary" className="text-xs">
                      {transaction.orderId}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
