import { MetricValue,PageTitle, SectionTitle } from "@/components/typography";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Case Study" };

export default function CaseStudy() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 space-y-2 text-center">
        <PageTitle>Case Study</PageTitle>
        <SectionTitle>How contractors grow with platform intelligence</SectionTitle>
      </div>

      <div className="card">
        <SectionTitle className="mb-4">ABC Roofing</SectionTitle>
        <p className="mb-4 text-muted-foreground">
          ABC Roofing increased their claim approval rate by 40% and reduced processing time from
          weeks to days using SkaiScraper&apos;s AI-powered damage assessment.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[{v:'40%', l:'Higher Approval Rate'},{v:'75%', l:'Time Saved'},{v:'$50K', l:'Monthly Revenue Increase'}].map(stat => (
            <div key={stat.l} className="text-center">
              <MetricValue>{stat.v}</MetricValue>
              <div className="text-sm text-muted-foreground">{stat.l}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="default" size="lg">
            <a href="/sign-up">Start Your Success Story</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
