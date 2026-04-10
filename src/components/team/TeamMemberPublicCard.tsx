"use client";
import { MoreVertical } from "lucide-react";
import Link from "next/link";

export interface PublicMemberProfile {
  id: string;
  name: string | null;
  title?: string | null;
  headshotUrl?: string | null;
  bio?: string | null;
  yearsExperience?: number | null;
  certifications?: any;
  publicSkills?: any;
  clientTestimonials?: any;
}

export function TeamMemberPublicCard({ member }: { member: PublicMemberProfile }) {
  const years = member.yearsExperience ?? 0;
  const skills = Array.isArray(member.publicSkills) ? member.publicSkills : [];
  const certs = Array.isArray(member.certifications) ? member.certifications : [];
  const testimonials = Array.isArray(member.clientTestimonials) ? member.clientTestimonials : [];
  return (
    <div className="group relative flex flex-col rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="relative">
          {member.headshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.headshotUrl}
              alt={member.name || "Profile"}
              className="h-16 w-16 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xl font-semibold text-white">
              {(member.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">
            {member.name || "Team Member"}
            {member.title && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {member.title}
              </span>
            )}
          </h3>
          {member.bio && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{member.bio}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Experience: {years} yr{years === 1 ? "" : "s"}</p>
          {skills.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Skills: {skills.slice(0,5).join(", ")}{skills.length>5?"…":""}</p>
          )}
          {certs.length > 0 && (
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Certifications: {certs.slice(0,4).join(", ")}{certs.length>4?"…":""}</p>
          )}
        </div>
        <div className="rounded-lg p-2 text-muted-foreground opacity-0 transition group-hover:opacity-100">
          <MoreVertical className="h-5 w-5" />
        </div>
      </div>
      {testimonials.length > 0 && (
        <div className="mt-4 space-y-2">
          {testimonials.slice(0,2).map((t: any, i: number) => (
            <blockquote key={i} className="rounded-md bg-muted/40 p-3 text-xs italic text-muted-foreground">
              “{typeof t === 'string' ? t : t?.quote || ''}”
            </blockquote>
          ))}
          {testimonials.length > 2 && (
            <Link href={`/network/member/${member.id}`} className="text-[10px] font-medium text-primary hover:underline">
              View all testimonials →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
