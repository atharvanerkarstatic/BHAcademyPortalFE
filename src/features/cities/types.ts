export type CityTranslationCode =
  | "Hi"
  | "Bn"
  | "Kn"
  | "Ml"
  | "Or"
  | "Ta"
  | "Te"
  | "As"
  | "Gu"
  | "Mr";
export type CityTranslationKey = `city${CityTranslationCode}`;
export type StateTranslationKey = `state${CityTranslationCode}`;
export type CityTranslations = Partial<Record<CityTranslationKey, string>>;
export type StateTranslations = Partial<Record<StateTranslationKey, string>>;

export interface CityItem {
  id: number;
  pinCode: string;
  division: string | null;
  region: string | null;
  city: string;
  state: string;
  // Multilingual city names
  cityAs?: string | null;
  cityBn?: string | null;
  cityGu?: string | null;
  cityHi?: string | null;
  cityKn?: string | null;
  cityMl?: string | null;
  cityMr?: string | null;
  cityOr?: string | null;
  cityTa?: string | null;
  cityTe?: string | null;
  // Multilingual state names
  stateAs?: string | null;
  stateBn?: string | null;
  stateGu?: string | null;
  stateHi?: string | null;
  stateKn?: string | null;
  stateMl?: string | null;
  stateMr?: string | null;
  stateOr?: string | null;
  stateTa?: string | null;
  stateTe?: string | null;
}

export interface SaveCityPayload {
  pinCode: string;
  division?: string;
  region?: string;
  city: string;
  state: string;
  cityBn?: string;
  cityHi?: string;
  cityKn?: string;
  cityMl?: string;
  cityOr?: string;
  cityTa?: string;
  cityTe?: string;
  cityAs?: string;
  cityGu?: string;
  cityMr?: string;
  stateBn?: string;
  stateHi?: string;
  stateKn?: string;
  stateMl?: string;
  stateOr?: string;
  stateTa?: string;
  stateTe?: string;
  stateAs?: string;
  stateGu?: string;
  stateMr?: string;
}
