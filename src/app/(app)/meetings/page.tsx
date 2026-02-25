"use client";

import { useUser } from "@clerk/nextjs";
import { Calendar, Phone, PlayCircle, StopCircle, Users, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export default function VideoConferencingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const [isInMeeting, setIsInMeeting] = useState(false);
  const [upcomingMeetings] = useState([
    {
      id: "1",
      title: "Client Consultation - John Smith",
      time: "2:00 PM Today",
      participants: 3,
    },
    {
      id: "2",
      title: "Team Standup",
      time: "9:00 AM Tomorrow",
      participants: 8,
    },
  ]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">Video Conferencing</h1>
        <p className="text-gray-600">Built-in video calls and screen sharing</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Button onClick={() => setIsInMeeting(true)} className="h-auto justify-start gap-3 p-6">
          <Video className="h-8 w-8" />
          <div className="text-left">
            <div className="font-bold">Start Instant Meeting</div>
            <div className="text-sm text-blue-100">Begin video call now</div>
          </div>
        </Button>

        <Button className="h-auto justify-start gap-3 bg-green-600 p-6 hover:bg-green-700">
          <Calendar className="h-8 w-8" />
          <div className="text-left">
            <div className="font-bold">Schedule Meeting</div>
            <div className="text-sm text-green-100">Plan for later</div>
          </div>
        </Button>

        <Button className="h-auto justify-start gap-3 bg-purple-600 p-6 hover:bg-purple-700">
          <Phone className="h-8 w-8" />
          <div className="text-left">
            <div className="font-bold">Join Meeting</div>
            <div className="text-sm text-purple-100">Enter meeting ID</div>
          </div>
        </Button>
      </div>

      {/* Active Meeting View */}
      {isInMeeting && (
        <div className="overflow-hidden rounded-lg bg-black">
          <div className="flex aspect-video items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
              <Video className="mx-auto mb-4 h-24 w-24 opacity-50" />
              <p className="mb-2 text-2xl font-semibold">Meeting in Progress</p>
              <p className="text-gray-400">Video feed would display here</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 bg-gray-900 p-4">
            <Button size="icon" className="h-12 w-12 rounded-full">
              <Video className="h-6 w-6" />
            </Button>
            <Button size="icon" className="h-12 w-12 rounded-full">
              <Phone className="h-6 w-6" />
            </Button>
            <Button size="icon" className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700">
              <PlayCircle className="h-6 w-6" />
            </Button>
            <Button
              onClick={() => setIsInMeeting(false)}
              size="icon"
              className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700"
            >
              <StopCircle className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Upcoming Meetings */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-xl font-bold">Upcoming Meetings</h2>
        </div>
        <div className="divide-y">
          {upcomingMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-center justify-between p-6 hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">{meeting.title}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {meeting.time}
                    <Users className="ml-2 h-4 w-4" />
                    {meeting.participants} participants
                  </div>
                </div>
              </div>
              <Button>Join</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
