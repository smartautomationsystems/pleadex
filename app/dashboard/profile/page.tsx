"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface UserProfile {
  name: string;
  email: string;
  image?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) return;
      const data = await res.json();
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      toast.success("Profile updated");
      fetchProfile();
    } catch (err) {
      toast.error("Failed to update profile");
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
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input 
              type="text" 
              value={profile?.name || ''} 
              onChange={e => handleProfileChange('name', e.target.value)} 
              className="w-full p-2 border rounded" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              value={profile?.email || ''} 
              readOnly 
              className="w-full p-2 border rounded bg-gray-100" 
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSaveProfile}
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
} 