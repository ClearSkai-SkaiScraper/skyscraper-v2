// app/share/report/[token]/page.tsx

import { notFound, redirect } from "next/navigation";

import { getDelegate } from '@/lib/db/modelAliases';

interface ShareReportPageProps {
  params: {
    token: string;
  };
}

export default async function ShareReportPage({ params }: ShareReportPageProps) {
  const { token } = params;

  // Find report by share token
  const report = await getDelegate('reportRecord').findFirst({
    where: {
      shareToken: token,
      shareTokenExpiresAt: {
        gt: new Date(),
      },
    },
    include: {
      org: {
        select: {
          name: true,
          branding: true,
        },
      },
      claim: {
        select: {
          claimNumber: true,
          propertyAddress: true,
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  // Track view
  await getDelegate('reportRecord').update({
    where: { id: report.id },
    data: {
      viewCount: {
        increment: 1,
      },
      lastViewedAt: new Date(),
    },
  });

  // Redirect to PDF URL
  redirect(report.url);
}
