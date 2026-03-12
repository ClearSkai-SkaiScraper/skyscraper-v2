"use client";

import { Check, Home, Mail, Pencil, Phone, User, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { UniversalContactCard } from "@/components/contacts/UniversalContactCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface EditableFieldInlineProps {
  label: string;
  value: string | null;
  field: string;
  onUpdate: (field: string, value: string) => Promise<void>;
  icon?: React.ReactNode;
  type?: "text" | "email" | "phone";
}

function EditableFieldInline({
  label,
  value,
  field,
  onUpdate,
  icon,
  type = "text",
}: EditableFieldInlineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(field, editValue);
      toast.success(`${label} updated`);
      setIsEditing(false);
    } catch {
      toast.error(`Failed to update ${label}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
        <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-300">{label}</p>
        <div className="flex items-center gap-2">
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 text-sm"
            disabled={saving}
            autoFocus
          />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20"
      onClick={() => setIsEditing(true)}
    >
      {icon && <span className="text-slate-400">{icon}</span>}
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm text-slate-900 dark:text-slate-100">{value || "Click to add..."}</p>
      </div>
      <Pencil className="h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

interface EditablePropertyCardProps {
  contact: Contact | null;
  jobSource: string;
  onContactUpdate: (field: string, value: string) => Promise<void>;
}

export function EditablePropertyCard({
  contact,
  jobSource,
  onContactUpdate,
}: EditablePropertyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Property Information
          <span className="ml-auto text-xs font-normal text-amber-600">
            <Pencil className="mr-1 inline h-3 w-3" />
            Click to edit
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          <EditableFieldInline
            label="Street Address"
            value={contact?.street || null}
            field="street"
            onUpdate={onContactUpdate}
            icon={<Home className="h-4 w-4" />}
          />
          <EditableFieldInline
            label="City"
            value={contact?.city || null}
            field="city"
            onUpdate={onContactUpdate}
          />
          <EditableFieldInline
            label="State"
            value={contact?.state || null}
            field="state"
            onUpdate={onContactUpdate}
          />
          <EditableFieldInline
            label="ZIP Code"
            value={contact?.zipCode || null}
            field="zipCode"
            onUpdate={onContactUpdate}
          />
          <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Source</p>
            <p className="mt-1 text-sm capitalize text-slate-900 dark:text-slate-100">
              {jobSource || "Direct"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EditableCustomerCardProps {
  contact: Contact | null;
  followUpDate: Date | null;
  onContactUpdate: (field: string, value: string) => Promise<void>;
}

export function EditableCustomerCard({
  contact,
  followUpDate,
  onContactUpdate,
}: EditableCustomerCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "Not scheduled";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Customer Information
          <span className="ml-auto text-xs font-normal text-amber-600">
            <Pencil className="mr-1 inline h-3 w-3" />
            Click to edit
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          <EditableFieldInline
            label="First Name"
            value={contact?.firstName || null}
            field="firstName"
            onUpdate={onContactUpdate}
            icon={<User className="h-4 w-4" />}
          />
          <EditableFieldInline
            label="Last Name"
            value={contact?.lastName || null}
            field="lastName"
            onUpdate={onContactUpdate}
          />
          <EditableFieldInline
            label="Email"
            value={contact?.email || null}
            field="email"
            onUpdate={onContactUpdate}
            icon={<Mail className="h-4 w-4" />}
            type="email"
          />
          <EditableFieldInline
            label="Phone"
            value={contact?.phone || null}
            field="phone"
            onUpdate={onContactUpdate}
            icon={<Phone className="h-4 w-4" />}
            type="phone"
          />
          <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Follow-up Date</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
              {formatDate(followUpDate)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EditableInfoCardsWrapperProps {
  contactId: string | null;
  initialContact: Contact | null;
  jobSource: string;
  followUpDate: Date | null;
}

export function EditableInfoCardsWrapper({
  contactId,
  initialContact,
  jobSource,
  followUpDate,
}: EditableInfoCardsWrapperProps) {
  const [contact, setContact] = useState(initialContact);

  const handleContactUpdate = async (field: string, value: string) => {
    if (!contactId) {
      toast.error("No contact to update");
      return;
    }

    const res = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      throw new Error("Failed to update contact");
    }

    // Update local state
    setContact((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <div className="space-y-6">
      {/* Quick contact actions — Call / Text / Email / Message */}
      {contact && (contact.phone || contact.email) && (
        <UniversalContactCard
          contact={{
            id: contactId || `retail-${Date.now()}`,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            contactType: "client",
            href: contactId ? `/contacts/${contactId}` : undefined,
          }}
          compact
        />
      )}
      <EditablePropertyCard
        contact={contact}
        jobSource={jobSource}
        onContactUpdate={handleContactUpdate}
      />
      <EditableCustomerCard
        contact={contact}
        followUpDate={followUpDate}
        onContactUpdate={handleContactUpdate}
      />
    </div>
  );
}

export default EditableInfoCardsWrapper;
