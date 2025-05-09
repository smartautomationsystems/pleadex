"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AddressAutocomplete, { Address } from "@/components/AddressAutocomplete";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  fax?: string;
  address?: Address;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    fax: string;
    address: Address;
  }>({
    name: "",
    email: "",
    phone: "",
    fax: "",
    address: { street: "", city: "", state: "", zip: "" },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setUser(data.user);
      setFormData({
        name: data.user.name || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        fax: data.user.fax || "",
        address: data.user.address || { street: "", city: "", state: "", zip: "" },
      });
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Validate phone number
      if (formData.phone && !/^\+?1?\d{10}$/.test(formData.phone.replace(/[^0-9]/g, ""))) {
        toast.error("Please enter a valid 10-digit phone number");
        setIsSaving(false);
        return;
      }
      // Validate fax number
      if (formData.fax && !/^\+?1?\d{10}$/.test(formData.fax.replace(/[^0-9]/g, ""))) {
        toast.error("Please enter a valid 10-digit fax number");
        setIsSaving(false);
        return;
      }
      // Validate ZIP code
      if (formData.address.zip && !/^\d{5}(-\d{4})?$/.test(formData.address.zip)) {
        toast.error("Please enter a valid ZIP code (e.g., 12345 or 12345-6789)");
        setIsSaving(false);
        return;
      }
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }
      toast.success("Profile updated successfully");
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-2 border rounded"
              required
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="(123) 456-7890"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fax Number</label>
            <input
              type="tel"
              value={formData.fax}
              onChange={e => setFormData(prev => ({ ...prev, fax: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="(123) 456-7890"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <AddressAutocomplete
              value={formData.address}
              onChange={address => setFormData(prev => ({ ...prev, address }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Billing & Payment Information</h2>
        <div className="text-gray-500">(Coming soon: Add or update your payment method, view invoices, and manage billing details.)</div>
      </div>
    </div>
  );
} 