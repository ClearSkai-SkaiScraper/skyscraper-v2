"use client";

/**
 * PdfPreview Component
 *
 * Show PDF preview before signing
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Button } from "@/components/ui/button";

// Set worker path
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfPreviewProps {
  pdfUrl: string;
  title?: string;
}

export function PdfPreview({ pdfUrl, title }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function changePage(offset: number) {
    setPageNumber((prevPageNumber) => prevPageNumber + offset);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  return (
    <div className="w-full space-y-4">
      {title && (
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">Review before signing</p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-gray-50">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex h-96 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          }
          error={
            <div className="flex h-96 items-center justify-center text-red-600">
              Failed to load PDF
            </div>
          }
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="max-w-full"
            width={Math.min(window.innerWidth - 48, 800)}
          />
        </Document>
      </div>

      {numPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={previousPage} disabled={pageNumber <= 1} size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          <p className="text-sm text-gray-600">
            Page {pageNumber} of {numPages}
          </p>

          <Button variant="outline" onClick={nextPage} disabled={pageNumber >= numPages} size="sm">
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
