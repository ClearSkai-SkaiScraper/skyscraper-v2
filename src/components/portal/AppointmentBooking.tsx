"use client";

import { Calendar, MapPin, Phone, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

interface AppointmentBookingProps {
  claimId: string;
  contractorName: string;
  contractorPhone?: string;
  className?: string;
}

export function AppointmentBooking({
  claimId,
  contractorName,
  contractorPhone,
  className,
}: AppointmentBookingProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<"in-person" | "video">("in-person");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  // Generate next 7 days of availability
  const generateDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      // Skip weekends
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date.toISOString().split("T")[0]);
      }
    }
    return dates;
  };

  const dates = generateDates();

  const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portal/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          date: selectedDate,
          time: selectedTime,
          type: appointmentType,
          notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to book appointment");

      toast.success("Appointment request sent! You'll receive a confirmation shortly.");
      setSelectedDate(null);
      setSelectedTime(null);
      setNotes("");
    } catch {
      toast.error("Unable to book appointment. Please try again or call directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
    };
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#117CFF]/10">
          <Calendar className="h-6 w-6 text-[#117CFF]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Schedule an Inspection</h3>
          <p className="text-sm text-muted-foreground">Book a time with {contractorName}</p>
        </div>
      </div>

      {/* Appointment Type */}
      <div>
        <label className="mb-3 block text-sm font-medium">Appointment Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAppointmentType("in-person")}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 transition-all",
              appointmentType === "in-person" ? "border-[#117CFF] bg-[#117CFF]/5" : "hover:bg-muted"
            )}
          >
            <MapPin
              className={cn(
                "h-5 w-5",
                appointmentType === "in-person" ? "text-[#117CFF]" : "text-muted-foreground"
              )}
            />
            <div className="text-left">
              <p className="text-sm font-medium">In-Person</p>
              <p className="text-xs text-muted-foreground">At your property</p>
            </div>
          </button>
          <button
            onClick={() => setAppointmentType("video")}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 transition-all",
              appointmentType === "video" ? "border-[#117CFF] bg-[#117CFF]/5" : "hover:bg-muted"
            )}
          >
            <Video
              className={cn(
                "h-5 w-5",
                appointmentType === "video" ? "text-[#117CFF]" : "text-muted-foreground"
              )}
            />
            <div className="text-left">
              <p className="text-sm font-medium">Video Call</p>
              <p className="text-xs text-muted-foreground">Virtual meeting</p>
            </div>
          </button>
        </div>
      </div>

      {/* Date Selection */}
      <div>
        <label className="mb-3 block text-sm font-medium">Select a Date</label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((date) => {
            const formatted = formatDate(date);
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "w-16 flex-shrink-0 rounded-xl border p-3 text-center transition-all",
                  selectedDate === date
                    ? "border-[#117CFF] bg-[#117CFF] text-white"
                    : "hover:bg-muted"
                )}
              >
                <p className="text-xs font-medium">{formatted.day}</p>
                <p className="text-lg font-bold">{formatted.date}</p>
                <p className="text-xs">{formatted.month}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div>
          <label className="mb-3 block text-sm font-medium">Select a Time</label>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={cn(
                  "rounded-lg border p-3 text-sm font-medium transition-all",
                  selectedTime === time
                    ? "border-[#117CFF] bg-[#117CFF] text-white"
                    : "hover:bg-muted"
                )}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {selectedDate && selectedTime && (
        <div>
          <label className="mb-2 block text-sm font-medium">Additional Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions or areas of concern..."
            className="h-24 w-full resize-none rounded-xl border bg-background p-3 text-sm"
          />
        </div>
      )}

      {/* Submit Button */}
      <Button
        className="w-full bg-[#117CFF] hover:bg-[#0066DD]"
        disabled={!selectedDate || !selectedTime || isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting ? (
          "Booking..."
        ) : (
          <>
            <Calendar className="mr-2 h-4 w-4" />
            Request Appointment
          </>
        )}
      </Button>

      {/* Direct Contact */}
      {contractorPhone && (
        <div className="border-t pt-4 text-center">
          <p className="mb-2 text-sm text-muted-foreground">Need to speak with someone now?</p>
          <a
            href={`tel:${contractorPhone}`}
            className="inline-flex items-center gap-2 font-medium text-[#117CFF] hover:underline"
          >
            <Phone className="h-4 w-4" />
            {contractorPhone}
          </a>
        </div>
      )}
    </div>
  );
}
