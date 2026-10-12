// app/page.tsx
'use client';

import { useState } from 'react';
import { 
  Upload, FileText, AlertTriangle, CheckCircle, Clock, 
  ShieldCheck, Globe, Activity, Pill, Download, Sparkles 
} from 'lucide-react';

export type MedicalRecordExtraction = {
  recordType: string;
  selectedLanguage: string;
  summaryPlainEnglish: string;
  summaryRegional: string;
  recordDate: string;
  diagnoses: string[];
  observations: Array<{
    testName: string;
    value: string | number;
    unit: string;
    referenceRange: string;
    isAbnormal: boolean;
    interpretation: string;
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  medicalDisclaimer: string;
};

const SAMPLE_CBC_REPORT: MedicalRecordExtraction = {
  recordType: 'CBC Report',
  selectedLanguage: 'Hindi',
  summaryPlainEnglish:
    'Your blood count is mostly stable. Haemoglobin is mildly low, which may suggest mild anaemia, while the platelet count is slightly elevated but not concerning. Continue hydration, balanced nutrition, and follow up if symptoms such as fatigue or dizziness continue.',
  summaryRegional:
    'आपका ब्लड काउंट ज्यादातर स्थिर है। हेमोग्लोबिन थोड़ा कम है, जो हल्के एनीमिया का संकेत दे सकता है, जबकि प्लेटलेट काउंट थोड़ा बढ़ा हुआ है लेकिन चिंताजनक नहीं है। पर्याप्त पानी पिएं, संतुलित आहार लें और अगर थकान या चक्कर जैसे लक्षण बने रहें तो डॉक्टर से परामर्श करें।',
  recordDate: '2025-03-14',
  diagnoses: ['Mild anaemia', 'Slightly elevated platelet count'],
  observations: [
    {
      testName: 'Haemoglobin',
      value: 11.2,
      unit: 'g/dL',
      referenceRange: '12.0-15.5 g/dL',
      isAbnormal: true,
      interpretation: 'Low'
    },
    {
      testName: 'White Blood Cell Count',
      value: 8.4,
      unit: '10^3/µL',
      referenceRange: '4.0-11.0 10^3/µL',
      isAbnormal: false,
      interpretation: 'Normal'
    },
    {
      testName: 'Platelets',
      value: 435,
      unit: '10^3/µL',
      referenceRange: '150-450 10^3/µL',
      isAbnormal: true,
      interpretation: 'Slightly high'
    }
  ],
  medications: [
    {
      name: 'Ferrous Sulfate',
      dosage: '325 mg',
      frequency: 'Once daily',
      duration: '30 days'
    }
  ],
  medicalDisclaimer:
    'This summary is for informational purposes only and is not a substitute for professional medical evaluation or treatment.'
};

export type AbdmFhirBundle = Record<string, unknown>;

export default function Home() {
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [targetLang, setTargetLang] = useState('Hindi');
  const [abhaId] = useState('91-8842-1923-5510');
  const [loading, setLoading] = useState(false);

  const [activeRecord, setActiveRecord] = useState<MedicalRecordExtraction | null>(null);
  const [fhirData, setFhirData] = useState<AbdmFhirBundle | null>(null);
  const [timeline, setTimeline] = useState<MedicalRecordExtraction[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => setFileBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!fileBase64) return;
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: fileBase64, mimeType, targetLanguage: targetLang, abhaId })
      });
      const data = await res.json();
      if (data.success) {
        setActiveRecord(data.extraction);
        setFhirData(data.fhirBundle);
        setTimeline(prev => [data.extraction, ...prev]);
      }
    } catch {
      alert('Error analyzing document. Verify API key configuration.');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    setActiveRecord(SAMPLE_CBC_REPORT);
    setTimeline(prev => [SAMPLE_CBC_REPORT, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-indigo-600" />
          <h1 className="text-lg font-bold tracking-tight">AI Health Copilot</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadDemoData}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Load Sample Report
          </button>
          <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-medium border border-indigo-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> ABHA ID: {abhaId}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" /> Ingest Medical Record
            </h2>
            
            <input 
              type="file" 
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />

            {fileBase64 && (
              <div className="mt-3">
                <img src={fileBase64} alt="Medical scan" className="max-h-40 rounded-lg border object-cover w-full" />
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1 mb-1.5">
                <Globe className="w-3.5 h-3.5" /> Language
              </label>
              <select 
                value={targetLang} 
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
              >
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
              </select>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!fileBase64 || loading}
              className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
            >
              {loading ? 'Analyzing Record...' : 'Extract & Summarize'}
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" /> Health Timeline
            </h2>
            {timeline.length === 0 ? (
              <p className="text-xs text-slate-400">No records stored yet.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((entry, idx) => (
                  <div key={idx} className="border-l-2 border-indigo-500 pl-3 py-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{entry.recordDate}</span>
                    <p className="text-sm font-medium text-slate-800">{entry.recordType}</p>
                    <p className="text-xs text-slate-500 truncate">{entry.diagnoses.join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-8 space-y-6">
          {!activeRecord ? (
            <div className="h-80 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p className="text-sm">Upload a file or click "Load Sample Report" to view insights</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-slate-900">Plain-Language Summary</h3>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium border border-indigo-200">
                    {activeRecord.recordType}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">{activeRecord.summaryPlainEnglish}</p>
                
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg">
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-1">{activeRecord.selectedLanguage} Summary</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{activeRecord.summaryRegional}</p>
                </div>
              </div>

              {activeRecord.observations.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" /> Lab Test Insights
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-slate-400 text-xs uppercase">
                          <th className="pb-2">Biomarker</th>
                          <th className="pb-2">Value</th>
                          <th className="pb-2">Normal Range</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeRecord.observations.map((obs, i) => (
                          <tr key={i}>
                            <td className="py-2.5 font-medium">{obs.testName}</td>
                            <td className="py-2.5">{obs.value} {obs.unit}</td>
                            <td className="py-2.5 text-slate-500">{obs.referenceRange}</td>
                            <td className="py-2.5">
                              {obs.isAbnormal ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3" /> {obs.interpretation}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3" /> Normal
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeRecord.medications.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-indigo-600" /> Prescribed Medicines
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeRecord.medications.map((med, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="font-semibold text-sm text-slate-900">{med.name}</p>
                        <p className="text-xs text-slate-600">Dosage: {med.dosage}</p>
                        <p className="text-xs text-indigo-600 font-medium mt-0.5">{med.frequency} • {med.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fhirData && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> ABDM FHIR R4 Bundle
                    </h3>
                    <button 
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(fhirData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `ABDM-Bundle-${Date.now()}.json`;
                        a.click();
                      }}
                      className="text-xs flex items-center gap-1 border border-slate-200 px-2 py-1 rounded hover:bg-slate-50"
                    >
                      <Download className="w-3 h-3" /> Export JSON
                    </button>
                  </div>
                  <pre className="text-xs bg-slate-900 text-emerald-400 p-3 rounded-lg overflow-x-auto max-h-40 font-mono">
                    {JSON.stringify(fhirData, null, 2)}
                  </pre>
                </div>
              )}

              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <strong>Medical Disclaimer:</strong> {activeRecord.medicalDisclaimer}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}