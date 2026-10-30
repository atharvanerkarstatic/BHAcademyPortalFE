"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, HelpCircle, Languages, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createFaqAction } from "@/features/faqs/action";
import type { CreateFaqPayload } from "@/features/faqs/types";

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

const INITIAL_TRANSLATIONS: Record<string, string> = {
  questionBn: "",
  questionHi: "",
  questionKn: "",
  questionMl: "",
  questionOr: "",
  questionTa: "",
  questionTe: "",
  questionAs: "",
  questionGu: "",
  questionMr: "",
  answerBn: "",
  answerHi: "",
  answerKn: "",
  answerMl: "",
  answerOr: "",
  answerTa: "",
  answerTe: "",
  answerAs: "",
  answerGu: "",
  answerMr: "",
};

export default function NewFaqPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  // Form key to force-clear any cached DOM input fields upon remount or reset
  const [formKey, setFormKey] = useState<number>(() => Date.now());

  // Mandatory primary fields
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Multilingual translations
  const [translations, setTranslations] = useState<Record<string, string>>(INITIAL_TRANSLATIONS);

  const resetForm = () => {
    setQuestion("");
    setAnswer("");
    setDisplayOrder(1);
    setStatus("ACTIVE");
    setTranslations({ ...INITIAL_TRANSLATIONS });
    setFormKey(Date.now());
  };

  // Always reset fields when opening or unmounting the New FAQ page
  useEffect(() => {
    resetForm();
    return () => {
      resetForm();
    };
  }, []);

  const handleCancel = () => {
    resetForm();
    router.push("/faqs");
  };

  const handleTranslationChange = (key: string, value: string) => {
    setTranslations((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      toastError("Question is required.");
      return;
    }

    if (cleanQuestion.length > 500) {
      toastError("Character size limit exceeded: Question must not exceed 500 characters.");
      return;
    }

    const cleanAnswer = answer.trim();
    if (!cleanAnswer) {
      toastError("Answer is required.");
      return;
    }

    if (cleanAnswer.length > 5000) {
      toastError("Character size limit exceeded: Answer must not exceed 5000 characters.");
      return;
    }

    for (const [key, val] of Object.entries(translations)) {
      if (!val) continue;
      if (key.startsWith("question") && val.length > 500) {
        toastError(`Character size limit exceeded: ${key} must not exceed 500 characters.`);
        return;
      }
      if (key.startsWith("answer") && val.length > 5000) {
        toastError(`Character size limit exceeded: ${key} must not exceed 5000 characters.`);
        return;
      }
    }

    const payload: CreateFaqPayload = {
      question: cleanQuestion,
      answer: cleanAnswer,
      displayOrder: Number(displayOrder) || 1,
      status,
      ...translations,
    };

    startTransition(async () => {
      const res = await createFaqAction(payload);
      if (res.success) {
        success("FAQ created successfully");
        resetForm();
        router.push("/faqs");
      } else {
        console.error("Backend error from createFaqAction:", res.error);

        const errText = (res.error || "").toLowerCase();
        let displayMsg = res.error || "Failed to create FAQ. Please check all fields and try again.";
        if (
          errText.includes("character") ||
          errText.includes("size") ||
          errText.includes("limit") ||
          errText.includes("too long") ||
          errText.includes("length")
        ) {
          displayMsg = "Character size limit exceeded. Please ensure all inputs are within the allowed limit.";
        }

        toastError(displayMsg);
      }
    });
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to FAQs
        </Button>
      </div>

      <PageHeader
        title="Add New FAQ"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "FAQs List", href: "/faqs" },
          { label: "Add FAQ" },
        ]}
      />

      <form key={formKey} onSubmit={handleSubmit} noValidate autoComplete="off" className="w-full space-y-6">

        {/* Primary Information Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <CardTitle>Basic Information</CardTitle>
            </div>
            <CardDescription>
              Configure the primary FAQ question, answer, display order, and status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="question">
                  Question <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="question"
                  placeholder="e.g. How do I reset my password?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={500}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="displayOrder">
                    Display Order <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="answer">
                Answer <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="answer"
                rows={3}
                placeholder="e.g. Go to Settings > Account > Reset Password and follow the steps."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={5000}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Multilingual Translations Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-indigo-600" />
              <CardTitle>Multilingual Translations (Optional)</CardTitle>
            </div>
            <CardDescription>
              Provide regional language translations for your FAQ across 10 Indian languages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {TRANSLATION_LANGUAGES.map((lang) => {
                const qKey = `question${lang.code}`;
                const aKey = `answer${lang.code}`;
                return (
                  <div
                    key={lang.code}
                    className="flex flex-col justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-semibold text-slate-800 text-sm">{lang.name}</span>
                      <span className="text-xs text-slate-500 font-mono uppercase">{lang.code}</span>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor={qKey} className="text-xs text-slate-600">
                        Question ({lang.name})
                      </Label>
                      <Input
                        id={qKey}
                        placeholder={`Question in ${lang.name}`}
                        value={translations[qKey] || ""}
                        onChange={(e) => handleTranslationChange(qKey, e.target.value)}
                        maxLength={500}
                        className="bg-white"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor={aKey} className="text-xs text-slate-600">
                        Answer ({lang.name})
                      </Label>
                      <Textarea
                        id={aKey}
                        rows={2}
                        placeholder={`Answer in ${lang.name}`}
                        value={translations[aKey] || ""}
                        onChange={(e) => handleTranslationChange(aKey, e.target.value)}
                        maxLength={5000}
                        className="bg-white min-h-[60px]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons: Cancel and Save */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleCancel}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-28"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save FAQ"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
