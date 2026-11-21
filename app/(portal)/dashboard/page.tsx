"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  GraduationCap,
  MapPin,
  MessagesSquare,
  PlayCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { StatCard } from "@/features/dashboard/components/stat-card";
import type { DashboardData } from "@/features/dashboard/types";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const CYAN = "bg-[#17a2b8] text-white";
const BLUE = "bg-[#007bff] text-white";
const YELLOW = "bg-[#ffc107] text-slate-900";
const GREEN = "bg-[#28a745] text-white";
const RED = "bg-[#dc3545] text-white";

export default function DashboardPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [selectedDivision, setSelectedDivision] = useState("");

  const { data: divisions = [], isLoading: loadingDivisions } = useQuery({
    queryKey: queryKeys.divisions,
    queryFn: ({ signal }) =>
      portalGet<Array<string>>("divisions", undefined, signal),
    staleTime: 10 * 60_000,
  });

  const {
    data = {},
    isFetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dashboard.byDivision(selectedDivision),
    queryFn: ({ signal }) =>
      portalGet<DashboardData>(
        "dashboard",
        { division: selectedDivision || "" },
        signal
      ),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const handleRefresh = async () => {
    const result = await refetch();
    if (result.error) {
      toastError(result.error.message || "Failed to load dashboard data.");
    } else {
      toastSuccess(
        selectedDivision
          ? `Dashboard updated for ${selectedDivision}`
          : "Dashboard updated with latest data"
      );
    }
  };

  const assessmentTakenTrainer =
    typeof data.assessmentTakenTrainer === "number"
      ? data.assessmentTakenTrainer
      : 0;
  const assessmentTakenSelf =
    typeof data.assessmentTakenSelf === "number" ? data.assessmentTakenSelf : 0;
  const computedTotalAssessments =
    typeof data.assessmentTakenTotal === "number"
      ? data.assessmentTakenTotal
      : assessmentTakenTrainer + assessmentTakenSelf;

  const { activeTrainers: rawActiveTrainers, trainers: rawTrainers } = data;
  let activeTrainers = 0;
  if (typeof rawActiveTrainers === "number") {
    activeTrainers = rawActiveTrainers;
  } else if (typeof rawTrainers === "number") {
    activeTrainers = rawTrainers;
  }

  const stats = [
    {
      label: "USERS/PARTICIPANTS",
      href: "/accounts",
      icon: Users,
      color: CYAN,
      value: data.users,
    },
    {
      label: "ACTIVE TRAINERS",
      href: "/trainers",
      icon: GraduationCap,
      color: BLUE,
      value: activeTrainers,
    },
    {
      label: "ASSESSMENT",
      href: "/assessments/results",
      icon: CheckCircle2,
      color: GREEN,
      value: computedTotalAssessments,
    },
    {
      label: "CITIES",
      href: "/cities",
      icon: MapPin,
      color: YELLOW,
      value: data.cities,
    },
    {
      label: "COURSES",
      href: "/courses",
      icon: PlayCircle,
      color: GREEN,
      value: data.courses,
    },
    {
      label: "ACTIVE LANGUAGES",
      href: "/languages",
      icon: MessagesSquare,
      color: RED,
      value: data.activeLanguages,
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Dashboard" />
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void handleRefresh();
            }}
            disabled={isFetching}
            className="gap-1.5 bg-white text-xs font-semibold tracking-wider text-slate-600 uppercase"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            REFRESH DATA
          </Button>
        </div>
      </div>

      {/* Division Filter Tiles */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedDivision("");
          }}
          disabled={isFetching}
          className={cn(
            "min-w-28 cursor-pointer rounded-md border-2 px-5 py-2.5 text-xs font-bold tracking-wider uppercase shadow-xs transition-all duration-200 select-none",
            selectedDivision === ""
              ? "border-[#007bff] bg-[#007bff] text-white shadow-md ring-2 ring-blue-300 ring-offset-1"
              : "border-blue-400 bg-white text-blue-600 hover:border-blue-500 hover:bg-blue-50"
          )}
        >
          ALL
        </button>

        {divisions.map((div) => {
          const isSelected = selectedDivision === div;
          return (
            <button
              key={div}
              type="button"
              onClick={() => {
                setSelectedDivision(div);
              }}
              disabled={isFetching}
              className={cn(
                "min-w-28 cursor-pointer rounded-md border-2 px-5 py-2.5 text-xs font-bold tracking-wider uppercase shadow-xs transition-all duration-200 select-none",
                isSelected
                  ? "border-[#007bff] bg-[#007bff] text-white shadow-md ring-2 ring-blue-300 ring-offset-1"
                  : "border-blue-400 bg-white text-blue-600 hover:border-blue-500 hover:bg-blue-50"
              )}
            >
              {div.toUpperCase()}
            </button>
          );
        })}

        {loadingDivisions ? (
          <span className="text-xs font-medium text-slate-400 uppercase italic">
            LOADING DIVISIONS…
          </span>
        ) : null}
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </>
  );
}
