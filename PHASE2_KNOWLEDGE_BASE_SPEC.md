# Phase 2 - Knowledge Base System Specification

**Status**: Design Phase
**Target**: Implement after MVP launch
**Goal**: Enable Eva to learn from community (Waze model) while protecting user privacy

---

## 🎯 Executive Summary

Eva learns from thousands of users, becomes exponentially smarter. Users OPT-IN to share solutions (anonymized). 

**By 1000 users in 1 month:**
- Eva knows 200+ tested solutions
- 90% of new problems solved in seconds
- All user data remains 100% private

---

## 📊 Database Schema

### **Table 1: knowledge_solutions**
```sql
CREATE TABLE knowledge_solutions (
  id UUID PRIMARY KEY,
  category VARCHAR(50),          -- 'email_setup', 'automation', 'extraction', etc
  name VARCHAR(255),             -- 'gmail_oauth_setup', 'invoice_extraction_pdf'
  description TEXT,              -- What problem it solves
  solution TEXT,                 -- Steps, code snippets, templates
  difficulty VARCHAR(20),        -- 'beginner', 'intermediate', 'advanced'
  
  -- Effectiveness tracking
  success_rate DECIMAL(3,2),     -- 0.92 = 92%
  avg_time_minutes INT,          -- Average time to implement
  attempt_count INT DEFAULT 0,   -- How many users tried
  success_count INT DEFAULT 0,   -- How many succeeded
  
  -- Quality metrics
  quality_score DECIMAL(3,2),    -- Based on user feedback
  helpful_count INT DEFAULT 0,   -- Users marked as helpful
  issue_count INT DEFAULT 0,     -- Issues reported
  
  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by_community BOOLEAN DEFAULT true
);
```

### **Table 2: solution_usage**
```sql
CREATE TABLE solution_usage (
  id UUID PRIMARY KEY,
  user_id UUID,                  -- Who used it
  solution_id UUID,              -- Which solution
  
  -- Attempt tracking
  success BOOLEAN,               -- Did it work?
  time_taken_minutes INT,        -- How long?
  feedback TEXT,                 -- "Worked perfectly!" or "Had error X"
  feedback_helpful BOOLEAN,      -- Did feedback help us?
  
  -- Common issues
  errors_encountered TEXT[],     -- ["CORS error", "Auth failed"]
  resolution TEXT,               -- How they fixed it
  
  -- Metadata
  created_at TIMESTAMP,
  shared_to_community BOOLEAN DEFAULT false
);
```

### **Table 3: user_community_settings**
```sql
CREATE TABLE user_community_settings (
  user_id UUID PRIMARY KEY,
  
  -- Opt-in preference
  contribute_to_community BOOLEAN DEFAULT true,
  allow_pattern_sharing BOOLEAN DEFAULT true,
  allow_usage_tracking BOOLEAN DEFAULT true,
  
  -- Privacy controls
  opt_out_solution_ids UUID[],   -- User can exclude specific solutions
  privacy_level VARCHAR(20),      -- 'public', 'community', 'private'
  
  -- Consent & tracking
  consent_given_at TIMESTAMP,
  consent_version VARCHAR(10),    -- Track which version user accepted
  
  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### **Table 4: knowledge_access_log**
```sql
CREATE TABLE knowledge_access_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  solution_id UUID,
  
  -- What Eva did
  eva_referenced_solution BOOLEAN,     -- Eva mentioned this solution
  eva_recommended BOOLEAN,              -- Eva recommended it
  user_accepted BOOLEAN,                -- User followed recommendation
  user_rated DECIMAL(1,0),              -- 1-5 star rating
  
  created_at TIMESTAMP
);
```

---

## 🔌 API Endpoints

### **1. Contribute Solution**
```
POST /api/knowledge/contribute

Request:
{
  "category": "email_setup",
  "name": "gmail_oauth_setup",
  "description": "How to authenticate Gmail with OAuth",
  "solution": "Step 1: Go to... Step 2: ...",
  "difficulty": "intermediate",
  "share_to_community": true
}

Response:
{
  "success": true,
  "solution_id": "uuid",
  "message": "Solution saved + shared to community!"
}
```

### **2. Report Usage (Success/Failure)**
```
POST /api/knowledge/usage

Request:
{
  "solution_id": "uuid",
  "success": true,
  "time_taken_minutes": 15,
  "feedback": "Worked perfectly, only took 15 min",
  "errors_encountered": [],
  "share_feedback": true
}

