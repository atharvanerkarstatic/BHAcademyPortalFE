"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, Languages } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { updateCityAction } from "@/features/cities/action";
import type {
  CityItem,
  CityTranslationKey,
  CityTranslations,
  SaveCityPayload,
  StateTranslationKey,
  StateTranslations,
} from "@/features/cities/types";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";

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

function buildCityTranslations(item: CityItem): CityTranslations {
  const result: CityTranslations = {};
  for (const lang of TRANSLATION_LANGUAGES) {
    const key: CityTranslationKey = `city${lang.code}`;
    const value = item[key];
    if (typeof value === "string" && value.length > 0) {
      result[key] = value;
    }
  }
  return result;
}

function buildStateTranslations(item: CityItem): StateTranslations {
  const result: StateTranslations = {};
  for (const lang of TRANSLATION_LANGUAGES) {
    const key: StateTranslationKey = `state${lang.code}`;
    const value = item[key];
    if (typeof value === "string" && value.length > 0) {
      result[key] = value;
    }
  }
  return result;
}

function EditCityForm({ id, item }: { id: string; item: CityItem }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [pinCode, setPinCode] = useState(() => item.pinCode || "");
  const [city, setCity] = useState(() => item.city || "");
  const [state, setState] = useState(() => item.state || "");
  const [division, setDivision] = useState(() => item.division || "");
  const [region, setRegion] = useState(() => item.region || "");

  const [cityTranslations, setCityTranslations] = useState<CityTranslations>(
    () => buildCityTranslations(item)
  );
  const [stateTranslations, setStateTranslations] = useState<StateTranslations>(
    () => buildStateTranslations(item)
  );

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
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
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.cities.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.divisions }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        ]);
        success(res.message || "City updated successfully");
        router.push("/cities");
      } else {
        toastError(res.error || "Failed to update city");
      }
    });
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
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
          { label: "Edit City" },
        ]}
      />

      <form onSubmit={handleSubmit} noValidate className="w-full space-y-6">
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="pinCode"
                  className="text-xs font-semibold text-slate-700"
                >
                  Pincode <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pinCode"
                  value={pinCode}
                  onChange={(e) => {
                    setPinCode(e.target.value);
                  }}
                  placeholder="e.g. 411001"
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="city"
                  className="text-xs font-semibold text-slate-700"
                >
                  City Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                  }}
                  placeholder="e.g. Pune"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="state"
                  className="text-xs font-semibold text-slate-700"
                >
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                  }}
                  placeholder="e.g. Maharashtra"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="division"
                  className="text-xs font-semibold text-slate-700"
                >
                  Division
                </Label>
                <Input
                  id="division"
                  value={division}
                  onChange={(e) => {
                    setDivision(e.target.value);
                  }}
                  placeholder="e.g. Pune Division"
                  className="text-xs"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="region"
                  className="text-xs font-semibold text-slate-700"
                >
                  Region
                </Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                  }}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {TRANSLATION_LANGUAGES.map((lang) => {
                const cityKey: CityTranslationKey = `city${lang.code}`;
                return (
                  <div
                    key={lang.code}
                    className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                  >
                    <Label
                      htmlFor={`edit-${cityKey}`}
                      className="text-xs font-medium text-slate-700"
                    >
                      {lang.name}
                    </Label>
                    <Input
                      id={`edit-${cityKey}`}
                      value={cityTranslations[cityKey] || ""}
                      onChange={(e) => {
                        setCityTranslations((prev) => ({
                          ...prev,
                          [cityKey]: e.target.value,
                        }));
                      }}
                      placeholder={`City in ${lang.name}`}
                      className="h-8 bg-white text-xs"
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {TRANSLATION_LANGUAGES.map((lang) => {
                const stateKey: StateTranslationKey = `state${lang.code}`;
                return (
                  <div
                    key={lang.code}
                    className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                  >
                    <Label
                      htmlFor={`edit-${stateKey}`}
                      className="text-xs font-medium text-slate-700"
                    >
                      {lang.name}
                    </Label>
                    <Input
                      id={`edit-${stateKey}`}
                      value={stateTranslations[stateKey] || ""}
                      onChange={(e) => {
                        setStateTranslations((prev) => ({
                          ...prev,
                          [stateKey]: e.target.value,
                        }));
                      }}
                      placeholder={`State in ${lang.name}`}
                      className="h-8 bg-white text-xs"
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
              router.back();
            }}
            className="border-slate-300"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="min-w-28 bg-blue-600 text-white hover:bg-blue-700"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update City
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditCityPage() {
  const params = useParams();
  const id = String(params.id ?? "");

  const {
    data: cityItem,
    isLoading,
    isFetching,
    isPaused,
    isFetchedAfterMount,
    error,
  } = useQuery({
    queryKey: queryKeys.cities.detail(id),
    queryFn: ({ signal }) =>
      portalGet<CityItem>(
        `cities/${encodeURIComponent(id)}`,
        undefined,
        signal
      ),
    enabled: Boolean(id),
    refetchOnMount: "always",
    refetchOnReconnect: false,
  });

  if (isLoading || ((isFetching || isPaused) && !isFetchedAfterMount)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading city details…</p>
      </div>
    );
  }

  if (!cityItem) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <Link href="/cities">
            <ArrowLeft className="h-4 w-4" />
            Back to Cities List
          </Link>
        </Button>
        <Card className="p-8 text-center text-sm text-slate-500">
          {error instanceof Error
            ? error.message
            : "Failed to load city details."}
        </Card>
      </div>
    );
  }

  return (
    <EditCityForm key={String(cityItem.id ?? id)} id={id} item={cityItem} />
  );
}
