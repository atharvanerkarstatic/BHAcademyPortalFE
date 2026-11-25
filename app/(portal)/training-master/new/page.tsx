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
import { getAllLanguagesAction } from "@/features/languages/action";
import type { LanguageItem } from "@/features/languages/types";
import { createTrainingMasterAction } from "@/features/training-master/action";
import type {
  CreateTrainingMasterPayload,
  TrainingMasterLanguageItem,
} from "@/features/training-master/types";

const FALLBACK_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English (en)" },
  { code: "hi", label: "Hindi (hi)" },
  { code: "bn", label: "Bengali (bn)" },
  { code: "mr", label: "Marathi (mr)" },
  { code: "te", label: "Telugu (te)" },
  { code: "ta", label: "Tamil (ta)" },
  { code: "gu", label: "Gujarati (gu)" },
  { code: "kn", label: "Kannada (kn)" },
  { code: "ml", label: "Malayalam (ml)" },
  { code: "pa", label: "Punjabi (pa)" },
  { code: "or", label: "Odia (or)" },
  { code: "as", label: "Assamese (as)" },
];

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
  const [availableLanguages, setAvailableLanguages] = useState<LanguageItem[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);

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

  useEffect(() => {
    let mounted = true;
    getAllLanguagesAction()
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data && res.data.length > 0) {
          setAvailableLanguages(res.data);
          const firstCode = res.data[0].languageCode?.toLowerCase() || res.data[0].language?.toLowerCase() || "en";
          setLanguages((prev) => {
            if (prev.length > 0 && !prev[0].languageCode) {
              return prev.map((item, idx) => (idx === 0 ? { ...item, languageCode: firstCode } : item));
            }
            return prev;
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load languages list:", err);
      })
      .finally(() => {
        if (mounted) setLoadingLanguages(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const languageOptions =
    availableLanguages.length > 0
      ? availableLanguages
          .filter((l) => l.languageCode || l.language)
          .map((l) => {
            const code = (l.languageCode || l.language || "").trim().toLowerCase();
            const label = l.nativeName
              ? `${l.language} (${l.nativeName}) - ${code.toUpperCase()}`
              : `${l.language} - ${code.toUpperCase()}`;
            return { code, label };
          })
      : FALLBACK_LANGUAGES;

  const handleReset = () => {
    setTrainingDate("");
    setPincode("");
    setGeoLocation("");
    setImageUrl("");
    setGoogleMapsLink("");
    const defaultCode = languageOptions[0]?.code || "en";
    setLanguages([
      {
        languageCode: defaultCode,
        trainingTitle: "",
        trainingDescription: "",
        venueDetails: "",
        status: "ACTIVE",
        tags: "",
      },
    ]);
    setFormKey((k) => k + 1);
  };

  const addLanguage = () => {
    const existingCodes = languages.map((l) => l.languageCode.toLowerCase());
    const nextOption = languageOptions.find((opt) => !existingCodes.includes(opt.code.toLowerCase()));
    const nextCode = nextOption ? nextOption.code : languageOptions[0]?.code || "";
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
            className="mx-auto max-w-2xl space-y-4"
          >
            {/* Training Date */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="trainingDate" className="text-xs font-semibold text-slate-700 sm:text-right">
                Training Date <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="trainingDate"
                  type="date"
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Pincode */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="pincode" className="text-xs font-semibold text-slate-700 sm:text-right">
                Pincode <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 411001 or 733124"
                  maxLength={10}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Geo Location */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="geoLocation" className="text-xs font-semibold text-slate-700 sm:text-right">
                Geo Location / City
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="geoLocation"
                  value={geoLocation}
                  onChange={(e) => setGeoLocation(e.target.value)}
                  placeholder="e.g. Pune, Maharashtra"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Google Maps Link */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="googleMapsLink" className="text-xs font-semibold text-slate-700 sm:text-right">
                Google Maps Link
              </Label>
              <div className="sm:col-span-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="imageUrl" className="text-xs font-semibold text-slate-700 sm:text-right">
                Image URL
              </Label>
              <div className="sm:col-span-3">
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
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Language Variations & Content
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add title, venue, tags, and description for each supported language.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLanguage}
                  className="h-8 gap-1.5 text-xs font-medium border-slate-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Language
                </Button>
              </div>

              <div className="space-y-4">
                {languages.map((lang, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3.5 relative"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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

                    {/* Language Code Picklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Language <span className="text-rose-500">*</span>
                      </Label>
                      <div className="sm:col-span-3">
                        <select
                          value={lang.languageCode}
                          onChange={(e) =>
                            updateLanguageField(index, "languageCode", e.target.value.toLowerCase())
                          }
                          disabled={loadingLanguages}
                          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                          required
                        >
                          {languageOptions.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Training Title */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Training Title <span className="text-rose-500">*</span>
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          value={lang.trainingTitle || ""}
                          onChange={(e) =>
                            updateLanguageField(index, "trainingTitle", e.target.value)
                          }
                          placeholder="e.g. Advanced Digital Skills Training"
                          className="h-9 text-xs bg-white"
                          required
                        />
                      </div>
                    </div>

                    {/* Venue Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Venue Details
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          value={lang.venueDetails || ""}
                          onChange={(e) =>
                            updateLanguageField(index, "venueDetails", e.target.value)
                          }
                          placeholder="e.g. Training Hall, Civil Lines..."
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                        Tags
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          value={lang.tags || ""}
                          onChange={(e) => updateLanguageField(index, "tags", e.target.value)}
                          placeholder="e.g. Digital Skills, Technology"
                          className="h-9 text-xs bg-white"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-3">
                      <Label className="text-xs font-semibold text-slate-700 sm:text-right sm:pt-2">
                        Description
                      </Label>
                      <div className="sm:col-span-3">
                        <Textarea
                          rows={3}
                          value={lang.trainingDescription || ""}
                          onChange={(e) =>
                            updateLanguageField(index, "trainingDescription", e.target.value)
                          }
                          placeholder="Provide details about the training session..."
                          className="text-xs bg-white resize-y"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t mt-6">
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
