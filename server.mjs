// server.mjs
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 4000;

// Allow your Vite frontend (5173) to call this API
app.use(cors({
  origin: 'http://localhost:5173',
}));

// --- Multer setup for file uploads ---
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// helper to delete temp files
const cleanupFiles = (files) => {
  files.forEach((f) => {
    if (f?.path && fs.existsSync(f.path)) {
      fs.unlinkSync(f.path);
    }
  });
};

// Very basic “fake OCR” – just checks file size & extension.
// Later you can integrate real OCR (Tesseract / external API) here.
function analyzeDocument(file, type) {
  const ext = path.extname(file.originalname).toLowerCase();
  const sizeKB = file.size / 1024;

  const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];

  if (!allowedExt.includes(ext)) {
    return {
      ok: false,
      note: `Unsupported file type (${ext}). Please upload PDF or image.`,
      scoreImpact: -20,
    };
  }

  if (sizeKB < 30) {
    return {
      ok: false,
      note: 'File looks too small, may be corrupted or incomplete.',
      scoreImpact: -15,
    };
  }

  // Simple per-type messages
  if (type === 'passport') {
    return {
      ok: true,
      note: 'Passport file looks valid (size & type OK).',
      scoreImpact: +15,
    };
  }
  if (type === 'bank') {
    return {
      ok: true,
      note: 'Bank statement file looks valid. For demo we assume balance & history OK.',
      scoreImpact: +20,
    };
  }
  if (type === 'offer') {
    return {
      ok: true,
      note: 'Offer letter file looks valid. In production we would verify institution & dates.',
      scoreImpact: +15,
    };
  }

  return {
    ok: true,
    note: 'Document uploaded successfully.',
    scoreImpact: +5,
  };
}

// Simple scoring from profile + docs
function computeScore(profile, docResults) {
  let base = 50;

  // documents
  docResults.forEach((d) => {
    base += d.scoreImpact;
  });

  // funds
  const funds = parseInt(profile.funds || '0', 10);
  if (funds > 150000) base += 10;
  else if (funds < 50000) base -= 10;

  // education
  if (profile.education === 'Masters' || profile.education === 'PhD') base += 5;

  // past visa
  if (profile.past_visa === '3+') base += 5;
  if (profile.past_visa === 'None') base -= 5;

  // clamp 0–100
  base = Math.max(0, Math.min(100, base));

  let plain = 'Unlikely';
  if (base >= 75) plain = 'Highly likely';
  else if (base >= 60) plain = 'Likely';
  else if (base >= 45) plain = 'Borderline';

  const reasons = [];
  if (funds > 150000) reasons.push('Strong financial capacity');
  else if (funds < 50000) reasons.push('Low declared funds – risk on finances');
  else reasons.push('Funds appear moderate for stay');

  if (profile.education === 'Masters' || profile.education === 'PhD')
    reasons.push('Advanced education supports purpose');

  if (profile.past_visa === '3+')
    reasons.push('Good travel history – positive signal');
  if (profile.past_visa === 'None')
    reasons.push('No prior visa history – neutral or slightly risky');

  if (docResults.some(d => !d.ok))
    reasons.push('One or more documents look weak or invalid');

  return { score: base, plain, reasons };
}

// --- API: analyze profile + documents ---
app.post(
  '/api/analyze',
  upload.fields([
    { name: 'passport', maxCount: 1 },
    { name: 'bank', maxCount: 1 },
    { name: 'offer', maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const profile = JSON.parse(req.body.profile || '{}');

      const passport = req.files.passport?.[0];
      const bank = req.files.bank?.[0];
      const offer = req.files.offer?.[0];

      // collect all files for cleanup later
      const allFiles = [passport, bank, offer].filter(Boolean);

      // basic required doc checks
      if (!passport || !bank || !offer) {
        cleanupFiles(allFiles);
        return res.status(400).json({
          error: 'Missing required documents. Please upload passport, bank statement, and offer letter.',
        });
      }

      const docs = [];

      const passportRes = analyzeDocument(passport, 'passport');
      docs.push({ name: 'Passport', ok: passportRes.ok, note: passportRes.note, scoreImpact: passportRes.scoreImpact });

      const bankRes = analyzeDocument(bank, 'bank');
      docs.push({ name: 'Bank statement', ok: bankRes.ok, note: bankRes.note, scoreImpact: bankRes.scoreImpact });

      const offerRes = analyzeDocument(offer, 'offer');
      docs.push({ name: 'Offer letter', ok: offerRes.ok, note: offerRes.note, scoreImpact: offerRes.scoreImpact });

      const scoreInfo = computeScore(profile, docs);

      // simple “twin”
      const twin = {
        name: profile.name || 'Applicant',
        confidence: 80,
        traits: [
          profile.past_visa === 'None' ? 'Low travel history' : 'Experienced traveller',
          scoreInfo.score >= 70 ? 'Low risk profile' : 'Medium risk profile',
        ],
      };

      // dummy multi-country comparison using base score shifts
      const base = scoreInfo.score;
      const countries = [
        { name: 'Canada', score: Math.min(100, base + 3), flag: '🇨🇦', reason: 'Study funds okay; program alignment good.' },
        { name: 'UK', score: Math.max(0, base - 8), flag: '🇬🇧', reason: 'Needs stronger financial and document history.' },
        { name: 'Australia', score: Math.min(100, base + 5), flag: '🇦🇺', reason: 'Profile matches skill/education demand.' },
      ];

      const risk = [
        { label: 'Finances', value: fundsRisk(scoreInfo.score) },
        { label: 'Docs', value: docsRisk(docs) },
        { label: 'Travel History', value: profile.past_visa === 'None' ? 60 : 25 },
        { label: 'Purpose', value: profile.purpose === 'Study' || profile.purpose === 'Work' ? 20 : 40 },
      ];

      cleanupFiles(allFiles);

      return res.json({
        score: scoreInfo.score,
        plain: scoreInfo.plain,
        reasons: scoreInfo.reasons,
        docs: docs.map(({ scoreImpact, ...rest }) => rest),
        twin,
        countries,
        risk,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal error analyzing profile' });
    }
  }
);

// simple helpers for risk bars
function fundsRisk(score) {
  if (score >= 80) return 20;
  if (score >= 60) return 35;
  return 60;
}

function docsRisk(docs) {
  const bad = docs.filter(d => !d.ok).length;
  if (bad === 0) return 25;
  if (bad === 1) return 50;
  return 70;
}

app.listen(PORT, () => {
  console.log(`Visa Genius backend running on http://localhost:${PORT}`);
});
