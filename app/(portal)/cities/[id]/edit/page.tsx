"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, MapPin, Languages } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { getCityByIdAction, updateCityAction } from "@/features/cities/action";
import type { CityItem, SaveCityPayload } from "@/features/cities/types";

const TRANSLATION_LANGUAGES = [
  { code: "Hi", name: "Hindi (हिन्दी)" },
  { code: "Bn", name: "Bengali (বাংলা)" },
  { code: "Kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "Ml", name: "Malayalam (മലയാളം)" },
  { code: "Or", name: "Odia (ଓଡ଼ିଆ)" },
  { code: "Ta", name: "Tamil (தமிழ்)" },
  { code: "Te", name: "Telugu (తెలుగు)" },
  { code: "As", name: "Assamese (অসমীয়া)" },
  { code: "Gu", name: "Gujarati (ગુજરાતી)" },
  { code: "Mr", name: "Marathi (मराठी)" },
] as const;

export default function EditCityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { success, error: toastError } = useToast();

  const [formKey, setFormKey] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [pinCode, setPinCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [division, setDivision] = useState("");
  const [region, setRegion] = useState("");

  const [cityTranslations, setCityTranslations] = useState<Record<string, string>>({});
  const [stateTranslations, setStateTranslations] = useState<Record<string, string>>({});

  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setPinCode("");
    setCity("");
    setState("");
    setDivision("");
    setRegion("");
    setCityTranslations({});
    setStateTranslations({});
    setFormKey((k) => k + 1);
  };

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    (async () => {
      setFetching(true);
      const res = await getCityByIdAction(id);
      if (!mounted) return;

      if (res.success && res.data) {
        const item = res.data;
        setPinCode(item.pinCode || "");
        setCity(item.city || "");
        setState(item.state || "");
        setDivision(item.division || "");
        setRegion(item.region || "");

        const cTrans: Record<string, string> = {};
        const sTrans: Record<string, string> = {};

        for (const lang of TRANSLATION_LANGUAGES) {
          const cKey = `city${lang.code}` as keyof CityItem;
          const sKey = `state${lang.code}` as keyof CityItem;
          if (item[cKey]) cTrans[`city${lang.code}`] = String(item[cKey]);
          if (item[sKey]) sTrans[`state${lang.code}`] = String(item[sKey]);
        }

        setCityTranslations(cTrans);
        setStateTranslations(sTrans);
      } else {
        toastError(res.error || "Failed to load city details.");
      }
      setFetching(false);
    })();

    return () => {
      mounted = false;
      resetForm();
    };
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pinCode.trim()) {
      toastError("Pincode is required.");
      return;
    }
    if (!city.trim()) {
      toastError("City name is required.");
      return;
    }
    if (!state.trim()) {
      toastError("State name is required.");
      return;
    }

    const payload: SaveCityPayload = {
      pinCode: pinCode.trim(),
      city: city.trim(),
      state: state.trim(),
      division: division.trim() || undefined,
      region: region.trim() || undefined,
      ...cityTranslations,
      ...stateTranslations,
    };

    startTransition(async () => {
      const res = await updateCityAction(id, payload);
      if (res.success) {
        success(res.message || "City updated successfully");
        resetForm();
        router.push("/cities");
      } else {
        toastError(res.error || "Failed to update city");
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading city details…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetForm();
            router.push("/cities");
          }}
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cities List
        </Button>
      </div>

      <PageHeader
        title="Edit City / Pincode"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Cities", href: "/cities" },
          { label: `Edit City (ID: ${id})` },
        ]}
      />

      <form key={formKey} onSubmit={handleSubmit} noValidate className="w-full space-y-6">
        {/* Basic Information Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <CardTitle>Basic City Information</CardTitle>
            </div>
            <CardDescription>
              Update city name, pincode, state, division, and region.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pinCode" className="text-xs font-semibold text-slate-700">
                  Pincode <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pinCode"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="e.g. 411001"
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs font-semibold text-slate-700">
                  City Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-xs font-semibold text-slate-700">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="division" className="text-xs font-semibold text-slate-700">
                  Division
                </Label>
                <Input
                  id="division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  placeholder="e.g. Pune Division"
                  className="text-xs"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="region" className="text-xs font-semibold text-slate-700">
                  Region
                </Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. West"
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multilingual City Names Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-blue-600" />
              <CardTitle>City Name (Regional Translations)</CardTitle>
            </div>
            <CardDescription>
              Update the city name in different supported Indian languages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TRANSLATION_LANGUAGES.map((lang) => {
                const cityKey = `city${lang.code}`;
                return (
                  <div key={lang.code} className="space-y-1.5 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                    <Label htmlFor={`edit-${cityKey}`} className="text-xs font-medium text-slate-700">
                      {lang.name}
                    </Label>
                    <Input
                      id={`edit-${cityKey}`}
                      value={cityTranslations[cityKey] || ""}
                      onChange={(e) =>
                        setCityTranslations((prev) => ({ ...prev, [cityKey]: e.target.value }))
                      }
                      placeholder={`City in ${lang.name}`}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Multilingual State Names Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-blue-600" />
              <CardTitle>State Name (Regional Translations)</CardTitle>
            </div>
            <CardDescription>
              Update the state name in different supported Indian languages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TRANSLATION_LANGUAGES.map((lang) => {
                const stateKey = `state${lang.code}`;
                return (
                  <div key={lang.code} className="space-y-1.5 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                    <Label htmlFor={`edit-${stateKey}`} className="text-xs font-medium text-slate-700">
                      {lang.name}
                    </Label>
                    <Input
                      id={`edit-${stateKey}`}
                      value={stateTranslations[stateKey] || ""}
                      onChange={(e) =>
                        setStateTranslations((prev) => ({ ...prev, [stateKey]: e.target.value }))
                      }
                      placeholder={`State in ${lang.name}`}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              router.push("/cities");
            }}
            className="border-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-28"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update City
          </Button>
        </div>
      </form>
    </div>
  );
}
