// types/health.ts

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface LabObservation {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  interpretation: string;
}

export interface MedicalRecordExtraction {
  recordType: 'Prescription' | 'DiagnosticReport' | 'DischargeSummary';
  recordDate: string;
  doctorOrLabName?: string;
  diagnoses: string[];
  medications: Medication[];
  observations: LabObservation[];
  summaryPlainEnglish: string;
  summaryRegional: string;
  selectedLanguage: string;
  lifestyleAdvice: string[];
  medicalDisclaimer: string;
}

export interface AbdmFhirBundle {
  resourceType: 'Bundle';
  type: 'document';
  timestamp: string;
  identifier: { system: string; value: string };
  entry: Array<{
    fullUrl: string;
    resource: Record<string, any>;
  }>;
}