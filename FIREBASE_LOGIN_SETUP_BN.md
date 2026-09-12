# RIZVI IMPMS — Firebase Login Setup

এই build-এ `rfims-s.web.app`-এর login এখন Firebase Authentication ব্যবহার করে।

## Firebase Console-এ একবার যা করতে হবে

1. Firebase project: `gen-lang-client-0506048076`
2. **Authentication → Sign-in method → Email/Password → Enable**
3. **Authentication → Users** থেকে প্রয়োজনীয় user account তৈরি করুন অথবা app-এর `Sign up` ব্যবহার করুন।
4. Admin account-এর জন্য server-side/custom-claim `role=admin` অথবা Firestore `users/{uid}`-এ `role: admin` সেট করতে হবে। Client-side sign-up নিজে থেকে admin তৈরি করতে পারে না।
5. Firestore Database চালু করুন এবং এই ZIP-এর `firestore.rules` deploy করুন।

## Deploy

Project root থেকে:

```bash
firebase login
firebase use gen-lang-client-0506048076
firebase deploy --only hosting,firestore
```

Firebase Hosting-এ root `index.html` deploy হবে। `/api` Node backend-এর জন্য আলাদা server প্রয়োজন; Firebase Login-এর জন্য `/api` আর প্রয়োজন নেই।

## Login

User/Admin mode-এ নিবন্ধিত Firebase Email + Password ব্যবহার করুন।

## গুরুত্বপূর্ণ

Firebase Web API key গোপন password নয়। কিন্তু Firestore Security Rules এবং Authentication configuration অবশ্যই ঠিক রাখতে হবে।
