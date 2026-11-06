"use client";

import { Suspense, useEffect, useState, useTransition, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Languages, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { getFaqByIdAction, updateFaqAction } from "@/features/faqs/action";
import type { FaqItem, UpdateFaqPayload } from "@/features/faqs/types";
import { sanitizeTextInput, sanitizeNonNegativeNumber } from "@/lib/validations";
import { MultilingualContentTable, TRANSLATION_LANGUAGES } from "@/components/common/multilingual-content-table";

function EditFaqContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { success, error: toastError } = useToast();
  const [fetching, setFetching] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [questions, setQuestions] = useState<Record<string, string>>({
    questionAs: "",
    questionBn: "",
    questionGu: "",
    questionHi: "",
    questionKn: "",
    questionMl: "",
    questionMr: "",
    questionOr: "",
    questionTa: "",
    questionTe: "",
  });

  const [answers, setAnswers] = useState<Record<string, string>>({
    answerAs: "",
    answerBn: "",
    answerGu: "",
    answerHi: "",
    answerKn: "",
    answerMl: "",
    answerMr: "",
    answerOr: "",
    answerTa: "",
    answerTe: "",
  });

  const populateFromItem = useCallback((item: FaqItem) => {
    setQuestion(item.question || "");
    setAnswer(item.answer || "");
    setDisplayOrder(item.displayOrder ?? 1);
    setStatus(item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");

    setQuestions({
      questionAs: item.questionAs || "",
      questionBn: item.questionBn || "",
      questionGu: item.questionGu || "",
      questionHi: item.questionHi || "",
      questionKn: item.questionKn || "",
      questionMl: item.questionMl || "",
      questionMr: item.questionMr || "",
      questionOr: item.questionOr || "",
      questionTa: item.questionTa || "",
      questionTe: item.questionTe || "",
    });

    setAnswers({
      answerAs: item.answerAs || "",
      answerBn: item.answerBn || "",
      answerGu: item.answerGu || "",
      answerHi: item.answerHi || "",
      answerKn: item.answerKn || "",
      answerMl: item.answerMl || "",
      answerMr: item.answerMr || "",
      answerOr: item.answerOr || "",
      answerTa: item.answerTa || "",
      answerTe: item.answerTe || "",
    });
  }, []);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    (async () => {
      setFetching(true);
      const res = await getFaqByIdAction(id);
      if (!mounted) return;

      if (res.success && res.data) {
        populateFromItem(res.data);
      } else {
        toastError(res.error || "Failed to load FAQ details");
      }
      setFetching(false);
    })();

    return () => {
      mounted = false;
    };
  }, [id, populateFromItem, toastError]);

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

    const sanitizedQuestions: Record<string, string> = {};
    for (const [key, val] of Object.entries(questions)) {
      if (!val) continue;
      sanitizedQuestions[key] = sanitizeTextInput(val, 500);
    }

    const sanitizedAnswers: Record<string, string> = {};
    for (const [key, val] of Object.entries(answers)) {
      if (!val) continue;
      sanitizedAnswers[key] = sanitizeTextInput(val, 5000);
    }

    const payload: UpdateFaqPayload = {
      question: cleanQuestion,
      answer: cleanAnswer,
      displayOrder: sanitizeNonNegativeNumber(displayOrder, 1, 1),
      status,
      ...sanitizedQuestions,
      ...sanitizedAnswers,
    };

    startTransition(async () => {
      const res = await updateFaqAction(id, payload);
      if (res.success) {
        success("FAQ updated successfully");
        router.push("/faqs");
      } else {
        toastError(res.error || "Failed to update FAQ. Please check all fields.");
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-xs text-slate-500">Loading FAQ details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage FAQs"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "FAQs List", href: "/faqs" },
          { label: "Edit FAQ" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Edit FAQ
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
            onSubmit={handleSubmit}
            autoComplete="off"
            className="w-full space-y-6"
          >
            {/* Primary Details (Compact Centered Section) */}
            <div className="mx-auto max-w-2xl space-y-4">
              {/* Question */}
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
                    placeholder="e.g. How do I start the virtual training session?"
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
                    rows={4}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Provide a comprehensive answer..."
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
            </div>

            {/* Multilingual Section Divider (Wide Section) */}
            <div className="pt-6 border-t border-slate-100 w-full">
              <div className="flex items-center gap-2 mb-3">
                <Languages className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Multilingual Translations (Optional)
                </h3>
              </div>
              <MultilingualContentTable
                languages={TRANSLATION_LANGUAGES}
                names={questions}
                details={answers}
                onNameChange={(key, val) => setQuestions((prev) => ({ ...prev, [key]: val }))}
                onDetailsChange={(key, val) => setAnswers((prev) => ({ ...prev, [key]: val }))}
                nameKeyPrefix="question"
                detailsKeyPrefix="answer"
                namePlaceholder="Question"
                detailsPlaceholder="Answer"
                nameMaxLength={500}
                detailsMaxLength={5000}
                hideLevel={true}
                nameColumnTitle="Question"
                detailsColumnTitle="Answer"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold uppercase"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                SAVE CHANGES
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={isPending}
                className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
              >
                <Link href="/faqs">CANCEL</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditFaqPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <EditFaqContent />
    </Suspense>
  );
}
