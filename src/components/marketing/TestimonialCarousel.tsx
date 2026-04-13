"use client";

import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  location: string;
  initials: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "SkaiScraper cut our claim processing time in half. The AI damage reports are so good that adjusters rarely push back anymore.",
    author: "Marcus Johnson",
    role: "Owner",
    company: "Johnson Roofing & Restoration",
    location: "Denver, CO",
    initials: "MJ",
    rating: 5,
  },
  {
    quote:
      "We recovered an extra $87,000 in supplements last quarter using the AI analysis. The platform paid for itself 10x over.",
    author: "Lisa Martinez",
    role: "Claims Manager",
    company: "Integrity Storm Solutions",
    location: "Houston, TX",
    initials: "LM",
    rating: 5,
  },
  {
    quote:
      "The client portal changed everything. Homeowners love being able to check their claim status 24/7. Our customer satisfaction scores are through the roof.",
    author: "David Park",
    role: "Operations Director",
    company: "Blue Ridge Exteriors",
    location: "Charlotte, NC",
    initials: "DP",
    rating: 5,
  },
  {
    quote:
      "From door knock to close, we track everything in one place. My sales team went from chaos to a real pipeline in two weeks.",
    author: "Amanda Foster",
    role: "Sales Manager",
    company: "Elite Storm Pros",
    location: "Oklahoma City, OK",
    initials: "AF",
    rating: 5,
  },
  {
    quote:
      "The weather verification reports are bulletproof. We haven't lost a single storm date dispute since we started using SkaiScraper.",
    author: "Robert Chen",
    role: "Owner",
    company: "Precision Roofing",
    location: "Phoenix, AZ",
    initials: "RC",
    rating: 5,
  },
];

interface TestimonialCarouselProps {
  className?: string;
  autoPlay?: boolean;
  interval?: number;
}

export function TestimonialCarousel({
  className,
  autoPlay = true,
  interval = 5000,
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (autoPlay && !isHovered) {
      const timer = setInterval(goToNext, interval);
      return () => clearInterval(timer);
    }
  }, [autoPlay, interval, isHovered, goToNext]);

  const testimonial = TESTIMONIALS[currentIndex];

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mx-auto max-w-3xl">
        {/* Quote Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#117CFF]/10">
            <Quote className="h-8 w-8 text-[#117CFF]" />
          </div>
        </div>

        {/* Stars */}
        <div className="mb-6 flex justify-center gap-1">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-[#FFC838] text-[#FFC838]" />
          ))}
        </div>

        {/* Quote */}
        <blockquote className="mb-8 text-center">
          <p className="text-xl font-medium leading-relaxed text-foreground md:text-2xl">
            &ldquo;{testimonial.quote}&rdquo;
          </p>
        </blockquote>

        {/* Author */}
        <div className="flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#117CFF] to-[#004AAD] text-lg font-bold text-white">
            {testimonial.initials}
          </div>
          <p className="font-semibold text-foreground">{testimonial.author}</p>
          <p className="text-sm text-muted-foreground">
            {testimonial.role}, {testimonial.company}
          </p>
          <p className="text-xs text-muted-foreground">{testimonial.location}</p>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={goToPrev}
            className="rounded-full border p-2 transition-colors hover:bg-muted"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex gap-2">
            {TESTIMONIALS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  index === currentIndex
                    ? "w-6 bg-[#117CFF]"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            className="rounded-full border p-2 transition-colors hover:bg-muted"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
