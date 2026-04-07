import { motion } from "framer-motion";
import { AlertCircle,CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import React, { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface Job {
  id: string;
  address: string;
  jobType: string;
  status: "processing" | "completed" | "failed" | "pending";
  createdAt: string;
  updatedAt: string;
}

export const JobHistoryPanel: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs/list");
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      logger.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Job["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "processing":
        return <Clock className="h-5 w-5 animate-spin text-blue-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: Job["status"]) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "processing":
        return "Processing...";
      case "failed":
        return "Failed";
      default:
        return "Pending";
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/4 rounded bg-gray-200"></div>
          <div className="h-16 rounded bg-gray-200"></div>
          <div className="h-16 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <FileText className="h-6 w-6" />
          Recent Jobs
        </h2>
        <span className="text-sm text-gray-600">{jobs.length} total</span>
      </div>

      {jobs.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <p className="mb-2 text-gray-600">No jobs yet</p>
          <p className="text-sm text-gray-500">Create your first job with the AI Wizard</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-gray-900">{job.address}</h3>
                  <p className="text-sm capitalize text-gray-600">{job.jobType}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(job.createdAt).toLocaleDateString()} at{" "}
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {getStatusIcon(job.status)}
                  <span className="font-medium">{getStatusText(job.status)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