Response:
{
  "success": true,
  "solution_effectiveness_now": 0.94,  -- Updated score
  "message": "Thanks for feedback! Helped 234 users"
}
```

### **3. Get Solutions by Category**
```
GET /api/knowledge/solutions?category=email_setup

Response:
{
  "solutions": [
    {
      "id": "uuid",
      "name": "gmail_oauth_setup",
      "description": "...",
      "success_rate": 0.92,
      "avg_time_minutes": 14,
      "attempt_count": 45,
      "quality_score": 4.7,
      "recommended": true,
      "why_recommended": "92% success rate, 14 min avg, 45 users tried"
    }
  ]
}
```

### **4. Get Personalized Solutions**
```
GET /api/knowledge/solve?problem="extract invoices from gmail"

Response:
{
  "matching_solutions": [
    {
      "id": "uuid",
      "name": "invoice_extraction_gmail",
      "match_confidence": 0.95,
      "success_rate": 0.88,
      "steps": "1. Install... 2. Configure... 3. Test...",
      "estimated_time": 20,
      "common_issues": ["CORS error (10% of users)", "Auth timeout (5%)"],
      "solutions_to_issues": ["Disable CORS... ", "Increase timeout..."]
    }
  ],
  "community_info": "234 users solved this already",
  "you_already_know": false
}
```

### **5. Community Settings**
```
GET /api/user/community-settings

Response:
{
  "contribute_to_community": true,
  "allow_pattern_sharing": true,
  "allow_usage_tracking": true,
  "privacy_level": "community",
  "contributions_count": 3,
  "community_impact": "Your solutions helped 127 users!"
}

PATCH /api/user/community-settings
{
  "contribute_to_community": false,
  "privacy_level": "private"
}
```

---

## 🤖 Eva Logic - Using Knowledge Base

### **When Eva responds:**

```
User: "How do I extract invoices from Gmail?"

Eva Logic:
1️⃣ Search Knowledge Base
   → Find "invoice_extraction_gmail" (88% success, 156 users)
   
2️⃣ Get user's privacy settings
   → Can Eva recommend community solutions? YES
   → Can Eva track this usage? YES
   
3️⃣ Format response
   "156 other users solved this already!
    Here's what worked for them (88% success rate):
    
    Step 1: Install...
    Step 2: Configure...
    
    ⚠️ Common issues:
    - CORS error (10% hit this)
      → Solution: Disable CORS in settings
    
    ⏱️ Should take ~20 minutes
    
    Let me know if this works for you!"

4️⃣ Log interaction
   → knowledge_access_log entry created
   → Wait for user feedback
   
5️⃣ Update effectiveness
   → User says "Perfect, worked in 18 min!"
   → solution_usage record created
   → success_rate updates: 0.88 → 0.89
   → avg_time updates: 20 → 19 min
```

### **When Eva learns from failure:**

```
User: "Didn't work, got CORS error"

Eva Logic:
1️⃣ Log the failure
   → solution_usage: success = false
   → errors_encountered: ["CORS error"]
   
2️⃣ Suggest alternative
   "Hmm, 10% of users get CORS errors here.
    Try this instead: [alternative solution]
    Or adjust settings: [config]"
    
3️⃣ Update metrics
   → success_count stays same
   → total_count increases
   → success_rate: 0.89 → 0.87
   → quality_score decreases slightly
   → Alerts team if success_rate < 70%
```

---

## 🔒 Privacy Guards - Anonymization Guaranteed

### **What Gets Shared:**
```
✅ SHARED (Anonymized):
  - Solution name & description
  - Success rate, avg time
  - "156 users tried this"
  - "10% encountered CORS error"
  - "Top solution: adjust timeout"

❌ NEVER SHARED:
  - User identity
  - User email/data
  - Specific user names in feedback
  - User's other solutions/data
  - Timestamps linking to specific users
  - Client names or business details
```

### **Anonymization Rules:**

```python
def anonymize_feedback(feedback: str) -> str:
    """Remove all PII from feedback"""
    
    # Remove names, emails, URLs
    feedback = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', feedback)
    feedback = re.sub(r'(john|jean|alice|bob)\b', '[USER]', feedback, flags=re.I)
    feedback = re.sub(r'https?://\S+', '[URL]', feedback)
    
    # Remove company names
    feedback = re.sub(r'(google|microsoft|amazon|acme|company)\b', '[COMPANY]', feedback, flags=re.I)
    
    return feedback

# Example:
INPUT:  "Jean from ACME used gmail_oauth, got CORS error"
OUTPUT: "[USER] from [COMPANY] used gmail_oauth, got CORS error"
```

### **Consent Tracking:**

```
User signup → Community settings question
→ "Do you want to help the community?"
→ YES → user_community_settings.contribute_to_community = true
→ Record consent version + timestamp
→ User can change anytime

