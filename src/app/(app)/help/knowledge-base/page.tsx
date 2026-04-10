"use client";

import { useUser } from "@clerk/nextjs";
import { BookOpen, FileText,Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Article {
  id: string;
  title: string;
  category: string;
  views: number;
  updated: string;
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isLoaded, isSignedIn } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [articles] = useState<Article[]>([
    {
      id: "1",
      title: "How to Create a New Job",
      category: "Getting Started",
      views: 245,
      updated: "2024-12-01",
    },
    {
      id: "2",
      title: "Managing Client Information",
      category: "Clients",
      views: 189,
      updated: "2024-11-28",
    },
    {
      id: "3",
      title: "Understanding the Claims Process",
      category: "Insurance Claims",
      views: 523,
      updated: "2024-11-15",
    },
    {
      id: "4",
      title: "Setting Up Your Team",
      category: "Administration",
      views: 156,
      updated: "2024-11-10",
    },
  ]);

  const categories = [
    { name: "Getting Started", count: 12, icon: "🚀" },
    { name: "Jobs & Projects", count: 24, icon: "🏗️" },
    { name: "Clients", count: 18, icon: "👥" },
    { name: "Insurance Claims", count: 32, icon: "📋" },
    { name: "Billing & Payments", count: 15, icon: "💰" },
    { name: "Administration", count: 21, icon: "⚙️" },
  ];

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">
          Knowledge Base & Help Center
        </h1>
        <p className="text-gray-600">Internal wiki, FAQs, and training materials</p>
      </div>

      {/* Search Bar */}
      <div className="rounded-lg bg-white p-8 shadow">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help articles, guides, or tutorials..."
            className="w-full rounded-lg border-2 py-4 pl-14 pr-4 text-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-3 gap-4">
        {categories.map((category) => (
          <div
            key={category.name}
            className="cursor-pointer rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg"
          >
            <div className="mb-3 flex items-start justify-between">
              <span className="text-4xl">{category.icon}</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                {category.count} articles
              </span>
            </div>
            <h3 className="text-lg font-bold">{category.name}</h3>
          </div>
        ))}
      </div>

      {/* Popular Articles */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Popular Articles
          </h2>
        </div>
        <div className="divide-y">
          {articles.map((article) => (
            <div key={article.id} className="cursor-pointer p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-bold">{article.title}</h3>
                  </div>
                  <div className="ml-8 flex items-center gap-4 text-sm text-gray-600">
                    <span className="rounded bg-gray-100 px-2 py-1">{article.category}</span>
                    <span>{article.views} views</span>
                    <span>Updated {new Date(article.updated).toLocaleDateString()}</span>
                  </div>
                </div>
                <button className="rounded border border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50">
                  Read
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg bg-gradient-blue p-6 text-white transition hover:opacity-95">
          <h3 className="mb-2 text-xl font-bold">Video Tutorials</h3>
          <p className="mb-4 text-blue-100">Watch step-by-step video guides</p>
          <button className="rounded bg-white px-4 py-2 font-medium text-blue-600 hover:bg-blue-50">
            Browse Videos
          </button>
        </div>

        <div className="rounded-lg bg-gradient-success p-6 text-white transition hover:opacity-95">
          <h3 className="mb-2 text-xl font-bold">Contact Support</h3>
          <p className="mb-4 text-green-100">Need help? Our team is here for you</p>
          <button className="rounded bg-white px-4 py-2 font-medium text-green-600 hover:bg-green-50">
            Get Help
          </button>
        </div>
      </div>
    </div>
  );
}
