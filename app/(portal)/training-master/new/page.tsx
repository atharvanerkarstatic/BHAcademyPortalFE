"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, X } from "lucide-react";

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
import { uploadMediaAction } from "@/features/accounts/action";
import { validateImageFile } from "@/lib/validations";
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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

  const canCreate = can(["training-master.create", "training-master.manage"]);

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

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    const check = validateImageFile(file);
    if (!check.valid) {
      toastError(check.error || "Only .png, .jpg, and .jpeg image formats are allowed (Max 5 MB).");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", `training_image_${Date.now()}`);

      const res = await uploadMediaAction(formData);
      if (res.success && res.data) {
        setImageUrl(res.data);
        success("Image uploaded successfully and link generated.");
      } else {
        toastError(res.error || "Failed to upload image. Please try again.");
      }
    } catch (err) {
      console.error("Training image upload failed:", err);
      toastError("Failed to upload image file. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
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

    if (isUploadingImage) {
      toastError("Please wait for image upload to complete.");
      return;
    }

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

    const cleanPincode = pincode.trim().replace(/\D/g, "");
    if (cleanPincode.length !== 6) {
      toastError("Pincode must be exactly 6 digits.");
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
        trainingDescription: (l.trainingDescription || l.traingDescription || "")?.trim() || undefined,
        traingDescription: (l.trainingDescription || l.traingDescription || "")?.trim() || undefined,
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
                  type="text"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPincode(val);
                  }}
                  placeholder="e.g. 411001"
                  maxLength={6}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="geoLocation" className="text-xs font-semibold text-slate-700 sm:text-right">
                Location / City
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

            {/* Image Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
              <Label htmlFor="training-image-file" className="text-xs font-semibold text-slate-700 sm:text-right pt-2">
                Training Image
              </Label>
              <div className="sm:col-span-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Input
                    id="training-image-file"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    disabled={isUploadingImage || isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) handleImageUpload(file);
                    }}
                    className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {isUploadingImage && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium shrink-0">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Allowed formats: PNG, JPG, JPEG (Max 5 MB). Uploading generates the image URL automatically.
                </p>

                {/* Uploaded Image Preview & URL */}
                {imageUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50/70 w-full sm:w-fit">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Training Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center justify-between gap-3 flex-1 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-emerald-600 block">
                          Image uploaded successfully
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono truncate block max-w-xs sm:max-w-md">
                          {imageUrl}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImageUrl("")}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                        title="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
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
