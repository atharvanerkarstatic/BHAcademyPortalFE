export interface TrainingMasterLanguageItem {
  id?: number;
  languageCode: string;
  trainingTitle?: string;
  trainingDescription?: string;
  traingDescription?: string;
  venueDetails?: string;
  status?: "ACTIVE" | "INACTIVE" | string;
  tags?: string;
}

export interface TrainingMasterTopic {
  id: number;
  topic: string;
  languages?: {
    languageCode: string;
    topic: string;
  }[];
}

export interface TrainingMasterItem {
  id: number;
  trainingDate: string;
  geoLocation?: string;
  imageUrl?: string;
  googleMapsLink?: string;
  pincodeId?: number;
  pincode?: string;
  city?: string;
  state?: string;
  region?: string;
  division?: string;
  topicId?: number;
  topicName?: string;
  topic?: TrainingMasterTopic;
  languages?: TrainingMasterLanguageItem[];
  createdDate?: string;
  updatedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TrainingMasterPageResponse {
  content: TrainingMasterItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CreateTrainingMasterPayload {
  trainingDate: string;
  geoLocation?: string;
  imageUrl?: string;
  googleMapsLink?: string;
  pincode: string;
  topicId?: number;
  languages: TrainingMasterLanguageItem[];
}

export interface UpdateTrainingMasterPayload {
  trainingDate: string;
  geoLocation?: string;
  imageUrl?: string;
  googleMapsLink?: string;
  pincode: string;
  topicId?: number;
  languages: TrainingMasterLanguageItem[];
}
