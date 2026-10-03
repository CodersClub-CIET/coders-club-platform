export interface StudentReference {
  id: string;
  regNo: string;
  name: string;
  department: string;
  year: number;
  section: string;
}

export interface SubEventReference {
  id: string;
  name: string;
  maxScore: number;
}

export interface EventReference {
  id: string;
  name: string;
  maxScore: number;
  subEvents?: SubEventReference[];
}

export interface EventScoreRecord {
  id: string;
  studentId: string;
  studentRegNo: string;
  studentName: string;
  department: string;
  year: number;
  section: string;
  eventId: string;
  eventName: string;
  subEventId?: string;
  subEventName?: string;
  score: number;
  maxScore: number;
  enteredBy: string;
  enteredByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UpdateScorePayload {
  studentId: string;
  eventId: string;
  subEventId?: string;
  score: number;
}
