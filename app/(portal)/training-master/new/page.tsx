"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { createTrainingMasterAction } from "@/features/training-master/action";
import type {
  CreateTrainingMasterPayload,
  TrainingMasterLanguageItem,
} from "@/features/training-master/types";

const DEFAULT_LANGUAGES = ["en", "hi", "bn"];

export default function NewTrainingMasterPage() {
  const router = useRouter();
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [formKey, setFormKey] = useState(0);
  const [trainingDate, setTrainingDate] = useState("");
  const [pincode, setPincode] = useState("");
  const [geoLocation, setGeoLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");

  const [languages, setLanguages] = useState<TrainingMasterLanguageItem[]>([
    {
      languageCode: "en",
      trainingTitle: "",
      trainingDescription: "",
      venueDetails: "",
      status: "ACTIVE",
      tags: "",
    },
  ]);

  const [isPending, startTransition] = useTransition();

  const canCreate = can("users.create") || can("ROLE_TRAINER") || can("system.all");

  const handleReset = () => {
    setTrainingDate("");
    setPincode("");
    setGeoLocation("");
    setImageUrl("");
    setGoogleMapsLink("");
    setLanguages([
      {
        languageCode: "en",
        trainingTitle: "",
        trainingDescription: "",
        venueDetails: "",
        status: "ACTIVE",
        tags: "",
      },
    ]);
    setFormKey((k) => k + 1);
  };

  useEffect(() => {
    handleReset();
    return () => {
      handleReset();
    };
  }, []);

  const addLanguage = () => {
    const existingCodes = languages.map((l) => l.languageCode);
    const nextCode = DEFAULT_LANGUAGES.find((c) => !existingCodes.includes(c)) || "";
    setLanguages((prev) => [
      ...prev,
      {
        languageCode: nextCode,
        trainingTitle: "",
        trainingDescription: "",
        venueDetails: "",
        status: "ACTIVE",
        tags: "",
      },
    ]);
  };

  const removeLanguage = (index: number) => {
    if (languages.length <= 1) {
      toastError("At least one language entry is required.");
      return;
    }
    setLanguages((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLanguageField = (
    index: number,
    field: keyof TrainingMasterLanguageItem,
    val: string
  ) => {
    setLanguages((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      toastError("You do not have permission to create training master records.");
      return;
    }

    if (!trainingDate) {
      toastError("Training Date is required.");
      return;
    }

    if (!pincode.trim()) {
      toastError("Pincode is required.");
      return;
    }

    for (let i = 0; i < languages.length; i++) {
      const l = languages[i];
      if (!l.languageCode.trim()) {
        toastError(`Language code is required for language #${i + 1}`);
        return;
      }
      if (!l.trainingTitle?.trim()) {
        toastError(`Training Title is required for language ${l.languageCode.toUpperCase()}`);
        return;
      }
    }

    const payload: CreateTrainingMasterPayload = {
      trainingDate,
      pincode: pincode.trim(),
      geoLocation: geoLocation.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      googleMapsLink: googleMapsLink.trim() || undefined,
      languages: languages.map((l) => ({
        languageCode: l.languageCode.trim().toLowerCase(),
        trainingTitle: l.trainingTitle?.trim(),
        traingDescription: l.trainingDescription?.trim(),
        venueDetails: l.venueDetails?.trim(),
        status: l.status || "ACTIVE",
        tags: l.tags?.trim() || undefined,
      })),
    };

    startTransition(async () => {
      const res = await createTrainingMasterAction(payload);
      if (res.success) {
        success(res.message || "Training master created successfully!");
        handleReset();
        router.push("/training-master");
      } else {
        toastError(res.error || "Failed to create training master. Please try again.");
      }
    });
  };

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Training Master"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Training Master", href: "/training-master" },
          { label: "Add Training Master" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Add New Training Master
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <Link href="/training-master">
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form
            key={formKey}
            onSubmit={handleSubmit}
            autoComplete="off"
            className="mx-auto max-w-3xl space-y-6"
          >
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                General Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Training Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="trainingDate" className="text-xs font-semibold text-slate-700">
                    Training Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="trainingDate"
                    type="date"
                    value={trainingDate}
                    onChange={(e) => setTrainingDate(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* Pincode */}
                <div className="space-y-1.5">
                  <Label htmlFor="pincode" className="text-xs font-semibold text-slate-700">
                    Pincode <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 411001 or 733124"
                    maxLength={10}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Geo Location */}
                <div className="space-y-1.5">
                  <Label htmlFor="geoLocation" className="text-xs font-semibold text-slate-700">
                    Geo Location / City
                  </Label>
                  <Input
                    id="geoLocation"
                    value={geoLocation}
                    onChange={(e) => setGeoLocation(e.target.value)}
                    placeholder="e.g. Pune, Maharashtra"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Google Maps Link */}
                <div className="space-y-1.5">
                  <Label htmlFor="googleMapsLink" className="text-xs font-semibold text-slate-700">
                    Google Maps Link
                  </Label>
                  <Input
                    id="googleMapsLink"
                    value={googleMapsLink}
                    onChange={(e) => setGoogleMapsLink(e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <Label htmlFor="imageUrl" className="text-xs font-semibold text-slate-700">
                  Image URL
                </Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/images/training-session.jpg"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Language Content Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Language Variations & Titles
                  </h3>
                  <p className="text-xs text-slate-500">
                    Provide title, description, and venue in one or more languages.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLanguage}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Language
                </Button>
              </div>

              <div className="space-y-4">
                {languages.map((lang, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Language #{index + 1}
                      </span>
                      {languages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLanguage(index)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove language"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Language Code */}
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">
                          Language Code <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={lang.languageCode}
                          onChange={(e) =>
                            updateLanguageField(index, "languageCode", e.target.value.toLowerCase())
                          }
                          placeholder="e.g. en, hi, bn"
                          maxLength={10}
                          className="h-8 text-xs font-mono uppercase bg-white mt-1"
                          required
                        />
                      </div>

                      {/* Training Title */}
                      <div className="sm:col-span-2">
                        <Label className="text-xs font-semibold text-slate-700">
                          Training Title <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={lang.trainingTitle || ""}
                          onChange={(e) =>
                            updateLanguageField(index, "trainingTitle", e.target.value)
                          }
                          placeholder="e.g. Advanced Digital Skills Training"
                          className="h-8 text-xs bg-white mt-1"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Venue Details */}
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">
                          Venue Details
                        </Label>
                        <Input
                          value={lang.venueDetails || ""}
                          onChange={(e) =>
                            updateLanguageField(index, "venueDetails", e.target.value)
                          }
                          placeholder="Training Hall, Civil Lines..."
                          className="h-8 text-xs bg-white mt-1"
                        />
                      </div>

                      {/* Tags */}
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Tags</Label>
                        <Input
                          value={lang.tags || ""}
                          onChange={(e) => updateLanguageField(index, "tags", e.target.value)}
                          placeholder="Digital Skills, Technology..."
                          className="h-8 text-xs bg-white mt-1"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Description</Label>
                      <Textarea
                        rows={2}
                        value={lang.trainingDescription || ""}
                        onChange={(e) =>
                          updateLanguageField(index, "trainingDescription", e.target.value)
                        }
                        placeholder="A practical training session covering..."
                        className="text-xs bg-white mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-28 h-8 text-xs font-semibold uppercase"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="min-w-28 h-8 text-xs font-medium uppercase border-slate-300"
              >
                RESET
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="min-w-28 h-8 text-xs font-medium uppercase border-slate-300"
              >
                <Link href="/training-master">BACK</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
