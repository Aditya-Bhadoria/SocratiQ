# 🧠 SocratiQ — The AI That Asks, Not Answers

## 📌 Overview
SocratiQ is a multimodal, web-based AI tutor designed to fix a major problem in AI-assisted learning: it gives students answers too easily.

Instead of acting like an answer key that bypasses critical thinking, SocratiQ uses a prompt-engineered Socratic method. It asks thoughtful questions step-by-step, validating student effort and guiding them toward their own "aha!" moment 💡.

---

## ❗ The Problem
Most generative AI tools optimize for being quickly helpful, meaning they provide direct answers immediately.

For students learning complex subjects like math, science, or programming, this creates an illusion of understanding while preventing real cognitive processing.

SocratiQ flips this model — transforming AI from an *answer machine* into a true learning companion 🎓.

---

## 🚀 Key Features

### 🧠 Socratic AI Engine
Powered by Gemini 2.5 Flash, the AI asks one guiding question at a time, validating student reasoning and prompting the next logical step.

---

### 🖼️ Multimodal Drag-and-Drop Vision
Students can simply drag screenshots of math problems, diagrams, or code into the chat.  
The AI reads the visual context and begins guiding the solution.

---

### 🚪 Escape Hatch Protocol
If a student explicitly says they are in a hurry or frustrated, SocratiQ detects this and switches from Socratic questioning to providing a clear direct answer.

---

### 📄 Offline PDF Study Guides
Students can export their entire Socratic conversation into a clean PDF study guide with one click.

---

### 📐 Rich Math & Code Rendering
Supports Markdown + LaTeX equations so mathematical expressions and code snippets render cleanly.

---

## 🛠 Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | Next.js (React), Tailwind CSS |
| Rendering | React Markdown, Rehype KaTeX |
| Backend | Next.js API Routes |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| Authentication | NextAuth.js (GitHub OAuth) |
| AI Engine | Google Gemini 2.5 Flash REST API |

---

## 💻 Getting Started (Run Locally)

### 1️⃣ Clone the repository

```bash
git clone https:github.com/aditya-bhadoria/SocratiQ.git
cd socratiq
npm install
```
---

### 2️⃣ Create environment variables

Create a .env file in the root directory.

DATABASE_URL="your_database_url"
DIRECT_URL="your_supabase_direct_url"

GOOGLE_GENERATION_AI_API_KEY="your_gemini_api_key"

GITHUB_ID="your_github_oauth_id"
GITHUB_SECRET="your_github_oauth_secret"

NEXTAUTH_SECRET="your_random_secret"
---

### 3️⃣ Sync Prisma database
```bash
npx prisma generate
npx prisma db push
```
---

### 4️⃣ Start the development server
```bash
npm run dev
```
---

### 5️⃣ Open the application

Visit:
```
http:localhost:3000
```
---

## ⭐ If you like this project
Consider starring ⭐ the repository and sharing it with others interested in AI-assisted education!
