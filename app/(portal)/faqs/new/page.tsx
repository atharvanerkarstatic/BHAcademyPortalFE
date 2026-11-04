"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HelpCircle, Languages, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createFaqAction } from "@/features/faqs/action";
import type { CreateFaqPayload } from "@/features/faqs/types";
import { sanitizeTextInput, sanitizeNonNegativeNumber } from "@/lib/validations";

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

  const [formKey, setFormKey] = useState<number>(() => Date.now());

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [translations, setTranslations] = useState<Record<string, string>>(INITIAL_TRANSLATIONS);

  const resetForm = () => {
    setQuestion("");
    setAnswer("");
    setDisplayOrder(1);
    setStatus("ACTIVE");
    setTranslations({ ...INITIAL_TRANSLATIONS });
    setFormKey(Date.now());
  };

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

    const cleanQuestion = sanitizeTextInput(question, 500);
    if (!cleanQuestion) {
      toastError("Question is required.");
      return;
    }

    const cleanAnswer = sanitizeTextInput(answer, 5000);
    if (!cleanAnswer) {
      toastError("Answer is required.");
      return;
    }

    const sanitizedTranslations: Record<string, string> = {};
    for (const [key, val] of Object.entries(translations)) {
      if (!val) continue;
      const limit = key.startsWith("question") ? 500 : 5000;
      sanitizedTranslations[key] = sanitizeTextInput(val, limit);
    }

    const payload: CreateFaqPayload = {
      question: cleanQuestion,
      answer: cleanAnswer,
      displayOrder: sanitizeNonNegativeNumber(displayOrder, 1, 1),
      status,
      ...sanitizedTranslations,
    };

    startTransition(async () => {
      const res = await createFaqAction(payload);
      if (res.success) {
        success("FAQ created successfully");
        resetForm();
        router.push("/faqs");
      } else {
        toastError(res.error || "Failed to create FAQ. Please check all fields.");
      }
    });
  };

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage FAQs"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "FAQs List", href: "/faqs" },
          { label: "Add New FAQ" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Add New FAQ
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600 hover:text-slate-900">
            <Link href="/faqs">
              <ArrowLeft className="h-4 w-4" />
              Back to FAQs List
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
            {/* Primary Question */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="faq-question"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Question <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="faq-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. How do I reset my password?"
                  maxLength={500}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Answer */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
              <Label
                htmlFor="faq-answer"
                className="text-xs font-semibold text-slate-700 sm:text-right pt-2"
              >
                Answer <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Textarea
                  id="faq-answer"
                  rows={3}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. Go to Settings > Account > Reset Password..."
                  maxLength={5000}
                  className="text-xs"
                  required
                />
              </div>
            </div>

            {/* Display Order */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="faq-order"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Display Order <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="faq-order"
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(sanitizeNonNegativeNumber(e.target.value, 1, 1))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="faq-status"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Status <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <select
                  id="faq-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {/* Multilingual Section Divider */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Languages className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Multilingual Translations (Optional)
                </h3>
              </div>
              <div className="space-y-4">
                {TRANSLATION_LANGUAGES.map((lang) => {
                  const qKey = `question${lang.code}`;
                  const aKey = `answer${lang.code}`;
                  return (
                    <div
                      key={lang.code}
                      className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="font-semibold text-slate-800 text-xs">{lang.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono uppercase">{lang.code}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                        <Label htmlFor={qKey} className="text-xs text-slate-600 sm:text-right">
                          Question
                        </Label>
                        <div className="sm:col-span-3">
                          <Input
                            id={qKey}
                            placeholder={`Question in ${lang.name}`}
                            value={translations[qKey] || ""}
                            onChange={(e) => handleTranslationChange(qKey, e.target.value)}
                            maxLength={500}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                        <Label htmlFor={aKey} className="text-xs text-slate-600 sm:text-right pt-1.5">
                          Answer
                        </Label>
                        <div className="sm:col-span-3">
                          <Textarea
                            id={aKey}
                            rows={2}
                            placeholder={`Answer in ${lang.name}`}
                            value={translations[aKey] || ""}
                            onChange={(e) => handleTranslationChange(aKey, e.target.value)}
                            maxLength={5000}
                            className="text-xs bg-white min-h-[50px]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold uppercase"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
              >
                CANCEL
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
