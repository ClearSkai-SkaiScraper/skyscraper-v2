"use client";

import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface CreateClaimWizardProps {
  onSuccess?: () => void;
  preselectedContactId?: string;
  preselectedPropertyId?: string;
}

interface ValidationErrors {
  [key: string]: string;
}

export default function CreateClaimWizard({
  onSuccess,
  preselectedContactId,
  preselectedPropertyId,
}: CreateClaimWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [createNewContact, setCreateNewContact] = useState(false);
  const [createNewProperty, setCreateNewProperty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const [aiEstimate, setAiEstimate] = useState<{
    value: string;
    confidence: number;
    breakdown: any;
  } | null>(null);
  const [loadingAiEstimate, setLoadingAiEstimate] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Insured Info
    claimNumber: "",
    contact_id: preselectedContactId || "",
    newContactFirstName: "",
    newContactLastName: "",
    newContactEmail: "",
    newContactPhone: "",

    // Step 2: Property/Loss Details
    property_id: preselectedPropertyId || "",
    newPropertyAddress: "",
    newPropertyCity: "",
    newPropertyState: "",
    newPropertyZip: "",
    newPropertyLatitude: "",
    newPropertyLongitude: "",
    insuranceCompany: "",
    dateOfLoss: "",
    typeOfLoss: "",
    description: "",
    estimatedValue: "",

    // Meta
    status: "NEW" as const,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [contactsRes, propertiesRes] = await Promise.all([
          fetch("/api/contacts"),
          fetch("/api/properties"),
        ]);

        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setContacts(contactsData);
        }

        if (propertiesRes.ok) {
          const propertiesData = await propertiesRes.json();
          setProperties(propertiesData);
        }
      } catch (error) {
        logger.error("Error loading data:", error);
      }
    };

    void loadData();
  }, []);

  // Real-time validation
  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case "claimNumber":
        return value.trim() === "" ? "Claim number is required" : "";
      case "newContactFirstName":
        return createNewContact && value.trim() === "" ? "First name is required" : "";
      case "newContactLastName":
        return createNewContact && value.trim() === "" ? "Last name is required" : "";
      case "newContactEmail":
        if (createNewContact) {
          if (value.trim() === "") return "Email is required";
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return !emailRegex.test(value) ? "Invalid email format" : "";
        }
        return "";
      case "newContactPhone":
        if (createNewContact && value.trim() !== "") {
          const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
          return !phoneRegex.test(value) ? "Invalid phone format (XXX-XXX-XXXX)" : "";
        }
        return "";
      case "contact_id":
        return !createNewContact && value.trim() === "" ? "Please select a contact" : "";
      case "property_id":
        return !createNewProperty && value.trim() === "" ? "Please select a property" : "";
      case "newPropertyAddress":
        return createNewProperty && value.trim() === "" ? "Address is required" : "";
      case "newPropertyCity":
        return createNewProperty && value.trim() === "" ? "City is required" : "";
      case "newPropertyState":
        return createNewProperty && value.trim() === "" ? "State is required" : "";
      case "newPropertyZip":
        if (createNewProperty) {
          if (value.trim() === "") return "ZIP code is required";
          const zipRegex = /^\d{5}(-\d{4})?$/;
          return !zipRegex.test(value) ? "Invalid ZIP code format" : "";
        }
        return "";
      case "insuranceCompany":
        return value.trim() === "" ? "Insurance company is required" : "";
      case "dateOfLoss":
        return value.trim() === "" ? "Date of loss is required" : "";
      case "typeOfLoss":
        return value.trim() === "" ? "Type of loss is required" : "";
      default:
        return "";
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Mark field as touched
    setTouchedFields((prev) => new Set(prev).add(field));

    // Validate field
    const error = validateField(field, value);
    setValidationErrors((prev) => ({
      ...prev,
      [field]: error,
    }));

    // Trigger AI estimate when relevant fields change
    if (["typeOfLoss", "dateOfLoss", "property_id", "newPropertyAddress"].includes(field)) {
      void fetchAiEstimate();
    }
  };

  const handleBlur = (field: string) => {
    setTouchedFields((prev) => new Set(prev).add(field));
    const error = validateField(field, formData[field as keyof typeof formData] as string);
    setValidationErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {};

    if (step === 1) {
      // Validate Step 1: Insured Info
      errors.claimNumber = validateField("claimNumber", formData.claimNumber);

      if (createNewContact) {
        errors.newContactFirstName = validateField(
          "newContactFirstName",
          formData.newContactFirstName
        );
        errors.newContactLastName = validateField(
          "newContactLastName",
          formData.newContactLastName
        );
        errors.newContactEmail = validateField("newContactEmail", formData.newContactEmail);
        errors.newContactPhone = validateField("newContactPhone", formData.newContactPhone);
      } else {
        errors.contact_id = validateField("contact_id", formData.contact_id);
      }
    } else if (step === 2) {
      // Validate Step 2: Property/Loss Details
      if (createNewProperty) {
        errors.newPropertyAddress = validateField(
          "newPropertyAddress",
          formData.newPropertyAddress
        );
        errors.newPropertyCity = validateField("newPropertyCity", formData.newPropertyCity);
        errors.newPropertyState = validateField("newPropertyState", formData.newPropertyState);
        errors.newPropertyZip = validateField("newPropertyZip", formData.newPropertyZip);
      } else {
        errors.property_id = validateField("property_id", formData.property_id);
      }

      errors.insuranceCompany = validateField("insuranceCompany", formData.insuranceCompany);
      errors.dateOfLoss = validateField("dateOfLoss", formData.dateOfLoss);
      errors.typeOfLoss = validateField("typeOfLoss", formData.typeOfLoss);
    }

    setValidationErrors(errors);

    // Return true if no errors
    return !Object.values(errors).some((error) => error !== "");
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    } else {
      toast.error("Please fix the errors before proceeding");
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const fetchAiEstimate = async () => {
    if (!formData.typeOfLoss) return;

    setLoadingAiEstimate(true);
    try {
      const propertyAddress = formData.property_id
        ? properties.find((p) => p.id === formData.property_id)?.address
        : formData.newPropertyAddress;

      const response = await fetch("/api/ai/estimate-value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          damageType: formData.typeOfLoss,
          propertyAddress,
          dateOfLoss: formData.dateOfLoss,
          propertyType: "Single Family",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiEstimate({
          value: data.estimatedValueFormatted,
          confidence: data.confidence,
          breakdown: data.breakdown,
        });
      }
    } catch (error) {
      logger.error("Failed to fetch AI estimate:", error);
    } finally {
      setLoadingAiEstimate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(2)) {
      toast.error("Please fix all errors before submitting");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        claimNumber: formData.claimNumber,
        contact_id: createNewContact ? undefined : formData.contact_id,
        property_id: createNewProperty ? undefined : formData.property_id,
        insuranceCompany: formData.insuranceCompany,
        dateOfLoss: formData.dateOfLoss,
        typeOfLoss: formData.typeOfLoss,
        description: formData.description,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
        status: formData.status,

        ...(createNewContact && {
          newContact: {
            firstName: formData.newContactFirstName,
            lastName: formData.newContactLastName,
            email: formData.newContactEmail,
            phone: formData.newContactPhone,
          },
        }),

        ...(createNewProperty && {
          newProperty: {
            address: formData.newPropertyAddress,
            city: formData.newPropertyCity,
            state: formData.newPropertyState,
            zipCode: formData.newPropertyZip,
            latitude: formData.newPropertyLatitude
              ? parseFloat(formData.newPropertyLatitude)
              : null,
            longitude: formData.newPropertyLongitude
              ? parseFloat(formData.newPropertyLongitude)
              : null,
          },
        }),
      };

      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create claim");
      }

      const claim = await response.json();
      toast.success("Claim created successfully");

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/claims/${claim.id}`);
      }
    } catch (error) {
      logger.error("Error creating claim:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create claim");
    } finally {
      setIsLoading(false);
    }
  };

  const isFieldValid = (fieldName: string): boolean => {
    return touchedFields.has(fieldName) && !validationErrors[fieldName];
  };

  const isFieldInvalid = (fieldName: string): boolean => {
    return touchedFields.has(fieldName) && !!validationErrors[fieldName];
  };

  const getFieldClassName = (fieldName: string): string => {
    const baseClass = "w-full rounded-lg border px-3 py-2 transition-all";
    if (isFieldValid(fieldName)) {
      return `${baseClass} border-green-500 bg-green-50 dark:bg-green-900/10 focus:ring-2 focus:ring-green-500`;
    }
    if (isFieldInvalid(fieldName)) {
      return `${baseClass} border-red-500 bg-red-50 dark:bg-red-900/10 focus:ring-2 focus:ring-red-500`;
    }
    return `${baseClass} border-[color:var(--border)] bg-[var(--surface-2)] focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]/20`;
  };

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Create New Claim</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    step === currentStep
                      ? "bg-[color:var(--primary)] text-white"
                      : step < currentStep
                        ? "bg-green-500 text-white"
                        : "bg-[var(--surface-2)] text-[color:var(--muted)]"
                  }`}
                >
                  {step < currentStep ? <CheckCircle2 className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`h-0.5 w-8 ${step < currentStep ? "bg-green-500" : "bg-[var(--surface-2)]"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardTitle>
        <p className="text-sm text-[color:var(--muted)]">
          {currentStep === 1 && "Step 1: Insured Information"}
          {currentStep === 2 && "Step 2: Property & Loss Details"}
          {currentStep === 3 && "Step 3: Review & Submit"}
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          {/* Step 1: Insured Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="claimNumber">Claim Number *</Label>
                <div className="relative">
                  <Input
                    id="claimNumber"
                    required
                    value={formData.claimNumber}
                    onChange={(e) => handleInputChange("claimNumber", e.target.value)}
                    onBlur={() => handleBlur("claimNumber")}
                    className={getFieldClassName("claimNumber")}
                  />
                  {isFieldValid("claimNumber") && (
                    <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                  )}
                  {isFieldInvalid("claimNumber") && (
                    <AlertCircle className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-red-500" />
                  )}
                </div>
                {isFieldInvalid("claimNumber") && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.claimNumber}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createNewContact"
                  checked={createNewContact}
                  onCheckedChange={(checked) => setCreateNewContact(checked as boolean)}
                />
                <Label htmlFor="createNewContact" className="cursor-pointer">
                  Create New Contact
                </Label>
              </div>

              {createNewContact ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="newContactFirstName">First Name *</Label>
                      <div className="relative">
                        <Input
                          id="newContactFirstName"
                          value={formData.newContactFirstName}
                          onChange={(e) => handleInputChange("newContactFirstName", e.target.value)}
                          onBlur={() => handleBlur("newContactFirstName")}
                          className={getFieldClassName("newContactFirstName")}
                        />
                        {isFieldValid("newContactFirstName") && (
                          <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                        )}
                      </div>
                      {isFieldInvalid("newContactFirstName") && (
                        <p className="mt-1 text-sm text-red-600">
                          {validationErrors.newContactFirstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="newContactLastName">Last Name *</Label>
                      <div className="relative">
                        <Input
                          id="newContactLastName"
                          value={formData.newContactLastName}
                          onChange={(e) => handleInputChange("newContactLastName", e.target.value)}
                          onBlur={() => handleBlur("newContactLastName")}
                          className={getFieldClassName("newContactLastName")}
                        />
                        {isFieldValid("newContactLastName") && (
                          <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                        )}
                      </div>
                      {isFieldInvalid("newContactLastName") && (
                        <p className="mt-1 text-sm text-red-600">
                          {validationErrors.newContactLastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newContactEmail">Email *</Label>
                    <div className="relative">
                      <Input
                        id="newContactEmail"
                        type="email"
                        value={formData.newContactEmail}
                        onChange={(e) => handleInputChange("newContactEmail", e.target.value)}
                        onBlur={() => handleBlur("newContactEmail")}
                        className={getFieldClassName("newContactEmail")}
                      />
                      {isFieldValid("newContactEmail") && (
                        <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                      )}
                    </div>
                    {isFieldInvalid("newContactEmail") && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.newContactEmail}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="newContactPhone">Phone</Label>
                    <div className="relative">
                      <Input
                        id="newContactPhone"
                        type="tel"
                        placeholder="XXX-XXX-XXXX"
                        value={formData.newContactPhone}
                        onChange={(e) => handleInputChange("newContactPhone", e.target.value)}
                        onBlur={() => handleBlur("newContactPhone")}
                        className={getFieldClassName("newContactPhone")}
                      />
                      {isFieldValid("newContactPhone") && (
                        <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                      )}
                    </div>
                    {isFieldInvalid("newContactPhone") && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.newContactPhone}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="contact_id">Select Contact *</Label>
                  <Select
                    aria-label="Select contact"
                    value={formData.contact_id}
                    onValueChange={(value) => handleInputChange("contact_id", value)}
                  >
                    <SelectTrigger className={getFieldClassName("contact_id")}>
                      <SelectValue placeholder="Choose a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName} ({contact.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isFieldInvalid("contact_id") && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.contact_id}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Property/Loss Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createNewProperty"
                  checked={createNewProperty}
                  onCheckedChange={(checked) => setCreateNewProperty(checked as boolean)}
                />
                <Label htmlFor="createNewProperty" className="cursor-pointer">
                  Create New Property
                </Label>
              </div>

              {createNewProperty ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newPropertyAddress">Street Address *</Label>
                    <div className="relative">
                      <Input
                        id="newPropertyAddress"
                        value={formData.newPropertyAddress}
                        onChange={(e) => handleInputChange("newPropertyAddress", e.target.value)}
                        onBlur={() => handleBlur("newPropertyAddress")}
                        className={getFieldClassName("newPropertyAddress")}
                      />
                      {isFieldValid("newPropertyAddress") && (
                        <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                      )}
                    </div>
                    {isFieldInvalid("newPropertyAddress") && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.newPropertyAddress}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="newPropertyCity">City *</Label>
                      <Input
                        id="newPropertyCity"
                        value={formData.newPropertyCity}
                        onChange={(e) => handleInputChange("newPropertyCity", e.target.value)}
                        onBlur={() => handleBlur("newPropertyCity")}
                        className={getFieldClassName("newPropertyCity")}
                      />
                      {isFieldInvalid("newPropertyCity") && (
                        <p className="mt-1 text-sm text-red-600">
                          {validationErrors.newPropertyCity}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="newPropertyState">State *</Label>
                      <Input
                        id="newPropertyState"
                        value={formData.newPropertyState}
                        onChange={(e) => handleInputChange("newPropertyState", e.target.value)}
                        onBlur={() => handleBlur("newPropertyState")}
                        className={getFieldClassName("newPropertyState")}
                      />
                      {isFieldInvalid("newPropertyState") && (
                        <p className="mt-1 text-sm text-red-600">
                          {validationErrors.newPropertyState}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="newPropertyZip">ZIP Code *</Label>
                      <Input
                        id="newPropertyZip"
                        value={formData.newPropertyZip}
                        onChange={(e) => handleInputChange("newPropertyZip", e.target.value)}
                        onBlur={() => handleBlur("newPropertyZip")}
                        className={getFieldClassName("newPropertyZip")}
                      />
                      {isFieldInvalid("newPropertyZip") && (
                        <p className="mt-1 text-sm text-red-600">
                          {validationErrors.newPropertyZip}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location Guidance */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                    <h4 className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                      📍 Optional: Add Coordinates for Map Display
                    </h4>
                    <p className="mb-3 text-xs text-blue-700 dark:text-blue-300">
                      Provide latitude and longitude to show this property on the dashboard map. You
                      can find these coordinates using Mapbox or any mapping service.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="newPropertyLatitude" className="text-xs">
                          Latitude
                        </Label>
                        <Input
                          id="newPropertyLatitude"
                          type="number"
                          step="any"
                          placeholder="e.g., 40.7128"
                          value={formData.newPropertyLatitude}
                          onChange={(e) => handleInputChange("newPropertyLatitude", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newPropertyLongitude" className="text-xs">
                          Longitude
                        </Label>
                        <Input
                          id="newPropertyLongitude"
                          type="number"
                          step="any"
                          placeholder="e.g., -74.0060"
                          value={formData.newPropertyLongitude}
                          onChange={(e) =>
                            handleInputChange("newPropertyLongitude", e.target.value)
                          }
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="property_id">Select Property *</Label>
                  <Select
                    aria-label="Select property"
                    value={formData.property_id}
                    onValueChange={(value) => handleInputChange("property_id", value)}
                  >
                    <SelectTrigger className={getFieldClassName("property_id")}>
                      <SelectValue placeholder="Choose a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.address}, {property.city}, {property.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isFieldInvalid("property_id") && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.property_id}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="insuranceCompany">Insurance Company *</Label>
                <Input
                  id="insuranceCompany"
                  required
                  value={formData.insuranceCompany}
                  onChange={(e) => handleInputChange("insuranceCompany", e.target.value)}
                  onBlur={() => handleBlur("insuranceCompany")}
                  className={getFieldClassName("insuranceCompany")}
                />
                {isFieldInvalid("insuranceCompany") && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.insuranceCompany}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="dateOfLoss">Date of Loss *</Label>
                  <Input
                    id="dateOfLoss"
                    type="date"
                    required
                    value={formData.dateOfLoss}
                    onChange={(e) => handleInputChange("dateOfLoss", e.target.value)}
                    onBlur={() => handleBlur("dateOfLoss")}
                    className={getFieldClassName("dateOfLoss")}
                  />
                  {isFieldInvalid("dateOfLoss") && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.dateOfLoss}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="typeOfLoss">Type of Loss *</Label>
                  <Select
                    aria-label="Select type of loss"
                    value={formData.typeOfLoss}
                    onValueChange={(value) => handleInputChange("typeOfLoss", value)}
                    required
                  >
                    <SelectTrigger className={getFieldClassName("typeOfLoss")}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIRE">Fire</SelectItem>
                      <SelectItem value="WATER">Water</SelectItem>
                      <SelectItem value="STORM">Storm/Wind</SelectItem>
                      <SelectItem value="HAIL">Hail</SelectItem>
                      <SelectItem value="THEFT">Theft/Vandalism</SelectItem>
                      <SelectItem value="LIABILITY">Liability</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {isFieldInvalid("typeOfLoss") && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.typeOfLoss}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="estimatedValue">Estimated Value</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.estimatedValue}
                  onChange={(e) => handleInputChange("estimatedValue", e.target.value)}
                />
                {aiEstimate && (
                  <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        🤖 AI Estimate: {aiEstimate.value}
                      </span>
                      <span className="text-xs text-blue-700 dark:text-blue-300">
                        {aiEstimate.confidence}% confidence
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      Based on {formData.typeOfLoss} damage patterns
                    </p>
                  </div>
                )}
                {loadingAiEstimate && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    🔄 Calculating AI estimate...
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe the damage and circumstances..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
                <h3 className="mb-4 text-lg font-semibold">Review Your Claim</h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-[color:var(--muted)]">
                      Insured Information
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>Claim Number:</strong> {formData.claimNumber}
                      </p>
                      {createNewContact ? (
                        <p>
                          <strong>Contact:</strong> {formData.newContactFirstName}{" "}
                          {formData.newContactLastName} ({formData.newContactEmail})
                        </p>
                      ) : (
                        <p>
                          <strong>Contact:</strong>{" "}
                          {contacts.find((c) => c.id === formData.contact_id)?.firstName}{" "}
                          {contacts.find((c) => c.id === formData.contact_id)?.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-medium text-[color:var(--muted)]">
                      Property & Loss Details
                    </h4>
                    <div className="space-y-1 text-sm">
                      {createNewProperty ? (
                        <p>
                          <strong>Property:</strong> {formData.newPropertyAddress},{" "}
                          {formData.newPropertyCity}, {formData.newPropertyState}{" "}
                          {formData.newPropertyZip}
                        </p>
                      ) : (
                        <p>
                          <strong>Property:</strong>{" "}
                          {properties.find((p) => p.id === formData.property_id)?.address}
                        </p>
                      )}
                      <p>
                        <strong>Insurance Company:</strong> {formData.insuranceCompany}
                      </p>
                      <p>
                        <strong>Date of Loss:</strong> {formData.dateOfLoss}
                      </p>
                      <p>
                        <strong>Type of Loss:</strong> {formData.typeOfLoss}
                      </p>
                      {formData.estimatedValue && (
                        <p>
                          <strong>Estimated Value:</strong> $
                          {parseFloat(formData.estimatedValue).toLocaleString()}
                        </p>
                      )}
                      {formData.description && (
                        <p>
                          <strong>Description:</strong> {formData.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  ⚠️ Please review all information carefully before submitting. You can go back to
                  make changes if needed.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={handleNext}>
                Next Step
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Claim"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
