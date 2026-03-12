/**
 * /ai — AI Tools Hub
 * Landing page for all AI-powered features
 */
import { Brain, FileSearch, FileText, Scale, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";

const tools = [
  {
    name: "Bad Faith Analysis",
    description: "AI-powered bad faith detection and carrier behavior scoring",
    href: "/ai/bad-faith",
    icon: Scale,
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
  {
    name: "Claims Analysis",
    description: "Deep-dive AI analysis of claim data and approval probability",
    href: "/ai/claims-analysis",
    icon: FileSearch,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  {
    name: "Smart Actions",
    description: "Intelligent workflow automations and next-step suggestions",
    href: "/ai/smart-actions",
    icon: Sparkles,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  {
    name: "Report Assembly",
    description: "AI-powered report generation with section templates",
    href: "/ai/report-assembly",
    icon: FileText,
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  {
    name: "Supplement Builder",
    description: "Generate supplement requests with AI justification",
    href: "/ai/supplement-builder",
    icon: Wrench,
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  },
  {
    name: "Rebuttal Builder",
    description: "Draft carrier rebuttal letters with precedent citations",
    href: "/ai/rebuttal-builder",
    icon: Scale,
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  {
    name: "Depreciation Calculator",
    description: "AI-enhanced depreciation and RCV/ACV calculations",
    href: "/ai/depreciation-calculator",
    icon: Brain,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  },
];

export default function AIToolsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Tools</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          AI-powered tools to accelerate claims processing, analysis, and reporting
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
          >
            <div className={`mb-3 inline-flex rounded-lg p-2.5 ${tool.color}`}>
              <tool.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
              {tool.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
