// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

type MedicalRecordExtraction = {
  recordType?: 'Prescription' | 'DiagnosticReport' | 'DischargeSummary';
  recordDate?: string;
  doctorOrLabName?: string;
  diagnoses: string[];
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
  }>;
  observations: Array<{
    testName: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    isAbnormal: boolean;
    interpretation?: string;
  }>;
  summaryPlainEnglish: string;
  summaryRegional: string;
  lifestyleAdvice?: string[];
  medicalDisclaimer: string;
  selectedLanguage?: string;
};

type AbdmFhirBundle = {
  resourceType: 'Bundle';
  type: string;
  timestamp: string;
  identifier: { system: string; value: string };
  entry: Array<{ fullUrl?: string; resource: Record<string, any> }>;
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const healthSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    recordType: { type: Type.STRING, enum: ['Prescription', 'DiagnosticReport', 'DischargeSummary'] },
    recordDate: { type: Type.STRING },
    doctorOrLabName: { type: Type.STRING },
    diagnoses: { type: Type.ARRAY, items: { type: Type.STRING } },
    medications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dosage: { type: Type.STRING },
          frequency: { type: Type.STRING },
          duration: { type: Type.STRING }
        },
        required: ['name']
      }
    },
    observations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          testName: { type: Type.STRING },
          value: { type: Type.STRING },
          unit: { type: Type.STRING },
          referenceRange: { type: Type.STRING },
          isAbnormal: { type: Type.BOOLEAN },
          interpretation: { type: Type.STRING }
        },
        required: ['testName', 'value', 'isAbnormal']
      }
    },
    summaryPlainEnglish: { type: Type.STRING },
    summaryRegional: { type: Type.STRING },
    lifestyleAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
    medicalDisclaimer: { type: Type.STRING }
  },
  required: ['recordType', 'diagnoses', 'medications', 'observations', 'summaryPlainEnglish', 'summaryRegional', 'medicalDisclaimer']
};

type ObservationEntry = {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  interpretation?: string;
};

type MedicationEntry = {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
};

function generateFhirBundle(record: MedicalRecordExtraction, abhaId: string): AbdmFhirBundle {
  const patientRef = `urn:uuid:patient-${crypto.randomUUID()}`;

  const patientResource = {
    resourceType: 'Patient',
    identifier: [{ system: 'https://healthid.ndhm.gov.in', value: abhaId }],
    active: true
  };

  const observations = record.observations.map((obs: ObservationEntry) => ({
    resourceType: 'Observation',
    status: 'final',
    code: { text: obs.testName },
    subject: { reference: patientRef },
    valueQuantity: { value: obs.value, unit: obs.unit },
    referenceRange: [{ text: obs.referenceRange }],
    interpretation: [{ text: obs.interpretation }]
  }));

  const medications = record.medications.map((med: MedicationEntry) => ({
    resourceType: 'MedicationRequest',
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: { text: med.name },
    subject: { reference: patientRef },
    dosageInstruction: [{ text: `${med.dosage} - ${med.frequency} for ${med.duration}` }]
  }));

  return {
    resourceType: 'Bundle',
    type: 'document',
    timestamp: new Date().toISOString(),
    identifier: { system: 'https://nrces.in/ndhm/fhir/r4', value: `urn:uuid:${crypto.randomUUID()}` },
    entry: [
      { fullUrl: patientRef, resource: patientResource },
      ...observations.map((o: typeof observations[number]) => ({ fullUrl: `urn:uuid:${crypto.randomUUID()}`, resource: o })),
      ...medications.map((m: typeof medications[number]) => ({ fullUrl: `urn:uuid:${crypto.randomUUID()}`, resource: m }))
    ]
  };
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, targetLanguage = 'Hindi', abhaId = '91-8842-1923-5510' } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing document image' }, { status: 400 });
    }

    const prompt = `You are a clinical AI Copilot. Read this medical document (prescription, diagnostic report, discharge summary):
1. Extract all diagnoses, medicines (dosage, frequency, duration), and test measurements.
2. Accurately decipher handwritten doctors' prescriptions.
3. Compare test values to standard clinical ranges and flag abnormal values.
4. Provide a patient summary in simple, jargon-free English.
5. Provide the same summary translated into natural colloquial ${targetLanguage}.
6. Provide non-misleading clinical disclaimers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64,
                mimeType: mimeType || 'image/jpeg'
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: healthSchema
      }
    });

    const parsed: MedicalRecordExtraction = JSON.parse(response.text || '{}');
    parsed.selectedLanguage = targetLanguage;

    const fhirBundle = generateFhirBundle(parsed, abhaId);

    return NextResponse.json({ success: true, extraction: parsed, fhirBundle });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}