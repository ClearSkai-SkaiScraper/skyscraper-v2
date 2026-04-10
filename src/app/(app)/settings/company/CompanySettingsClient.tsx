"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { logger } from "@/lib/logger";

const companySchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  ownerName: z.string().optional(),
  licenseNumber: z.string().optional(),
  bondNumber: z.string().optional(),
  insuranceCarrier: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  googleBusiness: z.string().optional(),
  bio: z.string().optional(),
  missionStatement: z.string().optional(),
  availabilityHours: z.string().optional(),
  emergencyService: z.boolean(),
  yearsInBusiness: z.number().int().min(0).optional(),
  serviceRadiusMiles: z.number().int().min(0).optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanySettingsClientProps {
  org: { id: string; name: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
}

export function CompanySettingsClient({ org, profile }: CompanySettingsClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serviceAreas, setServiceAreas] = useState<string[]>(profile?.serviceAreas || []);
  const [primaryServices, setPrimaryServices] = useState<string[]>(profile?.primaryServices || []);
  const [newArea, setNewArea] = useState("");
  const [newService, setNewService] = useState("");

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      businessName: profile?.businessName || org.name,
      ownerName: profile?.ownerName || "",
      licenseNumber: profile?.licenseNumber || "",
      bondNumber: profile?.bondNumber || "",
      insuranceCarrier: profile?.insuranceCarrier || "",
      insurancePolicyNumber: profile?.insurancePolicyNumber || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      website: profile?.website || "",
      facebook: profile?.facebook || "",
      instagram: profile?.instagram || "",
      googleBusiness: profile?.googleBusiness || "",
      bio: profile?.bio || "",
      missionStatement: profile?.missionStatement || "",
      availabilityHours: profile?.availabilityHours || "",
      emergencyService: profile?.emergencyService || false,
      yearsInBusiness: profile?.yearsInBusiness || 0,
      serviceRadiusMiles: profile?.serviceRadiusMiles || 50,
    },
  });

  const onSubmit = async (data: CompanyFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/contractor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: org.id,
          ...data,
          serviceAreas,
          primaryServices,
        }),
      });

      if (!response.ok) {
        toast.error("Failed to update company profile. Please try again.");
        setIsLoading(false);
        return;
      }

      toast.success("Company profile updated successfully");
    } catch (error) {
      logger.error("Company update error:", error);
      toast.error("Failed to update company profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Company details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Roofing LLC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yearsInBusiness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years in Business</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@acmeroofing.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Information</CardTitle>
            <CardDescription>Define your service areas and capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FormLabel>Service Areas (ZIP Codes)</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="90210"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newArea.trim() && !serviceAreas.includes(newArea.trim())) {
                        setServiceAreas([...serviceAreas, newArea.trim()]);
                        setNewArea("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (newArea.trim() && !serviceAreas.includes(newArea.trim())) {
                      setServiceAreas([...serviceAreas, newArea.trim()]);
                      setNewArea("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {serviceAreas.map((area) => (
                  <Badge key={area} variant="secondary">
                    {area}
                    <button
                      type="button"
                      onClick={() => setServiceAreas(serviceAreas.filter((a) => a !== area))}
                      className="ml-2 hover:text-destructive"
                      aria-label="Remove service area"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <FormLabel>Primary Services</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Roof Inspection"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newService.trim() && !primaryServices.includes(newService.trim())) {
                        setPrimaryServices([...primaryServices, newService.trim()]);
                        setNewService("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (newService.trim() && !primaryServices.includes(newService.trim())) {
                      setPrimaryServices([...primaryServices, newService.trim()]);
                      setNewService("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {primaryServices.map((service) => (
                  <Badge key={service} variant="secondary">
                    {service}
                    <button
                      type="button"
                      onClick={() =>
                        setPrimaryServices(primaryServices.filter((s) => s !== service))
                      }
                      className="ml-2 hover:text-destructive"
                      aria-label="Remove service"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="emergencyService"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">24/7 Emergency Service</FormLabel>
                    <FormDescription>
                      Offer emergency services outside regular business hours
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Company Profile"}
        </Button>
      </form>
    </Form>
  );
}
