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
  languages?: readonly { code: string; name: string }[];
  names: Record<string, string>;
  levels?: Record<string, string>;
  details: Record<string, string>;
  onNameChange: (key: string, value: string) => void;
  onLevelChange?: (key: string, value: string) => void;
  onDetailsChange: (key: string, value: string) => void;
  nameKeyPrefix: string; // e.g. "courseName", "question"
  levelKeyPrefix?: string; // e.g. "courseLevel"
  detailsKeyPrefix: string; // e.g. "courseDetails", "answer"
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

export function MultilingualContentTable({
  languages = TRANSLATION_LANGUAGES,
  names,
  levels = {},
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
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
          <tr>
            <th className="py-3 px-4 w-[220px] min-w-[200px]">Language</th>
            <th className="py-3 px-4 min-w-[280px]">{nameColumnTitle}</th>
            {!hideLevel && (
              <th className="py-3 px-4 w-[200px] min-w-[180px]">{levelColumnTitle}</th>
            )}
            <th className="py-3 px-4 min-w-[360px]">{detailsColumnTitle}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {languages.map((lang) => {
            const nameKey = `${nameKeyPrefix}${lang.code}`;
            const levelKey = `${levelKeyPrefix}${lang.code}`;
            const detailsKey = `${detailsKeyPrefix}${lang.code}`;

            return (
              <tr key={lang.code} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 align-top">
                  <div className="pt-2 flex flex-col gap-1">
                    <span className="font-semibold text-slate-800 text-xs leading-tight">
                      {lang.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                      {lang.code}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 align-top">
                  <Input
                    id={nameKey}
                    placeholder={`${namePlaceholder} in ${lang.name}`}
                    value={names[nameKey] || ""}
                    onChange={(e) => onNameChange(nameKey, e.target.value)}
                    maxLength={nameMaxLength}
                    className="h-9 text-xs bg-white"
                  />
                </td>
                {!hideLevel && (
                  <td className="py-3 px-4 align-top">
                    <Input
                      id={levelKey}
                      placeholder={`${levelPlaceholder} in ${lang.name}`}
                      value={levels[levelKey] || ""}
                      onChange={(e) => onLevelChange?.(levelKey, e.target.value)}
                      maxLength={levelMaxLength}
                      className="h-9 text-xs bg-white"
                    />
                  </td>
                )}
                <td className="py-3 px-4 align-top">
                  <Textarea
                    id={detailsKey}
                    rows={2}
                    placeholder={`${detailsPlaceholder} in ${lang.name}`}
                    value={details[detailsKey] || ""}
                    onChange={(e) => onDetailsChange(detailsKey, e.target.value)}
                    maxLength={detailsMaxLength}
                    className="text-xs bg-white min-h-[48px] resize-y py-2"
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