GDPR Compliance:
- User can request all their shared data → DELETE
- User can opt-out retroactively
- User can see impact: "Your solutions helped 234 users"
```

---

## 🎨 Frontend - Opt-In Toggle

### **At Signup (Step 2):**

```html
<div class="community-choice">
  <h2>🤝 Help Eva Get Smarter?</h2>
  
  <div class="choice">
    <input type="radio" id="community" name="kb" value="yes" checked>
    <label for="community">
      <strong>✨ Eva Super Intelligente</strong>
      <p>Eva learns from 1000s of users</p>
      <p>→ 90% faster solutions for you</p>
      <p style="color: green;">✓ Your data stays private</p>
      <small>Only anonymized solutions are shared</small>
    </label>
  </div>
  
  <div class="choice">
    <input type="radio" id="private" name="kb" value="no">
    <label for="private">
      <strong>🔒 Eva Personnelle</strong>
      <p>Eva learns only from you</p>
      <p>→ Gets better slowly, just for you</p>
      <small>Maximum privacy, slower growth</small>
    </label>
  </div>
</div>
```

### **In Settings Page:**

```html
<section class="community-settings">
  <h3>Community Participation</h3>
  
  <div class="setting">
    <label>
      <input type="checkbox" id="share-solutions" checked>
      Share my solutions (anonymized)
    </label>
    <small>Help others with your discoveries</small>
  </div>
  
  <div class="setting">
    <label>
      <input type="checkbox" id="track-usage" checked>
      Track my usage (for effectiveness scoring)
    </label>
    <small>Help us improve recommendations</small>
  </div>
  
  <div class="stats">
    <p>🎉 Your impact: <strong>127 users</strong> used your solutions!</p>
    <p>📊 You've contributed <strong>3 solutions</strong></p>
    <a href="/community-profile">View Your Profile</a>
  </div>
</section>
```

---

## 🛠️ Implementation Phases

### **Phase 2A - Foundation (Week 1-2):**
- [ ] Create 4 new database tables
- [ ] Create migrations
- [ ] Implement POST /api/knowledge/contribute
- [ ] Implement POST /api/knowledge/usage
- [ ] Add anonymization logic

### **Phase 2B - Discovery (Week 2-3):**
- [ ] GET /api/knowledge/solutions endpoint
- [ ] GET /api/knowledge/solve endpoint (search + personalize)
- [ ] Add solution recommendations to Eva responses
- [ ] Update Eva logic to reference Knowledge Base

### **Phase 2C - Privacy & Frontend (Week 3-4):**
- [ ] Community settings UI (signup + settings)
- [ ] Consent tracking & GDPR compliance
- [ ] Dashboard showing user impact
- [ ] Admin dashboard for Knowledge Base stats

### **Phase 2D - Polish (Week 4+):**
- [ ] Testing with real users
- [ ] Performance optimization
- [ ] Monitoring & alerting
- [ ] Community features (voting, comments)

---

## 📊 Success Metrics

```
By 1000 users in 1 month:

✅ Knowledge Base:
   - 200+ solutions discovered
   - 88% average success rate
   - 15 min average implementation time
   
✅ User Engagement:
   - 70% users opted in to community
   - 150+ contributions per month
   - 4.5/5 average solution quality
   
✅ Eva Effectiveness:
   - 90% of questions answered via KB
   - 3x faster response time
   - User satisfaction: 4.7/5
   
✅ Privacy:
   - 0 data breaches
   - 100% anonymization compliance
   - 0 GDPR violations
```

---

## 🚀 Go-to-Market

### **Launch Message:**

```
"Eva just learned from 1000 users.

156 people already solved 'invoice extraction'.
234 people figured out Gmail automation.
89 people know the best email filtering tricks.

Eva now knows ALL of it.

The best part?
Your data stays yours. Always.

Try asking: 'How do I extract invoices?'"
```

---

## 📝 Notes for Implementation

1. **Backward Compatible**: Existing users unaffected
2. **Gradual Rollout**: Can enable for % of users first
3. **Monitoring**: Need alerts for:
   - Success rate drops below 70%
   - Spam/abuse detection
   - Privacy violations
4. **Community Moderation**: Need approval for sensitive solutions
5. **Rate Limiting**: Prevent solution spam

---

**Status**: Ready to implement
**Priority**: High (game-changer for product)
**Complexity**: Medium
**Estimated Dev Time**: 2-3 weeks for full implementation
