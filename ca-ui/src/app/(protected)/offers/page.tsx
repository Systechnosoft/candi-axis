"use client";

import React, { useState, useEffect } from 'react';
import { ListPage } from '@/components/templates/ListPage';
import { FilterBar } from '@/components/primitives/FilterBar';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { OfferStatusCard } from '@/components/ats/OfferStatusCard';
import { OffersService } from '@/lib/api/offers';
import { Loader2, AlertCircle } from 'lucide-react';
import { TablePagination } from '@/components/primitives/TablePagination';

export default function OffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<any>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await OffersService.getOffers({ search });
        setOffers(data || []);
        setPage(1); // Reset page on filter changes
        if (data && data.length > 0) {
          setSelectedOffer(data[0]);
        } else {
          setSelectedOffer(null);
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load offers.');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchOffers, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null) return 'N/A';
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'success';
      case 'declined':
      case 'rejected':
        return 'error';
      case 'pending':
      default:
        return 'warning';
    }
  };

  return (
    <ListPage 
      title="Offers" 
      filterBar={<FilterBar searchValue={search} onSearchChange={setSearch} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 h-full min-h-0 items-start">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border rounded-xl w-full col-span-1">
            <Loader2 className="w-8 h-8 animate-spin text-brand mb-2" />
            <span className="text-text-muted text-sm">Loading offers...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border rounded-xl w-full col-span-1">
            <AlertCircle className="w-8 h-8 text-error mb-2" />
            <span className="text-error text-sm">{error}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <DataTableShell>
              <TableHead>
                <TableRow>
                  <TableHeader>Candidate</TableHeader>
                  <TableHeader>Requisition / Job</TableHeader>
                  <TableHeader>Offered CTC</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Joining Date</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {offers.slice((page - 1) * limit, page * limit).map((offer) => (
                  <TableRow 
                    key={offer.id}
                    onClick={() => setSelectedOffer(offer)}
                    className={selectedOffer?.id === offer.id ? 'bg-subtle cursor-pointer' : 'cursor-pointer hover:bg-subtle'}
                  >
                    <TableCell className="font-semibold text-brand">{offer.candidate_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary">{offer.jd_title}</span>
                        {offer.requisition_code && (
                          <span className="text-xs text-text-muted">{offer.requisition_code}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(offer.offered_ctc)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(offer.status)} className="capitalize">
                        {offer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(offer.joining_date)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTableShell>
            {offers.length === 0 && !loading && !error && (
              <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border rounded-xl w-full">
                <span className="text-text-muted text-sm">No offers found</span>
              </div>
            )}
          </div>
        )}
        
        {selectedOffer && (
          <div className="hidden lg:flex flex-col gap-4 sticky top-6">
            <h3 className="text-[14px] font-semibold text-text-primary">Preview</h3>
            <OfferStatusCard 
              status={selectedOffer.status} 
              amount={formatCurrency(selectedOffer.offered_ctc)} 
              dateSent={formatDate(selectedOffer.created_at)} 
            />
          </div>
        )}
      </div>
    </ListPage>
  );
}
