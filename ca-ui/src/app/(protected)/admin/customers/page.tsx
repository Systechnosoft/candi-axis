'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ListPage } from '@/components/templates/ListPage';
import { FilterBar } from '@/components/primitives/FilterBar';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { Card } from '@/components/primitives/Card';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { useAuth } from '@/contexts/AuthContext';
import { CustomersService, Customer } from '@/lib/api/customers';
import { Loader2, Edit2, Ban, ShieldAlert, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TablePagination } from '@/components/primitives/TablePagination';

const DEFAULT_FORM = {
  customer_code: '',
  name: '',
  legal_name: '',
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: '',
  website_url: '',
  industry: '',
  company_size: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  country: 'India',
  postal_code: '',
  allowed_email_domains_str: '',
  status: 'ACTIVE',
};

export default function CustomersPage() {
  const { session } = useAuth();
  const isSuperAdmin = session?.roles.includes('SUPER_ADMIN');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Drawer form states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await CustomersService.getCustomers({ page, limit, search });
      setCustomers(res.data);
      setTotalItems(res.meta.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, search, isSuperAdmin]);

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleOpenAddDrawer = () => {
    setEditingCustomer(null);
    setForm(DEFAULT_FORM);
    setDrawerError(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (cust: Customer) => {
    setEditingCustomer(cust);
    setForm({
      customer_code: cust.customer_code,
      name: cust.name,
      legal_name: cust.legal_name || '',
      primary_contact_name: cust.primary_contact_name || '',
      primary_contact_email: cust.primary_contact_email || '',
      primary_contact_phone: cust.primary_contact_phone || '',
      website_url: cust.website_url || '',
      industry: cust.industry || '',
      company_size: cust.company_size || '',
      address_line1: cust.address_line1 || '',
      address_line2: cust.address_line2 || '',
      city: cust.city || '',
      state: cust.state || '',
      country: cust.country || 'India',
      postal_code: cust.postal_code || '',
      allowed_email_domains_str: cust.allowed_email_domains?.join(', ') || '',
      status: cust.status,
    });
    setDrawerError(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingCustomer(null);
    setForm(DEFAULT_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setDrawerError(null);

    // Validation
    if (!form.name.trim()) {
      setDrawerError('Customer name is required.');
      setSubmitting(false);
      return;
    }

    const payload: Partial<Customer> & { allowed_email_domains?: string[] } = {
      name: form.name.trim(),
      legal_name: form.legal_name.trim() || undefined,
      primary_contact_name: form.primary_contact_name.trim() || undefined,
      primary_contact_email: form.primary_contact_email.trim() || undefined,
      primary_contact_phone: form.primary_contact_phone.trim() || undefined,
      website_url: form.website_url.trim() || undefined,
      industry: form.industry.trim() || undefined,
      company_size: form.company_size.trim() || undefined,
      address_line1: form.address_line1.trim() || undefined,
      address_line2: form.address_line2.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      country: form.country.trim() || 'India',
      postal_code: form.postal_code.trim() || undefined,
      allowed_email_domains: form.allowed_email_domains_str
        ? form.allowed_email_domains_str
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean)
        : [],
      status: form.status,
    };

    try {
      if (editingCustomer) {
        await CustomersService.updateCustomer(editingCustomer.id, payload);
        toast.success('Customer updated successfully.');
      } else {
        await CustomersService.createCustomer(payload);
        toast.success('Customer created successfully.');
      }
      handleCloseDrawer();
      fetchCustomers();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'An error occurred while saving customer details.';
      setDrawerError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (cust: Customer) => {
    if (!confirm(`Are you sure you want to deactivate the customer "${cust.name}"?`)) {
      return;
    }

    try {
      await CustomersService.deactivateCustomer(cust.id);
      toast.success('Customer deactivated successfully.');
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate customer.');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-status-error/10 border border-status-error/20 text-status-error p-6 rounded-lg flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg text-text-primary">Access Denied</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Only Platform Super Admins are authorized to view or manage Customer accounts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="default">Inactive</Badge>;
      case 'SUSPENDED':
        return <Badge variant="warning">Suspended</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  return (
    <ListPage
      title="Customers"
      filterBar={
        <div className="flex items-center justify-between gap-4">
          <FilterBar searchValue={search} onSearchChange={(val) => { setSearch(val); setPage(1); }} />
          <Button onClick={handleOpenAddDrawer} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <DataTableShell>
          <TableHead>
            <TableRow>
              <TableHeader className="text-right"></TableHeader>
              <TableHeader>Customer Code</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Legal Name</TableHeader>
              <TableHeader>Primary Contact</TableHeader>
              <TableHeader>Email / Phone</TableHeader>
              <TableHeader>Industry</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Created On</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-text-muted">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-brand" />
                    <span>Loading customers list...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-status-error font-semibold">
                  {error}
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-text-secondary">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((cust) => (
                <TableRow key={cust.id} className={cust.status === 'INACTIVE' ? 'opacity-60' : ''}>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-start gap-1">
                      <button
                        onClick={() => handleOpenEditDrawer(cust)}
                        className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(cust)}
                        className="p-1.5 text-text-secondary hover:text-status-error hover:bg-status-error/10 rounded-md transition-colors"
                        title="Deactivate Customer"
                        disabled={cust.status === 'INACTIVE'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-text-primary">{cust.customer_code}</TableCell>
                  <TableCell className="font-semibold text-brand">{cust.name}</TableCell>
                  <TableCell>{cust.legal_name || '-'}</TableCell>
                  <TableCell>{cust.primary_contact_name || '-'}</TableCell>
                  <TableCell>
                    {cust.primary_contact_email && <div className="text-xs text-text-primary">{cust.primary_contact_email}</div>}
                    {cust.primary_contact_phone && <div className="text-xs text-text-secondary">{cust.primary_contact_phone}</div>}
                    {!cust.primary_contact_email && !cust.primary_contact_phone && '-'}
                  </TableCell>
                  <TableCell>{cust.industry || '-'}</TableCell>
                  <TableCell>{getStatusBadge(cust.status)}</TableCell>
                  <TableCell>{new Date(cust.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </DataTableShell>

        {/* Pagination */}
        {!loading && customers.length > 0 && (
          <TablePagination 
            totalItems={totalItems} 
            page={page} 
            setPage={setPage} 
            limit={limit} 
            setLimit={setLimit} 
          />
        )}
      </div>

      {/* Add/Edit Drawer */}
      {isDrawerOpen && (
        <DrawerShell80
          title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
          onClose={handleCloseDrawer}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={handleCloseDrawer} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" form="customer-form" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
              </Button>
            </>
          }
        >
          <form id="customer-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <p className="text-sm text-text-secondary -mt-2">
              Fill in the organization, primary contact, and billing address details below.
            </p>

            {drawerError && (
              <div className="bg-semantic-error-light text-semantic-error border border-semantic-error-border rounded-lg p-3 text-sm font-medium">
                {drawerError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Customer Code</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand opacity-75 cursor-not-allowed bg-subtle/50"
                  value={editingCustomer ? form.customer_code : '(Auto-generated)'}
                  disabled={true}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Customer Name *</label>
                <input
                  type="text"
                  required
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. Systechnosoft Technologies"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-sm font-semibold text-text-primary">Legal Name</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. Systechnosoft Technologies Private Limited"
                  value={form.legal_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, legal_name: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Website URL</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. https://systechnosoft.com"
                  value={form.website_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, website_url: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Industry</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. Technology"
                  value={form.industry}
                  onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Company Size</label>
                <select
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand bg-surface"
                  value={form.company_size}
                  onChange={(e) => setForm((prev) => ({ ...prev, company_size: e.target.value }))}
                  disabled={submitting}
                >
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-200">51-200 Employees</option>
                  <option value="201-500">201-500 Employees</option>
                  <option value="501-1000">501-1000 Employees</option>
                  <option value="1000+">1000+ Employees</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Status</label>
                <select
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand bg-surface"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  disabled={submitting}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-sm font-semibold text-text-primary">Allowed Email Domains</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. company.com, company.co.in"
                  value={form.allowed_email_domains_str}
                  onChange={(e) => setForm((prev) => ({ ...prev, allowed_email_domains_str: e.target.value }))}
                  disabled={submitting}
                />
                <span className="text-[10px] text-text-secondary">Comma-separated domains allowed for user self-registration.</span>
              </div>
            </div>

            {/* Primary Contact details */}
            <div className="flex flex-col gap-4 border-t border-border pt-6">
              <span className="font-semibold text-sm text-text-primary">Primary Contact Information</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-semibold text-text-primary">Contact Name</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. John Doe"
                    value={form.primary_contact_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, primary_contact_name: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Contact Email</label>
                  <input
                    type="email"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. john.doe@company.com"
                    value={form.primary_contact_email}
                    onChange={(e) => setForm((prev) => ({ ...prev, primary_contact_email: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Contact Phone</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. +91 9988776655"
                    value={form.primary_contact_phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, primary_contact_phone: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Address Details */}
            <div className="flex flex-col gap-4 border-t border-border pt-6">
              <span className="font-semibold text-sm text-text-primary">Address Information</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-semibold text-text-primary">Address Line 1</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. Suite 402, 4th Floor"
                    value={form.address_line1}
                    onChange={(e) => setForm((prev) => ({ ...prev, address_line1: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-semibold text-text-primary">Address Line 2</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. Systechno Towers, Sector 62"
                    value={form.address_line2}
                    onChange={(e) => setForm((prev) => ({ ...prev, address_line2: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">City</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. Noida"
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">State</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. Uttar Pradesh"
                    value={form.state}
                    onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Country</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. India"
                    value={form.country}
                    onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Postal Code</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. 201301"
                    value={form.postal_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          </form>
        </DrawerShell80>
      )}
    </ListPage>
  );
}
