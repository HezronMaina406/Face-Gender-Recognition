
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedFace {
  // Fix: Corrected typo 'BoundingoundingBox' to 'BoundingBox'.
  box: BoundingBox;
  name: string;
  gender?: string;
  confidence: number;
}

export interface KnownPerson {
  id: string;
  name: string;
  image: string; // base64 data URL
}

export interface RecognitionOptions {
  recognizeGender: boolean;
  countPeople: boolean;
}
