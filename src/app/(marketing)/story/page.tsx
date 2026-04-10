import InvestorDeckEmbed from "@/components/story/InvestorDeckEmbed";
import StoryHero from "@/components/story/StoryHero";
import StorySection from "@/components/story/StorySection";

export const metadata = {
  title: "The SkaiScraper Story | From Survivor to Founder",
  description:
    "How a survivor of storms built the platform that ends them. The official founder story of SkaiScraper.",
};

export default function SkaiScraperStoryPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-gradient-to-b from-black via-slate-900 to-black pb-32">
      <StoryHero />

      <div className="mt-16 w-full max-w-4xl space-y-24 px-6 md:px-0">
        <StorySection title="How It Started">
          <p className="text-lg leading-relaxed text-gray-300">
            SkaiScraper was born in the middle of a storm—literally and spiritually. After surviving
            childhood trauma, homelessness, incarceration, and rebuilding life from the ground up,
            Damien saw firsthand the brokenness of the restoration and insurance process.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-gray-300">
            Homeowners were left confused. Contractors were drowning in paperwork. Insurance
            companies were months behind.
            <span className="font-semibold text-white"> Something had to change.</span>
          </p>
        </StorySection>

        <StorySection title="The Moment Everything Shifted">
          <p className="text-lg leading-relaxed text-gray-300">
            One day, while standing on a damaged roof in northern Arizona with a homeowner crying
            beside him, Damien made the decision:
          </p>

          <p className="mt-4 text-center text-2xl font-semibold italic text-white">
            &quot;If nobody is going to fix this system… I will.&quot;
          </p>

          <p className="mt-6 text-lg leading-relaxed text-gray-300">
            That moment became the foundation of SkaiScraper — a complete, AI-powered restoration
            operating system to rebuild trust, speed, transparency, and hope into an industry that
            desperately needs it.
          </p>
        </StorySection>

        <StorySection title="The Founder's Mission">
          <p className="text-lg leading-relaxed text-gray-300">Damien&apos;s mission is simple:</p>

          <ul className="mt-4 space-y-3 text-lg leading-relaxed text-gray-300">
            <li>• End the chaos in trades & restoration</li>
            <li>• Bring transparency to homeowners</li>
            <li>• Empower contractors with world-class tools</li>
            <li>• Accelerate claim timelines from 47 days to 7</li>
            <li>• Build the future of property loss automation</li>
          </ul>
        </StorySection>

        <StorySection title="The Vision">
          <p className="text-lg leading-relaxed text-gray-300">
            SkaiScraper isn&apos;t just a software platform. It&apos;s a movement to transform a $50 billion
            industry that touches millions of families every year.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-gray-300">
            We&apos;re building the Tesla of property restoration — AI-native, contractor-first, and
            designed for the next decade of climate volatility and storm frequency.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-600/10 p-6 backdrop-blur-sm">
              <div className="text-3xl font-bold text-blue-400">$50.2B</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Total Addressable Market
              </div>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-600/10 p-6 backdrop-blur-sm">
              <div className="text-3xl font-bold text-purple-400">7 Days</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Avg Claim Cycle (vs 47)
              </div>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-600/10 p-6 backdrop-blur-sm">
              <div className="text-3xl font-bold text-green-400">94%</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Contractor Retention
              </div>
            </div>
          </div>
        </StorySection>

        <StorySection title="Investor Deck">
          <p className="mb-6 text-lg leading-relaxed text-gray-300">
            Below is the entire investor pitch deck — the same deck used to raise the SkaiScraper
            seed round.
          </p>
          <InvestorDeckEmbed />
        </StorySection>

        <StorySection title="Want the Full Founder Narrative?">
          <p className="mb-6 text-lg leading-relaxed text-gray-300">
            Read the complete founder memoir-style narrative that powers the SkaiScraper mission and
            brand.
          </p>
          <a
            className="inline-block rounded-xl border border-white/10 bg-white/10 px-6 py-3 font-medium text-white backdrop-blur-xl transition-all hover:bg-white/20"
            href="/investor"
          >
            View Founder Narrative & Investor Materials →
          </a>
        </StorySection>

        <StorySection title="Join the Mission">
          <p className="mb-6 text-lg leading-relaxed text-gray-300">
            Whether you&apos;re a contractor looking to transform your business, a homeowner seeking
            clarity, or an investor ready to back the future of restoration — we&apos;d love to connect.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              className="inline-block rounded-xl bg-gradient-blue px-6 py-3 font-semibold text-white transition-all hover:shadow-xl"
              href="/pricing"
            >
              See Pricing
            </a>
            <a
              className="inline-block rounded-xl border border-white/10 bg-white/10 px-6 py-3 font-medium text-white backdrop-blur-xl transition-all hover:bg-white/20"
              href="/sign-in"
            >
              Sign In
            </a>
            <a
              className="inline-block rounded-xl border border-white/10 bg-white/10 px-6 py-3 font-medium text-white backdrop-blur-xl transition-all hover:bg-white/20"
              href="mailto:damien@skaiscrape.com"
            >
              Contact Founder
            </a>
          </div>
        </StorySection>
      </div>
    </main>
  );
}
