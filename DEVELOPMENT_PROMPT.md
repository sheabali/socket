# AI Career Assistant - Complete Development Prompt

You are an expert full-stack developer building "CareerAI" - an AI-powered resume analyzer SaaS. The system is designed using:
- **Frontend:** Next.js 14+ with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend:** Node.js + Express with TypeScript
- **Database:** MongoDB with Prisma ORM
- **AI:** groq API (Anthropic) for resume analysis and cover letter generation
- **Payment:** Stripe
- **Storage:** Supabase (for resume PDFs)
- **Auth:** JWT with refresh tokens

## Current Status
✓ Authentication system (JWT, password hashing with bcrypt) is complete and tested.
✓ Prisma schema with all models designed (User, Analysis, CoverLetter, etc.)
✓ UI mockups and design system finalized (Resume.io style, purple #6B5FD3 primary)

## Development Roadmap (10 Steps)

### STEP 1: PDF Upload & Parse (Days 1-2)
**Objective:** Users can upload resume PDFs and text is extracted + stored

**Tasks:**
1. Setup multer middleware for file handling
   - Accept only PDF files
   - Max file size: 10MB
   - Validate MIME type
   
2. Create POST /api/resume/upload endpoint
   - Authentication: JWT required
   - Input: FormData with file + optional jobTitle, targetCompany
   - Validate user has credits (free: 3/month, pro: unlimited)
   - Generate unique filename with user ID
   
3. Parse PDF to text
   - Use npm package: pdf-parse
   - Extract all text from PDF pages
   - Clean up whitespace and special characters
   
4. Upload to Supabase Storage
   - Create bucket: "resumes"
   - Store file with path: user-id/filename
   - Get public URL for future downloads
   
5. Save to MongoDB
   - Create Analysis record with Prisma
   - Fields: userId, resumeFileName, resumeUrl, resumeText, jobTitle, targetCompany, createdAt
   - Increment user.analysisCount
   - For free tier: decrement user.creditsRemaining by 1
   
6. Response: Return analysisId + resumeText for next steps

**Error Handling:**
- File validation errors → 400 Bad Request
- Storage errors → 500 Internal Server Error
- Rate limit exceeded → 429 Too Many Requests with message "Upgrade to Pro for unlimited"

**Testing:**
- Test with sample resume PDFs (different layouts)
- Test file size validation
- Test free tier limits

---

### STEP 2: groq API ATS Scoring (Days 1-2)
**Objective:** Generate ATS score, keyword analysis, and improvement suggestions using groq API

**Tasks:**
1. Create src/services/ai.service.ts
   - Initialize Anthropic client with API key from .env
   - Create function: analyzeResume(resumeText: string): Promise<AnalysisResult>
   
2. Design groq prompt for ATS analysis
```
You are an expert ATS (Applicant Tracking System) consultant. Analyze the following resume and provide:

1. ATS Score (0-100): How well will this resume pass through ATS systems?
2. Found Keywords: Technical skills, tools, frameworks mentioned in the resume
3. Missing Keywords: Common industry keywords NOT found (based on common tech roles)
4. Formatting Issues: Any structure that might confuse ATS parsers
5. Improvement Suggestions: 3-5 specific, actionable tips

Return ONLY valid JSON with structure:
{
  "atsScore": number,
  "formattingScore": number,
  "keywordScore": number,
  "foundKeywords": ["React", "TypeScript", ...],
  "missingKeywords": ["Docker", "Kubernetes", ...],
  "keywordFrequency": { "React": 5, "TypeScript": 3, ... },
  "suggestions": [
    { "title": "...", "description": "...", "priority": "HIGH|MEDIUM|LOW", "category": "KEYWORDS|FORMATTING|STRUCTURE|CONTENT|ATS_COMPATIBILITY" }
  ]
}
```

3. Call groq API
   - Model: groq-3-5-sonnet
   - Max tokens: 1000
   - Temperature: 0.7
   - Pass resumeText to prompt
   
4. Parse JSON response
   - Validate all required fields present
   - Ensure scores are 0-100
   - Handle groq parsing errors gracefully
   
5. Save Analysis record
   - Update existing Analysis with: atsScore, formattingScore, keywordScore, keywordFrequency, suggestions
   - Create KeywordAnalysis record with: foundKeywords, missingKeywords, keywordFrequency
   - Save Suggestion records (one per suggestion from groq)
   
6. Create POST /api/resume/analyze endpoint
   - Input: analysisId (from STEP 1)
   - Call ai.service.analyzeResume()
   - Return full Analysis object with keywords + suggestions

**Cost Optimization:**
- groq API free tier: $5 credit
- Each analysis: ~200-300 tokens
- First 100 free analyses on free tier credit
- After: charge users ($2 per report or $5/month Pro)

**Error Handling:**
- groq API errors → 500 with retry logic
- JSON parsing errors → Log error, return generic response
- Invalid analysis data → Return partial results with what succeeded

---

### STEP 3: Job Match Scoring (Day 1)
**Objective:** Compare resume against job description and calculate match percentage

**Tasks:**
1. Extend analyzeResume endpoint to accept optional jobDescription
   
2. Create job description parser
   - Extract keywords from JD text
   - Calculate keyword overlap with resume
   - Use groq to contextualize the match
   
3. Implement match scoring algorithm
```typescript
function calculateJobMatch(
  resumeKeywords: string[],
  jobDescriptionKeywords: string[]
): number {
  const intersection = resumeKeywords.filter(k => 
    jobDescriptionKeywords.some(jdk => 
      k.toLowerCase().includes(jdk.toLowerCase())
    )
  );
  return Math.round((intersection.length / jobDescriptionKeywords.length) * 100);
}
```

4. Use groq for qualitative match analysis
   - Ask groq to compare resume content against JD requirements
   - Generate match explanation + gap analysis
   
5. Save job match data
   - Update Analysis: jobDescription, jobMatchPercentage
   - Extend suggestions to include job-specific tips
   
6. Response: Return both ATS + job match scores

**Example Response:**
```json
{
  "id": "analysis-123",
  "atsScore": 87,
  "formattingScore": 92,
  "keywordScore": 82,
  "jobMatchPercentage": 78,
  "foundKeywords": [...],
  "missingKeywords": [...],
  "suggestions": [...]
}
```

---

### STEP 4: Frontend Results Display (Days 2-3)
**Objective:** Build React components to display analysis results beautifully

**Tasks:**
1. Create component: components/resume/ScoreCard.tsx
   - Props: score (number), label (string), color (hex)
   - Display large number + label + subtext
   - Example: "87 | ATS Score | Very good"
   
2. Create component: components/resume/ProgressBar.tsx
   - Props: value (0-100), color, label
   - Animated fill with smooth transition
   - Shows current score on right side
   
3. Create component: components/resume/KeywordTags.tsx
   - Props: foundKeywords (string[]), missingKeywords (string[])
   - Green tags for found, red tags for missing
   - Interactive: hover shows frequency or tooltip
   
4. Create component: components/resume/SuggestionsList.tsx
   - Props: suggestions (Suggestion[])
   - Yellow icon + title + description per suggestion
   - Organized by priority (HIGH first)
   - Max 5 suggestions shown
   
5. Create page: app/(dashboard)/analyzer/results/page.tsx
   - Fetch analysis from /api/resume/analyze using analysisId from URL params
   - Show loading state while fetching
   - Layout:
     * 3 score cards (ATS, Formatting, Keywords) in grid
     * 3 progress bars (ATS compat, Formatting, Keyword density)
     * Keywords section (found vs missing)
     * Suggestions section
     * Buttons: "Regenerate" + "Generate cover letter"
   
6. Create page: app/(dashboard)/analyzer/page.tsx (upload page - already in design)
   - Upload zone with dashed border
   - Form inputs: jobTitle, targetCompany, jobDescription
   - Button: "Analyze resume"
   - On submit: POST to /api/resume/upload, then POST to /api/resume/analyze
   - Navigate to /analyzer/results/[analysisId]
   
7. Add navigation
   - Create layout: app/(dashboard)/layout.tsx with sidebar
   - Sidebar items: Dashboard, Analyzer, History
   - Top header with export + upgrade buttons

**Styling Requirements:**
- Use Tailwind CSS + shadcn/ui components
- Colors: Purple (#6B5FD3) primary, Teal (#1D9E75) secondary, Amber (#EF9F27) accent
- Typography: Inter sans-serif, 14px body, 16px headings
- Cards: White bg, 0.5px light border, 8px border-radius
- Buttons: 10px padding, 6px radius, smooth hover transitions
- Responsive: Mobile first, sidebar collapses to hamburger on mobile

**State Management:**
- Use React hooks (useState, useEffect, useContext)
- Create custom hook: useAnalysis(analysisId) for fetching + caching
- Handle loading, error, and success states

---

### STEP 5: Cover Letter Generator (Days 1-2)
**Objective:** Generate AI-powered cover letters tailored to job + tone preferences

**Tasks:**
1. Create POST /api/cover-letter/generate endpoint
   - Input: analysisId, tone ("PROFESSIONAL"|"CONFIDENT"|"FRIENDLY"|"CREATIVE"), length ("SHORT"|"MEDIUM"|"LONG")
   - Auth: JWT required
   
2. Fetch Analysis record
   - Get: resumeText, jobTitle, targetCompany, jobDescription
   - Validate analysis belongs to user
   
3. Design groq prompt for cover letter
```
You are an expert recruiter writing cover letters. Generate a cover letter based on:
- Resume: [resumeText]
- Job Title: [jobTitle]
- Company: [targetCompany]
- Job Description: [jobDescription]
- Tone: [tone]
- Length: [length] (~150/250/400 words)

Write a compelling, personalized cover letter that:
1. Opens with a strong hook relevant to the company
2. Highlights 2-3 key accomplishments from the resume
3. Addresses specific requirements from the job description
4. Closes with a call to action

Do NOT include placeholders like [Your Name]. Write as if the candidate will personalize details after.
```

4. Call groq API
   - Model: groq-3-5-sonnet
   - Max tokens: 800
   - Temperature: 0.8 (more creative)
   
5. Validate response
   - Check length is within ±10% of target
   - Ensure it reads naturally (not robotic)
   
6. Save CoverLetter record
   - Fields: userId, analysisId, content, tone, length, generatedBy ("groq-3-5-sonnet"), createdAt
   
7. Response: Return cover letter content

8. Create frontend component: components/cover-letter/Generated.tsx
   - Props: content (string), tone, length
   - Display formatted letter with proper spacing
   - Buttons: "Regenerate" (with new tone/length), "Copy to clipboard"
   
9. Add tab to analyzer page
   - Upload → Results → Cover Letter (3 tabs)
   - Tab 3: Dropdowns for tone + length, generated letter, copy button

**Tone Guidelines (for prompt):**
- PROFESSIONAL: Formal, achievement-focused, corporate language
- CONFIDENT: Bold, assertive, emphasizes leadership and impact
- FRIENDLY: Conversational, warm, shows personality and culture fit
- CREATIVE: Unique, storytelling-based, stands out from templates

**Length Guidelines:**
- SHORT: ~150 words, concise and punchy
- MEDIUM: ~250 words, balanced and complete
- LONG: ~400 words, detailed with multiple examples

---

### STEP 6: Dashboard & History (Days 1-2)
**Objective:** Show users their analysis history, stats, and upgrade path

**Tasks:**
1. Create GET /api/dashboard/stats endpoint
   - Auth: JWT required
   - Return: totalAnalyses, bestAtsScore, totalCoverLetters, currentPlan, creditsRemaining
   - Query: COUNT analyses, MAX atsScore, COUNT cover letters from Prisma
   
2. Create GET /api/analyses/history endpoint
   - Auth: JWT required
   - Query params: limit (default 10), page (default 1)
   - Return: Array of Analysis records (ID, jobTitle, atsScore, createdAt)
   - Order by createdAt DESC (newest first)
   
3. Create page: app/(dashboard)/dashboard/page.tsx
   - Show upgrade banner for free tier (purple background)
     * Text: "You're on the free plan — X of 3 analyses used"
     * Button: "Upgrade to Pro — $5/mo"
   - Stats section: 3 cards (Total analyses, Best ATS, Cover letters)
   - History table:
     * Columns: Resume/Role | ATS Score | Date | Action
     * Score badges with colors (87+ green, 50-86 amber, <50 red)
     * "View" link navigates to /analyzer/results/[analysisId]
   - Bottom CTA: "New analysis" button
   
4. Create page: app/(dashboard)/history/page.tsx (optional separate page)
   - Full list of analyses (not just last 10)
   - Pagination support
   - Search/filter by jobTitle or company
   
5. Implement stats caching
   - Cache dashboard stats for 5 minutes
   - Invalidate on new analysis
   
6. Add "My analyses" section to sidebar
   - Show latest 3 analyses with quick links
   - Live badge: "2 analyses left" (for free tier)

---

### STEP 7: Rate Limiting (Free Tier Controls) (Day 1)
**Objective:** Enforce 3 analyses/month for free users, unlimited for Pro

**Tasks:**
1. Create src/middleware/rateLimit.middleware.ts
   - Check user.plan from JWT token
   - For FREE plan: count analyses created in current month
   - If count >= 3: return 429 Too Many Requests
   - For PRO plan: allow unlimited
   
2. Implement monthly reset logic
   - Check user.analysisLastResetAt
   - If date < 1st of current month: reset creditsRemaining to 3
   - Update timestamp to today
   
3. Apply middleware to /api/resume/upload
   - Runs before file upload and analysis
   - Returns error before wasting API calls
   
4. Frontend error handling
   - Show toast notification: "You've used all 3 free analyses this month"
   - Display upgrade banner prominently
   - "Upgrade now" button → /upgrade page with Stripe checkout
   
5. Add credits display
   - Dashboard badge: "2 analyses remaining" (for free users)
   - Update after each analysis in real-time
   
6. Database cleanup
   - Cron job (or manual script): Monthly reset of creditsRemaining for FREE users
   - Only reset if 1st day of month + hasn't been reset yet

**Example Middleware Response:**
```typescript
if (user.plan === "FREE" && monthlyAnalysisCount >= 3) {
  return res.status(429).json({
    error: "Free tier limit reached",
    message: "You've used all 3 free analyses this month. Upgrade to Pro for unlimited.",
    nextResetDate: "2024-06-01"
  });
}
```

---

### STEP 8: Stripe Payment Integration (Days 2-3)
**Objective:** Accept payments for Pro plan ($5/mo) and per-report ($2 one-time)

**Tasks:**
1. Setup Stripe account
   - Create test account at stripe.com
   - Get API keys: STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY
   - Add to .env files (backend + frontend)
   
2. Create POST /api/payment/checkout endpoint
   - Input: planType ("PRO" | "PAY_PER_REPORT")
   - Create Stripe checkout session
   - Line items:
     * PRO: $5 recurring monthly, product "CareerAI Pro Subscription"
     * PAY_PER_REPORT: $2 one-time, product "Single Analysis Report"
   - Success URL: /success?session_id={CHECKOUT_SESSION_ID}
   - Cancel URL: /analyzer
   - Save session ID to database (optional, for tracking)
   
3. Create POST /api/payment/webhook endpoint
   - Setup webhook in Stripe dashboard → Events → checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
   - Verify webhook signature with Stripe secret
   - On checkout.session.completed:
     * Get session details
     * If PRO: Create Subscription record, update user.plan = "PRO", set user.subscriptionExpiresAt, set user.creditsRemaining = 999
     * If PAY_PER_REPORT: Add one analysis credit, don't change plan
   - On customer.subscription.updated:
     * Update Subscription record with new expiration date
   - On customer.subscription.deleted:
     * Update Subscription.status = "CANCELLED"
     * Update user.plan = "FREE", set user.creditsRemaining = 3
   
4. Create frontend page: /upgrade
   - Display 2 pricing cards:
     * Pro: $5/month, unlimited, button → checkout
     * Per report: $2 one-time, button → checkout
   - Use Stripe React library to redirect to checkout
   
5. Create success page: /success
   - Get session_id from URL params
   - Verify payment succeeded
   - Show success message: "Payment processed! Your plan is now active."
   - Auto-redirect to dashboard after 3 seconds
   
6. Handle payment errors
   - Canceled checkout: Show message, allow retry
   - Failed payment: Show error message, suggest contacting support
   - Webhook failures: Log to error tracking (Sentry)
   
7. Add payment history tracking
   - Create Payment record for each transaction
   - Store in MongoDB: stripePaymentId, amount, status, email, paidAt
   - Create GET /api/payment/history (optional admin endpoint)

**Test Payments (Stripe Test Mode):**
- Card: 4242 4242 4242 4242, exp: any future date, CVC: any 3 digits
- Declined: 4000 0000 0000 0002

---

### STEP 9: Activity Logging & Analytics (Day 1)
**Objective:** Track user behavior for insights (total analyses, conversion rate, MRR)

**Tasks:**
1. Create src/services/analytics.service.ts
   - Function: logActivity(userId, action, metadata)
   - Creates ActivityLog record in MongoDB
   
2. Log key actions:
   - RESUME_UPLOADED: When file uploaded
   - RESUME_ANALYZED: When analysis completes
   - COVER_LETTER_GENERATED: When CL created
   - USER_UPGRADED: When converted to Pro
   - PAYMENT_PROCESSED: When payment succeeds
   - USER_SIGNUP: New user created
   
3. Call logActivity throughout codebase
   - After /api/resume/upload
   - After /api/resume/analyze
   - After /api/cover-letter/generate
   - After Stripe webhook processes payment
   
4. Create GET /api/analytics/dashboard (admin only)
   - Auth: Admin JWT required (separate role check)
   - Return dashboard data:
     * totalUsers: COUNT users
     * totalAnalyses: COUNT analyses
     * totalPaidUsers: COUNT users WHERE plan = "PRO"
     * conversionRate: totalPaidUsers / totalUsers × 100
     * monthlyRecurringRevenue: COUNT(active subscriptions) × 5
     * averageAtsScore: AVG(atsScore) from analyses
     * topActions: GROUP BY action, COUNT, ORDER BY count DESC
     * newUsersThisMonth: COUNT users created this month
   
5. Create GET /api/analytics/user/:userId (user's own analytics)
   - Return personal stats (non-sensitive)
   - totalAnalyses, bestScore, totalCoverLetters, currentPlan
   
6. Optional: Create simple admin dashboard page
   - /admin/analytics (protected route)
   - Display charts: Users over time, Analyses over time, Conversion funnel
   - Use recharts library

**Metrics to Track:**
- Signup rate (users/day)
- Analysis completion rate (analyses/user)
- Conversion rate (free → pro)
- Monthly recurring revenue (MRR)
- Average ATS score (quality metric)
- Churn rate (cancellations/month)

---

### STEP 10: Launch & Marketing (Days 1-2)
**Objective:** Deploy to production and acquire first 100 users

**Tasks:**
1. **Backend Deployment (Railway / Render)**
   - Create account at railway.app or render.com
   - Connect GitHub repo
   - Set environment variables:
     * DATABASE_URL (MongoDB Atlas)
     * groq_API_KEY
     * STRIPE_SECRET_KEY
     * JWT_SECRET
     * NODE_ENV=production
   - Deploy with automatic CI/CD
   - Test all endpoints in production
   
2. **Frontend Deployment (Vercel)**
   - Connect GitHub repo to vercel.com
   - Set environment variables:
     * NEXT_PUBLIC_API_URL (backend URL)
     * NEXT_PUBLIC_STRIPE_PUBLIC_KEY
   - Deploy with automatic CI/CD on push to main
   - Test all features in production
   
3. **Database Setup (MongoDB Atlas)**
   - Create free tier cluster at mongodb.com
   - Create database "carerai"
   - Add connection string to .env
   - Run `npx prisma db push` on production DB
   - Verify all collections created
   
4. **Social Media Promotion**
   - Post on Facebook job groups:
     * "Just launched CareerAI - AI resume analyzer. Get your ATS score instantly. Free analysis inside!"
     * Include landing page screenshot
     * Add link to website
     * Post in 3-5 major job groups (Bangladesh, Remote jobs, etc.)
   
   - LinkedIn posts:
     * "Excited to launch CareerAI today! 🚀"
     * "5 ways AI improves your resume ATS score"
     * Share screenshot of results page
     * Include call-to-action
   
   - Reddit posts:
     * r/jobs: "I built a free AI resume analyzer, here's the link"
     * r/slavelabour or r/forhire (if allowed)
     * r/resumes: "Free tool to check your resume ATS score"
   
   - Other channels:
     * Twitter/X: Share screenshots, ask for feedback
     * Product Hunt (optional): Upvote and comment to build visibility
     * Quora: Answer questions with link to tool
     * Email to friends/network: Personal referral
   
5. **Tracking First Users**
   - Add Google Analytics 4 to frontend
   - Setup Stripe webhook testing with real test cards
   - Monitor dashboard stats in real-time
   - Track:
     * Daily active users
     * Analyses per user
     * Conversion rate (free → pro)
     * User feedback (set up feedback form)
   
6. **Early User Feedback**
   - Create form: Contact or Feedback page
   - Ask: "What would make this tool better for you?"
   - Collect emails for updates
   - Note: First 100 users get free Pro access (optional, for growth)
   
7. **Post-Launch Improvements**
   - Monitor error logs
   - Fix bugs immediately
   - Optimize groq prompts based on user feedback
   - Add features users request (e.g., freelancer profile analyzer)
   
8. **Optional: Create Landing Page Variants**
   - Test different headlines: A/B test copy
   - Track which converts better
   - Double down on winner

---

## Key Implementation Notes

### groq API Integration
- Cost: Free tier = $5 credit (enough for ~100 analyses)
- Each analysis: 200-300 tokens input, 300-500 output = ~0.01 per request
- Switch to paid ($1 per 1M input tokens) after free tier exhausted
- Response format MUST be valid JSON (parse errors crash the system)
- Always wrap in try-catch

### Stripe Integration
- Test mode first: Use test API keys + test card 4242...
- Production later: Switch to live API keys
- Webhooks MUST verify signature: `stripe.webhooks.constructEvent()`
- Handle webhook failures: Retry logic, log failures to error tracking
- Subscription renewal is automatic (Stripe handles it)

### Frontend Best Practices
- Load states: Show skeleton loaders while fetching
- Error states: Toast notifications with helpful messages
- Empty states: Show helpful message when no analyses yet
- Animations: Use Framer Motion for smooth transitions (optional)
- Testing: Test file upload, analysis flow, payment flow manually first

### Database Best Practices
- Indexes: Add @index on frequently queried fields (userId, createdAt, status)
- Validation: Prisma validates data types, add custom validation in routes
- Transactions: Use prisma.$transaction() for atomic operations (e.g., charge + grant access)
- Cleanup: Implement monthly cron job to reset free tier credits

### Security Best Practices
- Validate all user inputs (file type, size, format)
- Hash passwords with bcrypt (already done in auth)
- Verify JWT on every protected route
- Don't expose sensitive data (API keys, emails) to frontend
- Rate limit API routes to prevent abuse
- Use HTTPS only in production
- CORS: Only allow requests from your frontend domain

### Performance Optimizations
- Cache groq responses? No - each resume is unique, caching not useful
- Cache dashboard stats: 5 minute TTL
- Optimize PDF parsing: Pre-process large files
- Lazy load UI components on frontend
- Pagination on history page (don't fetch 1000 records at once)

### Error Messages (User-Friendly)
- "File too large" → "Please upload a PDF under 10MB"
- "Invalid JWT" → "Session expired, please log in again"
- "Rate limit exceeded" → "You've used all 3 free analyses this month. Upgrade to Pro for unlimited."
- "groq API error" → "Analysis failed. Please try again in a few moments."

---

## Deployment Checklist

Before launching:
- [ ] All endpoints tested with Postman/cURL
- [ ] Frontend components tested in browser
- [ ] File upload tested with real PDFs
- [ ] groq prompts tested and refined
- [ ] Stripe test payments working
- [ ] MongoDB Atlas production DB created
- [ ] Environment variables set (backend + frontend)
- [ ] SSL certificate enabled (HTTPS)
- [ ] Error logging setup (Sentry or similar)
- [ ] Analytics setup (Google Analytics or custom)
- [ ] API rate limiting enabled
- [ ] Backup strategy in place (MongoDB backups)

---

## Quick Command Reference

```bash
# Backend setup
npm install
npx prisma db push          # Push schema to MongoDB
npm run dev                 # Start development server

# Frontend setup
npm install
npm run dev                 # Start Next.js dev server

# Testing
curl -X POST http://localhost:3001/api/resume/upload \
  -F "file=@resume.pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Deployment
git push origin main        # Triggers Vercel + Railway CI/CD
```

---

## Success Metrics (First 100 Days)

- [ ] 100+ signups
- [ ] 200+ analyses completed
- [ ] 5-10 Pro conversions
- [ ] 0.0001% error rate
- [ ] Average response time < 2 seconds
- [ ] 4.5+ star rating (from user feedback)
- [ ] 30+ Facebook group posts
- [ ] 10+ LinkedIn connections from tool link

---

This is your complete roadmap. Start with STEP 1 (PDF Upload). Each step builds on the previous.

Ask for code help anytime. Focus on shipping, not perfecting. MVPs are messy - that's the point.

Good luck! 🚀
