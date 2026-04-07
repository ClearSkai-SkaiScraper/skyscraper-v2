/**
 * PHASE 14 — DEPRECIATION DASHBOARD UI
 * Complete depreciation tracking visualization
 */

'use client';

import { AlertCircle, CheckCircle2, Clock, DollarSign, TrendingUp, XCircle } from 'lucide-react';
import { useEffect,useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from "@/lib/logger";

interface DepreciationDashboardProps {
  claimId: string;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  status: string;
  receivedAt?: string;
  checkNumber?: string;
}

interface DepreciationSummary {
  totalDepreciation: number;
  requestedAmount: number;
  approvedAmount: number;
  issuedAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  status: string;
  lastUpdatedAt: string;
  daysInCurrentStatus: number;
  timeline: Array<{
    event: string;
    timestamp: string;
    amount?: number;
    metadata?: any;
  }>;
}

export default function DepreciationDashboard({ claimId }: DepreciationDashboardProps) {
  const [summary, setSummary] = useState<DepreciationSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchSummary();
  }, [claimId]);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/depreciation/status?claimId=${claimId}`);
      const data = await res.json();
      if (data.exists) {
        setSummary(data.summary);
        setPayments(data.payments || []);
      }
    } catch (error) {
      logger.error('Failed to fetch depreciation summary:', error);
    }
  };

  const markRequested = async () => {
    setLoading(true);
    try {
      await fetch('/api/depreciation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_requested',
          claimId,
          requestedAmount: summary?.totalDepreciation,
          sentTo: 'carrier@example.com',
        }),
      });
      await fetchSummary();
    } catch (error) {
      logger.error('Failed to mark requested:', error);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CLOSED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'RECEIVED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'DENIED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'DELAYED':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOSED':
      case 'RECEIVED':
        return 'bg-green-500';
      case 'DENIED':
        return 'bg-red-500';
      case 'DELAYED':
        return 'bg-amber-500';
      case 'ISSUED':
        return 'bg-blue-500';
      case 'APPROVED':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💰 Depreciation Tracker</CardTitle>
          <CardDescription>Track depreciation release automatically</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => fetchSummary()}>
            Initialize Depreciation Tracker
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Depreciation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">${summary.totalDepreciation.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">${summary.receivedAmount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">${summary.outstandingAmount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(summary.status)}
              <Badge className={getStatusColor(summary.status)}>
                {summary.status}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {summary.daysInCurrentStatus} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>📅 Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.timeline.map((event, i) => (
              <div key={i} className="flex items-start gap-3 border-l-2 border-blue-200 pb-4 pl-4">
                <div className="flex-1">
                  <p className="font-semibold">{event.event}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                  {event.amount && (
                    <p className="mt-1 text-sm font-medium text-green-600">
                      ${event.amount.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>💵 Linked Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div>
                    <p className="font-semibold">{payment.type}</p>
                    {payment.checkNumber && (
                      <p className="text-sm text-gray-500">Check #{payment.checkNumber}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${payment.amount.toFixed(2)}</p>
                    <Badge variant="secondary" className="mt-1">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {summary.status === 'PENDING' && (
        <Card>
          <CardHeader>
            <CardTitle>⚡ Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={markRequested} disabled={loading} className="w-full">
              Mark as Requested from Carrier
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
