# ISO রেফারেন্স নোট — সাধারণ তথ্য (কোম্পানি-নির্দিষ্ট না)

এই ফাইলটা কোনো অফিসিয়াল ISO clause-by-clause checklist না। এটা শুধু
সাধারণভাবে পরিচিত, পাবলিকলি উপলব্ধ standard-গুলোর নাম, যেগুলো একটা
garment/RMG factory-তে সচরাচর প্রযোজ্য হয় — যাতে আপনার প্রকৃত ISO/QMS
টিম সঠিক দিক থেকে কাজ শুরু করতে পারে। নির্দিষ্ট clause বা checklist
আইটেম আমি বানাইনি, কারণ সেটা বানিয়ে দিলে ভুয়া/ভুল কমপ্লায়েন্স কনটেন্ট
হয়ে যেতে পারে, যা প্রকৃত অডিটে বিপজ্জনক।

## সাধারণত প্রাসঙ্গিক Standard-সমূহ

- **ISO 9001** (Quality Management System) — Production, QA/QC, Planning,
  Procurement, Document Control সংক্রান্ত department/section-এ প্রযোজ্য
- **ISO 14001** (Environmental Management) — Environmental, Waste,
  Chemical, Energy/Utility Management-এ প্রযোজ্য
- **ISO 45001** (Occupational Health & Safety) — HSE, Fire Safety,
  Medical, PPE সংক্রান্ত section-এ প্রযোজ্য
- **ISO 27001** (Information Security) — IT & Information Security
  Management-এ প্রযোজ্য
- **SA8000 / WRAP / BSCI / Higg Index** — এগুলো ISO না, কিন্তু গার্মেন্টস
  ইন্ডাস্ট্রিতে buyer compliance audit-এ সাধারণত ব্যবহৃত হয় (Social
  Compliance, Labour Law section-এর জন্য প্রাসঙ্গিক)

## কেন নির্দিষ্ট clause number/checklist আইটেম দিইনি

- প্রতিটা factory-র প্রকৃত processes আলাদা — একটা সঠিক checklist লিখতে
  আপনার factory-র বাস্তব operation জানা দরকার, যেটা আমার কাছে নেই
- ভুল/অসম্পূর্ণ ISO checklist বানিয়ে দিলে সেটা "অডিট-রেডি" মনে হতে পারে
  অথচ বাস্তবে ভুল হতে পারে — এটা প্রকৃত external audit-এ সমস্যা তৈরি
  করতে পারে
- এই কাজটা করার সঠিক উপায়: একজন লাইসেন্সড ISO consultant/lead auditor
  দিয়ে `scale/CHECKLIST_TEMPLATE_811.csv`-এর ৬টা খালি কলাম (Daily →
  Annual) পূরণ করানো

## এই ফাইল কীভাবে ব্যবহার করবেন

`scale/CHECKLIST_TEMPLATE_811.csv` — ৯১ Department + ১৫৬ Section + ৫৬৪
Designation = ৮১১টা সারি, প্রতিটাতে ৬টা evaluation period-এর কলাম খালি।
এই CSV পূরণ করার পর `backend/routes/checklist.js`-এর
`POST /api/checklist/items` endpoint দিয়ে (অথবা একটা bulk-import script
লিখে) database-এ লোড করা যাবে — infrastructure (table, API,
scoring engine — `backend/lib/kpi.js`) ইতিমধ্যে প্রস্তুত ও কার্যকর।
