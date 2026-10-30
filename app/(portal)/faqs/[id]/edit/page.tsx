"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HelpCircle, Languages, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { getFaqByIdAction, updateFaqAction } from "@/features/faqs/action";
import type { UpdateFaqPayload } from "@/features/faqs/types";

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

function EditFaqContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { success, error: toastError } = useToast();
  const [fetching, setFetching] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [translations, setTranslations] = useState<Record<string, string>>({
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
  });

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    (async () => {
      setFetching(true);
      const res = await getFaqByIdAction(id);
      if (!mounted) return;

      if (res.success && res.data) {
        const item = res.data;
        setQuestion(item.question || "");
        setAnswer(item.answer || "");
        setDisplayOrder(item.displayOrder ?? 1);
        setStatus(item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");

        setTranslations({
          questionBn: item.questionBn || "",
          questionHi: item.questionHi || "",
          questionKn: item.questionKn || "",
          questionMl: item.questionMl || "",
          questionOr: item.questionOr || "",
          questionTa: item.questionTa || "",
          questionTe: item.questionTe || "",
          questionAs: item.questionAs || "",
          questionGu: item.questionGu || "",
          questionMr: item.questionMr || "",
          answerBn: item.answerBn || "",
          answerHi: item.answerHi || "",
          answerKn: item.answerKn || "",
          answerMl: item.answerMl || "",
          answerOr: item.answerOr || "",
          answerTa: item.answerTa || "",
          answerTe: item.answerTe || "",
          answerAs: item.answerAs || "",
          answerGu: item.answerGu || "",
          answerMr: item.answerMr || "",
        });
      } else {
        const msg = res.error || "Failed to load FAQ details";
        setError(msg);
        toastError(msg);
      }
      setFetching(false);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTranslationChange = (key: string, value: string) => {
    setTranslations((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setError("Question is required.");
      return;
    }

    if (cleanQuestion.length > 500) {
      setError("Character size limit exceeded: Question must not exceed 500 characters.");
      return;
    }

    const cleanAnswer = answer.trim();
    if (!cleanAnswer) {
      setError("Answer is required.");
      return;
    }

    if (cleanAnswer.length > 5000) {
      setError("Character size limit exceeded: Answer must not exceed 5000 characters.");
      return;
    }

    for (const [key, val] of Object.entries(translations)) {
      if (!val) continue;
      if (key.startsWith("question") && val.length > 500) {
        setError(`Character size limit exceeded: ${key} must not exceed 500 characters.`);
        return;
      }
      if (key.startsWith("answer") && val.length > 5000) {
        setError(`Character size limit exceeded: ${key} must not exceed 5000 characters.`);
        return;
      }
    }

    const payload: UpdateFaqPayload = {
      question: cleanQuestion,
      answer: cleanAnswer,
      displayOrder: Number(displayOrder) || 1,
      status,
      ...translations,
    };

    startTransition(async () => {
      const res = await updateFaqAction(id, payload);
      if (res.success) {
        success(res.message || "FAQ updated successfully");
        router.push("/faqs");
      } else {
        console.error("Backend error from updateFaqAction:", res.error);

        const errText = (res.error || "").toLowerCase();
        let displayMsg = "Failed to update FAQ. Please check all fields and try again.";
        if (
          errText.includes("character") ||
          errText.includes("size") ||
          errText.includes("limit") ||
          errText.includes("too long") ||
          errText.includes("length")
        ) {
          displayMsg = "Character size limit exceeded. Please ensure all inputs are within the allowed limit.";
        }

        setError(displayMsg);
        toastError(displayMsg);
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading FAQ details…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <Link href="/faqs">
            <ArrowLeft className="h-4 w-4" />
            Back to FAQs
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Edit FAQ #${id}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "FAQs List", href: "/faqs" },
          { label: `Edit FAQ #${id}` },
        ]}
      />

      <form onSubmit={handleSubmit} noValidate className="w-full space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Primary Information Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <CardTitle>Basic Information</CardTitle>
            </div>
            <CardDescription>
              Update the FAQ question, answer, display order, and status.
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

        {/* Action Buttons: Cancel (discards unsaved) and Save */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            asChild
            disabled={isPending}
          >
            <Link href="/faqs">
              Cancel
            </Link>
          </Button>

          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-28"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditFaqPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Loading page…</p>
        </div>
      }
    >
      <EditFaqContent />
    </Suspense>
  );
}
