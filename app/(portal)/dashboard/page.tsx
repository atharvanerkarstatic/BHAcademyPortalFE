"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  GraduationCap,
  Link2,
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
import { getDashboardDataAction } from "@/features/dashboard/action";
import type { DashboardData } from "@/features/dashboard/types";

const BLUE = "bg-cyan-600 text-white";
const YELLOW = "bg-amber-400 text-slate-900";
const GREEN = "bg-emerald-600 text-white";
const RED = "bg-rose-600 text-white";

export default function DashboardPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [data, setData] = useState<DashboardData>({});
  const [isPending, startTransition] = useTransition();

  const loadData = (showToast = false) => {
    startTransition(async () => {
      const res = await getDashboardDataAction();
      if (res.success) {
        setData(res.data);
        if (showToast) {
          toastSuccess("Dashboard updated with latest data");
        }
      } else if (res.error) {
        toastError(res.error);
      }
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute total assessments taken (trainer + self, or direct API field if provided)
  const assessmentTakenTrainer = typeof data.assessmentTakenTrainer === "number" ? data.assessmentTakenTrainer : 0;
  const assessmentTakenSelf = typeof data.assessmentTakenSelf === "number" ? data.assessmentTakenSelf : 0;
  const computedTotalAssessments =
    typeof data.assessmentTakenTotal === "number"
      ? data.assessmentTakenTotal
      : assessmentTakenTrainer + assessmentTakenSelf;

  // Active trainers (from direct activeTrainers property, or fallback)
  const activeTrainers =
    typeof data.activeTrainers === "number"
      ? data.activeTrainers
      : typeof data.trainers === "number"
      ? data.trainers
      : 0;

  const stats = [
    { label: "Accounts", href: "/accounts", icon: Users, color: BLUE, value: data.users },
    { label: "Active Trainers", href: "/trainers", icon: GraduationCap, color: BLUE, value: activeTrainers },
    { label: "Links Shared", href: "/zoom/links", icon: Link2, color: YELLOW, value: data.linksShared },
    {
      label: "Assessments Taken (Total)",
      href: "/assessments/results",
      icon: CheckCircle2,
      color: GREEN,
      value: computedTotalAssessments,
    },
    {
      label: "Assessments Taken (Trainer)",
      href: "/assessments/results",
      icon: CheckCircle2,
      color: GREEN,
      value: data.assessmentTakenTrainer,
    },
    {
      label: "Assessments Taken (Self)",
      href: "/assessments/results",
      icon: CheckCircle2,
      color: GREEN,
      value: data.assessmentTakenSelf,
    },
    { label: "Cities", href: "/cities", icon: MapPin, color: YELLOW, value: data.cities },
    { label: "Courses", href: "/courses", icon: PlayCircle, color: GREEN, value: data.courses },
    { label: "Active Languages", href: "/languages", icon: MessagesSquare, color: RED, value: data.activeLanguages },
  ];

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <PageHeader title="Dashboard" />
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isPending}
            className="gap-1.5 text-slate-600 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </>
  );
}