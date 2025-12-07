/*
Visa Genius X — App.jsx (Revamped UI)
Single-file React component (paste as src/App.jsx)
Dependencies:
  - react
  - framer-motion
  - react-circular-progressbar
  - chart.js
  - react-chartjs-2

Tailwind classes are used heavily (as requested). This file keeps the original app flow but revamps the UI with:
  - animated gradient background and subtle particle-like shimmer
  - modern glassmorphism cards with soft shadows
  - improved typography, spacing and responsive layout
  - drag-and-drop file uploader with previews
  - refined score gauge and cards
  - accessible buttons and micro-interactions via framer-motion

Drop this file in your React app (CRA or Vite). Install deps:
  npm i framer-motion react-circular-progressbar chart.js react-chartjs-2

Replace mock API calls with your backend endpoints when ready.
*/

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ------------------ Small helpers ------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// tiny utility to clamp values
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

// ------------------ Styles injected for subtle animations ------------------
// we use a small <style> injection to add keyframes that Tailwind doesn't provide here
const ExtraStyles = () => (
  <style>{`
    @keyframes floaty { 0% { transform: translateY(0px) } 50% { transform: translateY(-10px) } 100% { transform: translateY(0px) }
    }
    .bg-shimmer { background: radial-gradient(1200px 400px at 10% 10%, rgba(72,187,120,0.06), transparent 10%), radial-gradient(900px 300px at 90% 90%, rgba(124,58,237,0.04), transparent 12%); }
    .glass { background: rgba(6,10,21,0.55); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.04); }
    .soft-glow { box-shadow: 0 8px 30px rgba(6,8,20,0.6); }
    .pulse { animation: floaty 6s ease-in-out infinite; }
  `}</style>
);

// ------------------ Presentational pieces ------------------
function Topbar({ onStart }) {
  return (
    <div className="w-full flex items-center justify-between py-4 px-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-indigo-600 flex items-center justify-center text-black font-extrabold shadow">VG</div>
        <div>
          <div className="text-white text-lg font-bold">Visa Genius X</div>
          <div className="text-teal-200 text-xs">AI Digital Twin • Decision Simulator</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onStart} className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-teal-400 text-black font-semibold shadow hover:scale-[1.02] transition">Get Started</button>
      </div>
    </div>
  );
}

