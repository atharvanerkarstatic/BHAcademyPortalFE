"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  GraduationCap,
  MapPin,
  MessagesSquare,
  PlayCircle,
  RefreshCw,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { getDashboardDataAction, getDivisionsAction } from "@/features/dashboard/action";
import type { DashboardData } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

const CYAN = "bg-[#17a2b8] text-white";
const BLUE = "bg-[#007bff] text-white";
const YELLOW = "bg-[#ffc107] text-slate-900";
const GREEN = "bg-[#28a745] text-white";
const RED = "bg-[#dc3545] text-white";

export default function DashboardPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [data, setData] = useState<DashboardData>({});
  const [divisions, setDivisions] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [loadingDivisions, setLoadingDivisions] = useState(true);

  // Load divisions list
  useEffect(() => {
    let mounted = true;
    async function fetchDivisions() {
      const res = await getDivisionsAction();
      if (!mounted) return;
      if (res.success && Array.isArray(res.data)) {
        setDivisions(res.data);
      } else if (res.error) {
        toastError(res.error);
      }
      setLoadingDivisions(false);
    }
    fetchDivisions();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = (division: string, showToast = false) => {
    startTransition(async () => {
      const res = await getDashboardDataAction(division || null);
      if (res.success) {
        setData(res.data);
        if (showToast) {
          toastSuccess(
            division ? `Dashboard updated for ${division}` : "Dashboard updated with latest data"
          );
        }
      } else if (res.error) {
        toastError(res.error);
      }
    });
  };

  useEffect(() => {
    loadData(selectedDivision);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision]);

  const handleSelectDivision = (division: string) => {
    setSelectedDivision(division);
  };

  // Compute total assessments taken
  const assessmentTakenTrainer =
    typeof data.assessmentTakenTrainer === "number" ? data.assessmentTakenTrainer : 0;
  const assessmentTakenSelf =
    typeof data.assessmentTakenSelf === "number" ? data.assessmentTakenSelf : 0;
  const computedTotalAssessments =
    typeof data.assessmentTakenTotal === "number"
      ? data.assessmentTakenTotal
      : assessmentTakenTrainer + assessmentTakenSelf;

  // Active trainers
  const activeTrainers =
    typeof data.activeTrainers === "number"
      ? data.activeTrainers
      : typeof data.trainers === "number"
      ? data.trainers
      : 0;

  // Cards layout matching the reference UI without "Links Shared"
  const stats = [
    { label: "USERS/PARTICIPANTS", href: "/accounts", icon: Users, color: CYAN, value: data.users },
    { label: "ACTIVE TRAINERS", href: "/trainers", icon: GraduationCap, color: BLUE, value: activeTrainers },
    {
      label: "ASSESSMENTS TAKEN (TRAINER)",
      href: "/assessments/results",
      icon: CheckCircle2,
      color: GREEN,
      value: data.assessmentTakenTrainer,
    },
    {
      label: "ASSESSMENTS TAKEN (SELF)",
      href: "/assessments/results",
      icon: CheckCircle2,
      color: GREEN,
      value: data.assessmentTakenSelf,
    },
    {
      label: "ASSESSMENTS TAKEN (TOTAL)",
      href: "/assessments/results",
      icon: CheckCircle2,
      color: GREEN,
      value: computedTotalAssessments,
    },
    { label: "CITIES", href: "/cities", icon: MapPin, color: YELLOW, value: data.cities },
    { label: "COURSES", href: "/courses", icon: PlayCircle, color: GREEN, value: data.courses },
    { label: "ACTIVE LANGUAGES", href: "/languages", icon: MessagesSquare, color: RED, value: data.activeLanguages },
  ];

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <PageHeader title="Dashboard" />
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(selectedDivision, true)}
            disabled={isPending}
            className="gap-1.5 text-slate-600 bg-white uppercase text-xs font-semibold tracking-wider"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            REFRESH DATA
          </Button>
        </div>
      </div>

      {/* Division Filter Tiles */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => handleSelectDivision("")}
          disabled={isPending}
          className={cn(
            "min-w-28 rounded-md border-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-xs cursor-pointer select-none",
            selectedDivision === ""
              ? "bg-[#007bff] text-white border-[#007bff] shadow-md ring-2 ring-blue-300 ring-offset-1"
              : "bg-white text-blue-600 border-blue-400 hover:bg-blue-50 hover:border-blue-500"
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
              onClick={() => handleSelectDivision(div)}
              disabled={isPending}
              className={cn(
                "min-w-28 rounded-md border-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-xs cursor-pointer select-none",
                isSelected
                  ? "bg-[#007bff] text-white border-[#007bff] shadow-md ring-2 ring-blue-300 ring-offset-1"
                  : "bg-white text-blue-600 border-blue-400 hover:bg-blue-50 hover:border-blue-500"
              )}
            >
              {div.toUpperCase()}
            </button>
          );
        })}

        {loadingDivisions && (
          <span className="text-xs uppercase font-medium text-slate-400 italic">LOADING DIVISIONS…</span>
        )}
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