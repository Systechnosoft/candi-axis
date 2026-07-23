import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';

export function OfferStatusCard({ status, amount, dateSent }: { status: string; amount: string; dateSent: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[14px]">Offer Details</CardTitle>
        <Badge variant="success">{status}</Badge>
      </CardHeader>
      <CardContent>
        <div className="mt-2 space-y-3">
          <div className="flex justify-between text-[13px]">
            <span className="text-text-secondary">Base Salary</span>
            <span className="font-medium text-text-primary">{amount}</span>
          </div>
          <div className="flex justify-between text-[13px] pb-4 border-b border-border">
            <span className="text-text-secondary">Date Sent</span>
            <span className="text-text-primary">{dateSent}</span>
          </div>
          <div className="pt-2 flex gap-2">
            <Button variant="secondary" size="sm" className="w-full">View Document</Button>
            <Button variant="primary" size="sm" className="w-full">Update Status</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
