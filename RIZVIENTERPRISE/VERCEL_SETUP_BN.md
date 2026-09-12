# RIZVI FOMS — Vercel Setup Guide (বাংলা)

## জরুরি সত্য কথা প্রথমে

এই প্রজেক্টের **backend** (Express + better-sqlite3, `backend/` ফোল্ডার) Vercel-এর
Serverless Functions-এ সরাসরি চলবে না — কারণ better-sqlite3-এর জন্য একটা
persistent/writable ডিস্ক দরকার, যেটা Vercel serverless environment-এ থাকে না।

তাই সঠিক আর্কিটেকচার এমন:
- **Frontend (static)** → Vercel-এ ডিপ্লয় হবে (এই `vercel.json` + `.vercelignore` দিয়ে)
- **Backend (API)** → আগে থেকেই কনফিগার করা আছে Firebase Hosting + Google Cloud Run-এ
  (`firebase.json`, `infra/cloud-run/` দেখুন), অথবা Render/Railway-এর মতো একটা
  persistent Node hosting-এ

## ধাপে ধাপে Vercel সেটআপ

1. GitHub-এ পুরো প্রজেক্ট push করুন (backend সহ, `.vercelignore` অটোমেটিক backend বাদ দেবে)
2. vercel.com → "Add New Project" → আপনার GitHub রিপো Import করুন
3. Framework Preset: "Other" নির্বাচন করুন (কোনো build command লাগবে না)
4. Deploy চাপুন — এটা শুধু frontend (index.html + JS/CSS) সার্ভ করবে

## Backend-কে Vercel frontend-এর সাথে যুক্ত করা

Backend আলাদা কোথাও (Cloud Run / Render ইত্যাদি) রান করার পর:

1. সেই backend-এর `.env`-এ `CORS_ORIGIN` আপনার Vercel ডোমেইন যোগ করুন
   (যেমন: `CORS_ORIGIN=https://your-project.vercel.app`)
2. Vercel-এ deploy হওয়া অ্যাপ খুলুন → Settings পেজ → "Backend/API Connection" →
   সেখানে backend-এর পূর্ণ HTTPS URL বসান (যেমন `https://rizvi-foms-api-xxxx.a.run.app`)
3. এটা `localStorage`-এ সেভ হবে এবং app সেই backend-এর সাথে কথা বলা শুরু করবে

## কেন Firebase Hosting-এর মতো সরাসরি প্রক্সি রাখা হয়নি

`firebase.json`-এ `/api/**` রিকোয়েস্ট সরাসরি Cloud Run-এ rewrite হয় (same-origin)।
Vercel-এ সেই রকম rewrite করতে Cloud Run-এর প্রকৃত URL লাগবে, যেটা deploy করার
আগে জানা যায় না। তাই এখানে app-এর নিজস্ব Settings-ভিত্তিক API_BASE পদ্ধতি
ব্যবহার করা হয়েছে — এটা ইতিমধ্যে কোডে আছে (`api()` function, `index.html`)।
যদি চান, Cloud Run deploy করার পরে তার URL দিয়ে `vercel.json`-এ একটা
`rewrites` এন্ট্রি যোগ করে same-origin প্রক্সিও করা যাবে — শুধু বলুন, আমি করে দেব।
