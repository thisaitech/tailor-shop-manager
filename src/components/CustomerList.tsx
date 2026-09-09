import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Customer } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MagnifyingGlass, UserCircle, Plus, DotsThree, PencilSimple, Trash, Phone, WhatsappLogo, Funnel } from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { CustomerForm } from './CustomerForm';
import { sendWhatsAppMessage } from '@/lib/utils';
import { startOfDay, endOfDay, subDays, subMonths, isWithinInterval, format } from 'date-fns';

interface CustomerListProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
  onUpdateCustomer?: (id: string, customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
  onDeleteCustomer?: (id: string) => void;
  onSelectCustomer?: (customer: Customer) => void;
  hideAddButton?: boolean;
}

type DateFilter = 'all' | 'exact' | 'range';

const ITEMS_PER_PAGE = 6;
const RECENT_CUSTOMERS_PER_PAGE = 6;

export function CustomerList({ customers, onAddCustomer, onUpdateCustomer, onDeleteCustomer, onSelectCustomer, hideAddButton = false }: CustomerListProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recentCustomersPage, setRecentCustomersPage] = useState(1);

  // Date filter logic
  const getDateRange = (filter: DateFilter): { start: Date; end: Date } | null => {
    switch (filter) {
      case 'exact':
        if (!exactDate) return null;
        const exact = new Date(exactDate);
        return { start: startOfDay(exact), end: endOfDay(exact) };
      case 'range':
        if (!startDate || !endDate) return null;
        return { start: startOfDay(new Date(startDate)), end: endOfDay(new Date(endDate)) };
      default:
        return null;
    }
  };

  const filteredCustomers = (customers || []).filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.place || '').toLowerCase().includes(search.toLowerCase());

    const dateRange = getDateRange(dateFilter);
    const matchesDate = !dateRange || (c.createdAt && isWithinInterval(new Date(c.createdAt), dateRange));

    return matchesSearch && matchesDate;
  });

  // Sort customers by creation date (newest first)
  const sortedCustomers = filteredCustomers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Recent customers pagination
  const totalRecentPages = Math.ceil(sortedCustomers.length / RECENT_CUSTOMERS_PER_PAGE);
  const recentStartIndex = (recentCustomersPage - 1) * RECENT_CUSTOMERS_PER_PAGE;
  const recentCustomers = sortedCustomers.slice(recentStartIndex, recentStartIndex + RECENT_CUSTOMERS_PER_PAGE);
  const showRecentPagination = sortedCustomers.length > RECENT_CUSTOMERS_PER_PAGE;

  // Pagination logic (for old view, if needed)
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showPagination = filteredCustomers.length > ITEMS_PER_PAGE;

  // Reset to page 1 when filters change
  const handleFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    setCurrentPage(1);
    setRecentCustomersPage(1);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteCustomerId(customerId);
  };

  const confirmDelete = () => {
    if (deleteCustomerId && onDeleteCustomer) {
      onDeleteCustomer(deleteCustomerId);
      setDeleteCustomerId(null);
    }
  };

  const handleFormClose = (open?: boolean) => {
    if (open === true) return;
    setShowForm(false);
    setEditingCustomer(undefined);
  };

  const handleSave = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingCustomer && onUpdateCustomer) {
      await onUpdateCustomer(editingCustomer.id, customerData);
    } else {
      await onAddCustomer(customerData);
    }
  };

  const dateFilterOptions: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'All Customers' },
    { value: 'exact', label: 'Exact Date' },
    { value: 'range', label: 'Date Range' },
  ];

  const FilterButtons = ({ inModal = false }: { inModal?: boolean }) => {
    // Mobile modal: keep stacked layout unchanged
    if (inModal) {
      return (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {dateFilterOptions.map((option) => (
              <Button
                key={option.value}
                variant={dateFilter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  handleFilterChange(option.value);
                  if (option.value === 'all') {
                    setExactDate('');
                    setStartDate('');
                    setEndDate('');
                    setShowFilterModal(false);
                  }
                }}
                className="text-xs font-semibold whitespace-nowrap touch-manipulation h-8 px-3"
              >
                {option.label}
              </Button>
            ))}
          </div>

          {dateFilter === 'exact' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Select Date</label>
              <Input
                type="date"
                value={exactDate}
                onChange={(e) => setExactDate(e.target.value)}
                className="h-10 text-sm w-full"
                placeholder="Select date"
              />
              {exactDate && (
                <p className="text-xs text-muted-foreground">
                  Showing {filteredCustomers.length} customer(s) on {format(new Date(exactDate), 'MMM dd, yyyy')}
                </p>
              )}
              {exactDate && (
                <Button
                  onClick={() => setShowFilterModal(false)}
                  className="w-full h-10 font-semibold text-sm"
                >
                  Apply Filter
                </Button>
              )}
              {exactDate && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setExactDate('');
                    handleFilterChange('all');
                  }}
                  className="w-full h-10 font-semibold text-sm"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          )}

          {dateFilter === 'range' && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-foreground">Date Range Filter</label>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">From Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 text-sm w-full"
                  placeholder="Select start date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">To Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="h-10 text-sm w-full"
                  placeholder="Select end date"
                />
              </div>
              {startDate && endDate && (
                <p className="text-xs text-muted-foreground">
                  Showing {filteredCustomers.length} customer(s) from {format(new Date(startDate), 'MMM dd')} to {format(new Date(endDate), 'MMM dd, yyyy')}
                </p>
              )}
              {startDate && endDate && (
                <Button
                  onClick={() => setShowFilterModal(false)}
                  className="w-full h-10 font-semibold text-sm"
                >
                  Apply Filter
                </Button>
              )}
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    handleFilterChange('all');
                  }}
                  className="w-full h-10 font-semibold text-sm"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          )}
        </div>
      );
    }

    // Web: horizontal progressive filter like home / employee page
    return (
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-shrink-0">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Filter by Date</label>
          <div className="flex gap-1.5">
            {dateFilterOptions.map((option) => (
              <Button
                key={option.value}
                variant={dateFilter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  handleFilterChange(option.value);
                  if (option.value === 'all') {
                    setExactDate('');
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="text-xs font-semibold whitespace-nowrap h-8 px-3"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {dateFilter === 'exact' && (
          <>
            <div className="hidden lg:block self-stretch w-px bg-border my-1" />
            <div className="flex-shrink-0 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Date</label>
              <Input
                type="date"
                value={exactDate}
                onChange={(e) => setExactDate(e.target.value)}
                className="h-8 text-sm w-[180px]"
              />
            </div>
          </>
        )}

        {dateFilter === 'range' && (
          <>
            <div className="hidden lg:block self-stretch w-px bg-border my-1" />
            <div className="flex-shrink-0">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Date Range Filter</label>
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-medium">From Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-sm w-[150px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-medium">To Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="h-8 text-sm w-[150px]"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {(dateFilter === 'exact' || dateFilter === 'range') && (
          <Button
            size="sm"
            className="h-8 px-3 text-xs font-semibold ml-auto"
            onClick={() => setCurrentPage(1)}
            disabled={
              dateFilter === 'exact'
                ? !exactDate
                : !(startDate && endDate)
            }
          >
            <Funnel size={14} weight="bold" className="mr-1.5" />
            Apply Filter
          </Button>
        )}
      </div>
    );
  };

  // Pagination component
  const Pagination = () => (
    <div className="flex items-center justify-center gap-2 pt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="h-8 px-2 text-xs"
      >
        Prev
      </Button>
      <span className="text-xs text-muted-foreground">
        {currentPage} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="h-8 px-2 text-xs"
      >
        Next
      </Button>
    </div>
  );

  // Recent Customers Pagination component
  const RecentCustomersPagination = () => (
    <div className="flex items-center justify-center gap-2 pt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRecentCustomersPage((p) => Math.max(1, p - 1))}
        disabled={recentCustomersPage === 1}
        className="h-8 px-3 text-xs font-semibold"
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground font-medium">
        Page {recentCustomersPage} of {totalRecentPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRecentCustomersPage((p) => Math.min(totalRecentPages, p + 1))}
        disabled={recentCustomersPage === totalRecentPages}
        className="h-8 px-3 text-xs font-semibold"
      >
        Next
      </Button>
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <Input
              placeholder={t('searchCustomers')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 touch-manipulation"
            />
          </div>
          {!hideAddButton && (
            <Button onClick={() => setShowForm(true)} className="h-10 font-semibold touch-manipulation px-4 text-xs sm:text-sm whitespace-nowrap min-w-[100px] sm:min-w-[120px]">
              <Plus size={18} className="mr-1.5" weight="bold" />
              {t('addCustomer')}
            </Button>
          )}
        </div>
        
        {/* Mobile: Filter button that opens modal */}
        <div className="sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilterModal(true)}
            className="text-xs font-semibold touch-manipulation h-8 px-3 w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Funnel size={14} weight="bold" />
              Filter: {dateFilterOptions.find(o => o.value === dateFilter)?.label}
            </span>
            <Badge variant="secondary" className="text-[10px]">{filteredCustomers.length}</Badge>
          </Button>
        </div>

        {/* Desktop: Inline filter buttons */}
        <div className="hidden sm:block">
          <FilterButtons />
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title={search ? 'No customers found' : t('noCustomers')}
          description={search ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
          actionLabel={!search ? t('addCustomer') : undefined}
          onAction={!search ? () => setShowForm(true) : undefined}
        />
      ) : (
        // Show Recent Customers when count > 0
        <div
          className="p-3 sm:p-4 w-full max-w-full flex flex-col gap-4 rounded-xl border shadow-md"
          style={{
            background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
            borderColor: 'rgba(196, 181, 253, 0.5)'
          }}
        >
          <h3 className="text-base font-semibold text-gray-800">
            {search ? `Search Results (${sortedCustomers.length})` : `Recent Customers (${sortedCustomers.length})`}
          </h3>
          {/* 6 cards per page: 2 cols × 3 rows on mobile, 3 cols × 2 rows on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentCustomers.map((customer, index) => (
              <div
                key={customer.id}
                className={`rounded-xl border-2 hover:shadow-lg transition-all cursor-pointer flex-shrink-0 w-full overflow-hidden shadow-sm animate-on-load animate-fade-slide-up stagger-${index + 1}`}
                style={{
                  background: '#ffffff',
                  borderColor: 'rgba(139, 92, 246, 0.25)'
                }}
                onClick={() => {
                  console.log('[CustomerList] Card clicked:', customer.id, customer.name);
                  console.log('[CustomerList] onSelectCustomer:', typeof onSelectCustomer);
                  onSelectCustomer?.(customer);
                }}
              >
                {/* Header with ID and Gender Badge */}
                <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                  <span className="text-[10px] sm:text-xs font-bold text-white/90 font-mono">{customer.id}</span>
                  <Badge className="text-[8px] sm:text-[10px] px-1.5 py-0 font-bold bg-white/20 text-white border-0 uppercase">
                    {t(customer.gender)}
                  </Badge>
                </div>

                {/* Main Content */}
                <div className="p-3 space-y-2">
                  {/* Customer Name */}
                  <p className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">{customer.name}</p>
                  
                  {/* Phone */}
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} weight="fill" className="text-violet-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-violet-700 truncate">{customer.phone}</span>
                  </div>
                  
                  {/* Place */}
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                    {customer.place || 'Not Specified'}
                  </p>
                </div>

                {/* Footer with Actions and Date */}
                <div className="px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between border-t gap-1" style={{ borderColor: 'rgba(139, 92, 246, 0.15)', background: '#FAFAFF' }}>
                  {/* Action buttons */}
                  <div className="flex items-center gap-0 sm:gap-0.5 flex-shrink-0">
                    <a
                      href={`tel:${customer.phone}`}
                      className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors touch-manipulation"
                      onClick={(e) => e.stopPropagation()}
                      title={t('call')}
                    >
                      <Phone size={12} className="sm:hidden" weight="fill" />
                      <Phone size={14} className="hidden sm:block" weight="fill" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendWhatsAppMessage(customer.phone, `Hello ${customer.name},`);
                      }}
                      className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors touch-manipulation"
                      title={t('whatsapp')}
                    >
                      <WhatsappLogo size={12} className="sm:hidden" weight="fill" />
                      <WhatsappLogo size={14} className="hidden sm:block" weight="fill" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 rounded-full hover:bg-gray-100 touch-manipulation">
                          <DotsThree size={14} className="sm:hidden" weight="bold" />
                          <DotsThree size={16} className="hidden sm:block" weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleEdit(customer, e)} className="font-medium">
                          <PencilSimple size={18} className="mr-2" weight="bold" />
                          {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDelete(customer.id, e)}
                          className="text-destructive focus:text-destructive font-medium"
                        >
                          <Trash size={18} className="mr-2" weight="bold" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Created date */}
                  {customer.createdAt && (
                    <div className="text-right flex-shrink-0 min-w-0">
                      <p className="text-[8px] sm:text-[10px] text-gray-400 leading-tight">Joined</p>
                      <p className="text-[9px] sm:text-xs font-bold text-gray-700 whitespace-nowrap">
                        {format(new Date(customer.createdAt), 'MMM dd')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {showRecentPagination && <RecentCustomersPagination />}
        </div>
      )}

      <CustomerForm
        open={showForm}
        onOpenChange={handleFormClose}
        onSave={handleSave}
        customer={editingCustomer}
      />

      <AlertDialog open={deleteCustomerId !== null} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCustomer')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteCustomerConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter by Date</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FilterButtons inModal />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
