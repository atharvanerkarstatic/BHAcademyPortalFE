"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const TRANSLATION_LANGUAGES = [
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

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

export interface MultilingualContentTableProps {
  languages?: ReadonlyArray<{ code: string; name: string }>;
  names: Record<string, string>;
  levels?: Record<string, string>;
  details: Record<string, string>;
  onNameChange: (key: string, value: string) => void;
  onLevelChange?: (key: string, value: string) => void;
  onDetailsChange: (key: string, value: string) => void;
  // e.g. "courseName", "question"
  nameKeyPrefix: string;
  // e.g. "courseLevel"
  levelKeyPrefix?: string;
  // e.g. "courseDetails", "answer"
  detailsKeyPrefix: string;
  namePlaceholder?: string;
  levelPlaceholder?: string;
  detailsPlaceholder?: string;
  nameMaxLength?: number;
  levelMaxLength?: number;
  detailsMaxLength?: number;
  hideLevel?: boolean;
  nameColumnTitle?: string;
  detailsColumnTitle?: string;
  levelColumnTitle?: string;
}

const EMPTY_LEVELS: Record<string, string> = {};

export function MultilingualContentTable({
  languages = TRANSLATION_LANGUAGES,
  names,
  levels = EMPTY_LEVELS,
  details,
  onNameChange,
  onLevelChange,
  onDetailsChange,
  nameKeyPrefix,
  levelKeyPrefix = "level",
  detailsKeyPrefix,
  namePlaceholder = "Name",
  levelPlaceholder = "Level",
  detailsPlaceholder = "Details",
  nameMaxLength = 255,
  levelMaxLength = 100,
  detailsMaxLength = 5000,
  hideLevel = false,
  nameColumnTitle = "Name",
  detailsColumnTitle = "Details",
  levelColumnTitle = "Level",
}: MultilingualContentTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
          <tr>
            <th className="w-[220px] min-w-[200px] px-4 py-3">Language</th>
            <th className="min-w-[280px] px-4 py-3">{nameColumnTitle}</th>
            {!hideLevel && (
              <th className="w-[200px] min-w-[180px] px-4 py-3">
                {levelColumnTitle}
              </th>
            )}
            <th className="min-w-[360px] px-4 py-3">{detailsColumnTitle}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {languages.map((lang) => {
            const nameKey = `${nameKeyPrefix}${lang.code}`;
            const levelKey = `${levelKeyPrefix}${lang.code}`;
            const detailsKey = `${detailsKeyPrefix}${lang.code}`;

            return (
              <tr
                key={lang.code}
                className="transition-colors hover:bg-slate-50/60"
              >
                <th
                  scope="row"
                  aria-label={lang.name}
                  className="px-4 py-3 align-top font-normal"
                >
                  <div className="flex flex-col gap-1 pt-2">
                    <span className="text-xs leading-tight font-semibold text-slate-800">
                      {lang.name}
                    </span>
                    <span className="w-fit rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 uppercase">
                      {lang.code}
                    </span>
                  </div>
                </th>
                <td className="px-4 py-3 align-top">
                  <Input
                    id={nameKey}
                    placeholder={`${namePlaceholder} in ${lang.name}`}
                    value={names[nameKey] || ""}
                    onChange={(e) => {
                      onNameChange(nameKey, e.target.value);
                    }}
                    maxLength={nameMaxLength}
                    className="h-9 bg-white text-xs"
                  />
                </td>
                {!hideLevel && (
                  <td className="px-4 py-3 align-top">
                    <Input
                      id={levelKey}
                      placeholder={`${levelPlaceholder} in ${lang.name}`}
                      value={levels[levelKey] || ""}
                      onChange={(e) =>
                        onLevelChange?.(levelKey, e.target.value)
                      }
                      maxLength={levelMaxLength}
                      className="h-9 bg-white text-xs"
                    />
                  </td>
                )}
                <td className="px-4 py-3 align-top">
                  <Textarea
                    id={detailsKey}
                    rows={2}
                    placeholder={`${detailsPlaceholder} in ${lang.name}`}
                    value={details[detailsKey] || ""}
                    onChange={(e) => {
                      onDetailsChange(detailsKey, e.target.value);
                    }}
                    maxLength={detailsMaxLength}
                    className="min-h-[48px] resize-y bg-white py-2 text-xs"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
