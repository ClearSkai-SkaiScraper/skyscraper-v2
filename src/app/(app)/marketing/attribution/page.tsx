"use client";

import { useUser } from "@clerk/nextjs";
import { DollarSign, Target, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StatCard } from "@/components/ui/MetricCard";

interface Campaign {
  id: string;
  name: string;
  source: string;
  spent: number;
  leads: number;
  conversions: number;
  revenue: number;
}

export default function MarketingAttributionPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const [campaigns] = useState<Campaign[]>([
    {
      id: "1",
      name: "Facebook - Summer Roofing",
      source: "facebook",
      spent: 2500,
      leads: 45,
      conversions: 12,
      revenue: 48000,
    },
    {
      id: "2",
      name: "Google Ads - Emergency Repair",
      source: "google",
      spent: 1800,
      leads: 32,
      conversions: 8,
      revenue: 28000,
    },
    {
      id: "3",
      name: "Referral Program",
      source: "referral",
      spent: 500,
      leads: 18,
      conversions: 9,
      revenue: 35000,
    },
  ]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const calculateROI = (revenue: number, spent: number) => {
    return (((revenue - spent) / spent) * 100).toFixed(0);
  };

  const calculateCostPerLead = (spent: number, leads: number) => {
    return (spent / leads).toFixed(2);
  };

  const calculateConversionRate = (conversions: number, leads: number) => {
    return ((conversions / leads) * 100).toFixed(1);
  };

  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
  const overallROI = calculateROI(totalRevenue, totalSpent);

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">
          Marketing Attribution & ROI
        </h1>
        <p className="text-gray-600">Lead source tracking and campaign performance analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          variant="gradient"
          gradientColor="blue"
          label="Total Spent"
          value={`$${totalSpent.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />

        <StatCard
          variant="gradient"
          gradientColor="success"
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />

        <StatCard
          variant="gradient"
          gradientColor="purple"
          label="Total Leads"
          value={totalLeads}
          icon={<Users className="h-5 w-5" />}
        />

        <StatCard
          variant="gradient"
          gradientColor="warning"
          label="Overall ROI"
          value={`${overallROI}%`}
          icon={<Target className="h-5 w-5" />}
        />
      </div>

      {/* Campaign Performance */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-xl font-bold">Campaign Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Campaign</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Spent</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Leads</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                  Cost/Lead
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                  Conversions
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                  Conv. Rate
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Revenue</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((campaign) => {
                const roi = Number(calculateROI(campaign.revenue, campaign.spent));
                const costPerLead = calculateCostPerLead(campaign.spent, campaign.leads);
                const convRate = calculateConversionRate(campaign.conversions, campaign.leads);
                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm capitalize text-gray-500">{campaign.source}</div>
                    </td>
                    <td className="px-6 py-4 text-right">${campaign.spent.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">{campaign.leads}</td>
                    <td className="px-6 py-4 text-right">${costPerLead}</td>
                    <td className="px-6 py-4 text-right">{campaign.conversions}</td>
                    <td className="px-6 py-4 text-right">{convRate}%</td>
                    <td className="px-6 py-4 text-right font-medium text-green-600">
                      ${campaign.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          roi > 1000
                            ? "bg-green-100 text-green-700"
                            : roi > 500
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {roi}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Conversion Funnel</h2>
        <div className="space-y-4">
          {[
            { stage: "Leads", count: totalLeads, color: "blue" },
            { stage: "Qualified", count: Math.round(totalLeads * 0.7), color: "purple" },
            { stage: "Quoted", count: Math.round(totalLeads * 0.4), color: "yellow" },
            { stage: "Conversions", count: totalConversions, color: "green" },
          ].map((item, idx) => {
            const width = idx === 0 ? 100 : (item.count / totalLeads) * 100;
            return (
              <div key={item.stage} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium">{item.stage}</div>
                <div className="flex-1">
                  <div className="h-12 overflow-hidden rounded-lg bg-gray-100">
                    <div
                      className={`bg- h-full${item.color}-500 flex items-center justify-center font-bold text-white transition-all`}
                      style={{ width: `${width}%` }}
                    >
                      {item.count}
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right text-sm text-gray-600">{width.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