function Hero({ onStart }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto py-12 px-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">Meet your AI Visa Digital Twin</h1>
          <p className="text-teal-200 max-w-xl">Simulate visa officer decisions, scan documents for authenticity, practice interviews, and follow a tailored approval plan — all inside a single intelligent workspace.</p>
          <div className="flex gap-3">
            <button onClick={onStart} className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-400 to-indigo-600 text-black font-semibold shadow">Start Analysis</button>
            <button className="px-6 py-3 rounded-xl border border-teal-600 text-teal-200">See Demo</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SmallStat label="Avg approval boost" value="+18%" />
            <SmallStat label="Avg speedup" value="3x" />
          </div>
        </div>

        <div className="relative">
          <div className="glass rounded-2xl p-6 soft-glow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-teal-200">Live simulation</div>
                <div className="text-lg font-semibold text-white">Digital Twin + Document AI</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-teal-200">Confidence</div>
                <div className="font-semibold text-white">82%</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="h-44 bg-gradient-to-br from-[#05223a] to-[#071a2b] rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-white font-semibold">Interactive Preview</div>
                  <div className="text-xs text-teal-200">Upload your docs to see a live score</div>
                </div>
              </div>
            </div>
          </div>

          <motion.div initial={{ x: 140, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="absolute -right-8 -bottom-8 p-4 glass rounded-2xl w-40">
            <div className="text-sm text-teal-200">Quick compare</div>
            <div className="mt-2 font-semibold text-white">Canada • UK • Australia</div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function SmallStat({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-[#031426]/50 border border-[#123] flex items-center justify-between">
      <div className="text-sm text-teal-200">{label}</div>
      <div className="font-bold text-white">{value}</div>
    </div>
  );
}

function ProfileForm({ profile, setProfile, onNext }) {
  const update = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  return (
    <div className="max-w-4xl mx-auto p-6 glass rounded-2xl">
      <h2 className="text-2xl font-semibold text-white mb-4">Tell us about yourself</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput label="Full name" value={profile.name} onChange={(v) => update('name', v)} />
        <LabeledInput label="Age" value={profile.age} onChange={(v) => update('age', v)} />
        <LabeledSelect label="Passport Country" value={profile.passport_country} onChange={(v) => update('passport_country', v)} options={["India", "Pakistan", "Nepal", "Bangladesh", "Other"]} />
        <LabeledSelect label="Destination Country" value={profile.dest_country} onChange={(v) => update('dest_country', v)} options={["Canada", "United Kingdom", "Australia", "United States", "Germany"]} />
        <LabeledSelect label="Purpose" value={profile.purpose} onChange={(v) => update('purpose', v)} options={["Study", "Work", "Tourism", "Family", "Other"]} />
        <LabeledInput label="Monthly funds (INR)" value={profile.funds} onChange={(v) => update('funds', v)} />
        <LabeledSelect label="Education" value={profile.education} onChange={(v) => update('education', v)} options={["High School", "Bachelors", "Masters", "PhD", "Other"]} />
        <LabeledSelect label="Past visa history" value={profile.past_visa} onChange={(v) => update('past_visa', v)} options={["None", "1-2", "3+"]} />
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={onNext} className="px-6 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-teal-400 text-black font-semibold">Next: Upload Documents</button>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }) {
  return (
    <div>
      <div className="text-sm text-teal-200 mb-1">{label}</div>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full p-3 rounded-lg bg-[#031426]/30 border border-[#123] text-white" />
    </div>
  );
}

function LabeledSelect({ label, value, onChange, options }) {
  return (
    <div>
      <div className="text-sm text-teal-200 mb-1">{label}</div>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full p-3 rounded-lg bg-[#031426]/30 border border-[#123] text-white">
        <option value="">Select</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FileUploader({ files, setFiles }) {
  const inputRef = useRef(null);
  const onFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((f) => [...f, ...newFiles]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    const newFiles = Array.from(dt.files || []);
    setFiles((f) => [...f, ...newFiles]);
  };

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="p-4 glass rounded-xl border border-[#13334f]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-teal-200 mb-2">Upload documents (passport, bank statement, offer letter)</div>
          <div className="text-xs text-teal-200">Drag & drop files here — or</div>
        </div>
        <div>
          <button onClick={() => inputRef.current?.click()} className="px-3 py-2 rounded-md bg-indigo-600 font-semibold">Select files</button>
          <input ref={inputRef} type="file" className="hidden" multiple onChange={onFileChange} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {files.length === 0 && <div className="p-6 rounded-lg bg-[#031426]/20 text-sm text-teal-200">No files yet — drop them here</div>}
        {files.map((f, i) => (
          <div key={i} className="p-3 rounded-lg flex items-center gap-3 bg-[#031426]/40 border border-[#123]">
            <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center text-sm">{f.name.split('.').pop()?.toUpperCase()}</div>
            <div className="flex-1">
              <div className="font-medium text-white text-sm">{f.name}</div>
              <div className="text-xs text-teal-200">{(f.size / 1024).toFixed(1)} KB</div>
            </div>
            <div className="text-xs text-teal-200">Ready</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyzeLoading() {
  return (
    <div className="max-w-4xl mx-auto p-8 glass rounded-2xl text-center">
      <div className="text-2xl font-semibold text-white mb-4">Analyzing your profile...</div>
      <div className="text-sm text-teal-200 mb-6">Running document authenticity, visa simulation and risk scoring</div>
      <div className="w-64 mx-auto">
        <div className="h-2 bg-[#042236] rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-teal-400 to-indigo-600" style={{ width: '68%' }} />
        </div>
        <div className="text-xs text-teal-200">Estimated time: 20–40s</div>
      </div>
    </div>
  );
}

function ScoreGauge({ value }) {
  const color = value > 75 ? '#16a34a' : value > 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="w-44 h-44 md:w-56 md:h-56">
      <CircularProgressbar value={clamp(value)} text={`${value}%`} styles={buildStyles({ textColor: '#e6f0ff', pathColor: color, trailColor: 'rgba(11,32,48,0.6)', textSize: '16px' })} />
    </div>
  );
}

function CountryCard({ c }) {
  return (
    <div className="p-4 min-w-[220px] rounded-xl glass border border-[#13334f]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center">{c.flag || '🏳️'}</div>
        <div>
          <div className="font-semibold text-white">{c.name}</div>
          <div className="text-sm text-teal-200">Score: {c.score}%</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-teal-200">{c.reason}</div>
    </div>
  );
}

function RiskBar({ data }) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: 'Risk level',
        data: data.map((d) => d.value),
        borderRadius: 6,
        barThickness: 18,
      },
    ],
  };
  return (
    <div className="p-4 rounded-xl glass border border-[#13334f]">
      <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />
    </div>
  );
}

function DigitalTwinCard({ twin }) {
  return (
    <div className="p-4 rounded-2xl glass border border-[#13334f]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-teal-200">Digital Twin</div>
          <div className="font-semibold text-lg text-white">{twin.name || 'Applicant'}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-teal-200">Confidence</div>
          <div className="font-semibold text-white">{twin.confidence}%</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-teal-200">Traits: {twin.traits?.join(' • ')}</div>
    </div>
  );
}

function ResultsDashboard({ result, onInterview }) {
  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="col-span-2 glass p-6 rounded-2xl border border-[#13334f]">
        <div className="flex items-center gap-6">
          <ScoreGauge value={result.score} />
          <div className="flex-1">
            <div className="text-sm text-teal-200">Visa Success Probability</div>
            <div className="text-2xl font-semibold text-white">{result.plain}</div>
            <div className="mt-3 text-sm text-teal-200">Key reasons:</div>
            <ul className="list-disc ml-6 mt-2 text-sm text-white">
              {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <div className="mt-4 flex gap-3">
              <button onClick={onInterview} className="px-4 py-2 rounded-md bg-indigo-600 font-semibold">Practice Interview</button>
              <button className="px-4 py-2 rounded-md border border-teal-600 text-teal-200">Download Report</button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white">Document Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {result.docs.map((d, i) => (
              <div key={i} className={`p-3 rounded-md ${d.ok ? 'bg-[#052b15]/30' : 'bg-[#3b0f0f]/30'}`}>
                <div className="font-semibold text-white">{d.name}</div>
                <div className="text-sm text-teal-200 mt-1">Status: {d.ok ? 'Good' : 'Issue'}</div>
                <div className="text-xs mt-2 text-teal-200">{d.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <DigitalTwinCard twin={result.twin} />
        <div className="mt-4">
          <h4 className="text-sm text-teal-200">Multi-country Comparison</h4>
          <div className="flex gap-3 overflow-x-auto mt-3 py-2">
            {result.countries.map((c, i) => <CountryCard key={i} c={c} />)}
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm text-teal-200">Risk Overview</h4>
          <RiskBar data={result.risk} />
        </div>
      </div>
    </div>
  );
}

function InterviewPractice({ onBack }) {
  const [history, setHistory] = useState([]);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const questions = [
    'Why do you want to study/work in this country?',
    'How will you fund your stay?',
    'What are your plans after finishing the program?'
  ];
  const ask = questions[history.length % questions.length];

  const submit = async () => {
    // Mock — replace with /api/interview endpoint for real feedback
    const mock = { score: Math.floor(Math.random() * 5) + 5, tips: ['Be concise', 'Give exact figures', 'Show ties to home country'], improved: answer + ' — Improved: I plan to ...' };
    setFeedback(mock);
    setHistory((h) => [...h, { q: ask, a: answer, fb: mock }]);
    setAnswer('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 glass rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Interview Simulation</h3>
        <button onClick={onBack} className="text-sm text-teal-200">Back</button>
      </div>

      <div className="mb-4">
        <div className="text-sm text-teal-200 mb-2">AI Officer:</div>
        <div className="p-4 rounded-lg bg-[#031426]/50 border border-[#123] text-white">{ask}</div>
      </div>

      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full p-3 rounded-md bg-[#031426]/30 text-white" rows={4} />
      <div className="mt-3 flex gap-3">
        <button onClick={submit} className="px-4 py-2 rounded-md bg-teal-500 text-black font-semibold">Submit Answer</button>
      </div>

      {feedback && (
        <div className="mt-6 p-4 rounded-lg glass border border-[#13334f]">
          <div className="font-semibold text-white">Feedback</div>
          <div className="text-sm text-teal-200 mt-2">Score: {feedback.score}/10</div>
          <div className="mt-2 text-sm text-white">Tips:</div>
          <ul className="list-disc ml-6 mt-2 text-sm text-teal-200">{feedback.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          <div className="mt-2 text-sm text-teal-200">Improved answer:</div>
          <div className="mt-1 p-3 bg-[#031426]/30 rounded text-white">{feedback.improved}</div>
        </div>
      )}

      <div className="mt-6">
        <h4 className="text-sm text-teal-200">History</h4>
        {history.map((h, i) => (
          <div key={i} className="mt-2 p-3 rounded bg-[#031426]/30 text-white">
            <div className="font-semibold">Q: {h.q}</div>
            <div className="text-sm mt-1">A: {h.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------ Main App ------------------
export default function App() {
  const [stage, setStage] = useState('landing');
  const [profile, setProfile] = useState({});
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // demo warmup: could fetch user defaults or previous session
  }, []);

  const start = () => setStage('profile');
  const toUpload = () => setStage('upload');

  const analyze = async () => {
    setStage('loading');

    try {
      const formData = new FormData();
      // append profile fields
      Object.keys(profile).forEach(key => formData.append(key, profile[key]));

      // append files
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setResult(data);
      setStage('results');
    } catch (error) {
      console.error(error);
      alert('Error analyzing documents. Please try again. Make sure the backend is running and API key is set.');
      setStage('upload');
    }
  };

  // background gradient style — keeps app visually striking
  const pageStyles = { minHeight: '100vh', background: 'linear-gradient(180deg,#031022 0%, #07112b 60%)' };

  return (
    <div style={pageStyles} className="bg-shimmer">
      <ExtraStyles />
      <div className="max-w-screen-xl mx-auto px-4">
        <Topbar onStart={start} />
        <Hero onStart={start} />

        <div className="px-4 py-8">
          {stage === 'landing' && (
            <div className="text-center text-teal-200">Start by clicking "Get Started" or fill the profile to try the demo.</div>
          )}

          {stage === 'profile' && <ProfileForm profile={profile} setProfile={setProfile} onNext={toUpload} />}

          {stage === 'upload' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <FileUploader files={files} setFiles={setFiles} />
              <div className="flex justify-end">
                <button onClick={analyze} className="px-6 py-3 rounded-xl bg-indigo-600 font-semibold">Analyze My Profile</button>
              </div>
            </div>
          )}

          {stage === 'loading' && <AnalyzeLoading />}

          {stage === 'results' && result && <ResultsDashboard result={result} onInterview={() => setStage('interview')} />}

          {stage === 'interview' && <InterviewPractice onBack={() => setStage('results')} />}
        </div>
      </div>
    </div>
  );
}
