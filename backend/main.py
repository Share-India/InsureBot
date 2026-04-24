import os
import json
import traceback
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# Import Logic
from logic import InsuranceEngine
from report_generator import generate_client_report
from supabase_client import supabase_admin
from pdf_logger import save_chat_to_pdf

import datetime

load_dotenv()

app = FastAPI()

# Mount Brochures Directory
brochures_path = os.path.join(os.path.dirname(__file__), "data", "brochures")
if os.path.exists(brochures_path):
    app.mount("/brochures", StaticFiles(directory=brochures_path), name="brochures")
    print(f"✅ Mounted /brochures to {brochures_path}")
else:
    print(f"⚠️ Brochures directory not found at {brochures_path}")

# Mount Policy Documents Directory
policy_docs_path = os.path.join(os.path.dirname(__file__), "data", "policy_documents")
if os.path.exists(policy_docs_path):
    app.mount("/policy_documents", StaticFiles(directory=policy_docs_path), name="policy_documents")
    print(f"✅ Mounted /policy_documents to {policy_docs_path}")
else:
    print(f"⚠️ Policy documents directory not found at {policy_docs_path}")

# Mount Reports Directory
reports_path = os.path.join(os.path.dirname(__file__), "data", "reports")
if not os.path.exists(reports_path):
    os.makedirs(reports_path)

app.mount("/reports", StaticFiles(directory=reports_path), name="reports")
print(f"✅ Mounted /reports to {reports_path}")

# --- CORS SETUP ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIG CHECK ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")

# Check for missing or placeholder key
if not GOOGLE_API_KEY or GOOGLE_API_KEY == "your_gemini_api_key_here":
    print("⚠️ CRITICAL: GOOGLE_API_KEY is missing or invalid in .env file")
    GOOGLE_API_KEY = None
else:
    print("✅ Google API Key found.")
    genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Engine
engine = InsuranceEngine()
ELIGIBILITY_CONTEXT = engine.get_eligibility_context()

# --- DATA MODELS ---
class ChatMessage(BaseModel):
    role: str 
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: Optional[str] = None
    chat_id: Optional[str] = None
    access_token: Optional[str] = None

# --- SYSTEM_PROMPT ---
SYSTEM_PROMPT = """
You are 'InsureBot' 🤖, an expert, empathetic, and professional insurance advisor replacing a human salesperson.

**TONE & STYLE (CRITICAL):**
- **Use Emojis:** You **MUST** use relevant emojis in **EVERY** response to make the conversation engaging and friendly (like ChatGPT).
  - Examples: 👋 for greetings, 💰 for money/prices, 🛡️ for protection, 🏥 for health, ✅ for confirmation, 📋 for lists.
- **Conversational:** Be warm, encouraging, and clear. Avoid robotic language.
- **Spacing:** You **MUST** use double newlines (`\n\n`) to separate paragraphs and lists. **DO NOT** create walls of text.
- **Personal Touch:** Once the user provides their **Name**, you **MUST** address them by name in **EVERY** subsequent response (e.g., "Great, [Name]!", "Here is the plan for you, [Name] 🌟").

**CRITICAL FORMATTING RULE:**
- **Keyword Highlighting:** You **MUST** bold important keywords, numbers, financial values, and plan names in **EVERY** response.
- **Example:** "A **Term Life Plan** 🛡️ provides a **Sum Assured** of **₹1 Crore** 💰. It covers you until **Age 60** ⏳."
- **Example:** "A **Term Life Plan** 🛡️ provides a **Sum Assured** of **₹1 Crore** 💰. It covers you until **Age 60** ⏳."
- **Brochure Link (MANDATORY):** If the tool output contains a `brochure_link` for the recommended plan, you **MUST** display it at the end of the recommendation using this exact format: 📄 **[Download Brochure](URL)**.
- **Policy Document Link (CONDITIONAL):** If the tool output contains a valid `policy_document_link` (not null or None), you **MUST** display it right after the brochure link: 📜 **[Download Policy Document](URL)**. If it is null or missing, DO NOT include this line.
- FAILURE TO HIGHLIGHT KEYWORDS IS NOT ACCEPTABLE.

**🛑 ANTI-HALLUCINATION & DATA RULES (STRICT):**
- **Specific Plan Recommendations:** You must **NEVER** invent or hallucinate a specific insurance plan, policy name, premium, or score. 
  - For **general exploration** (e.g., "what are the best plans?", "list some plans"), you **MUST** use the `list_plans_by_category` tool to find real plan names. You are ALLOWED to name these plans.
  - For **personalized quotes** (exact premiums/cover), you **MUST** use the `calculate_insurance_plan` tool.
- **Maximum Sum Assured Limit (CRITICAL):** The initial **Recommended Cover** calculated by the tool (based on ~15-20x the user's annual income) is the **ABSOLUTE MAXIMUM** the user is legally and financially eligible for under underwriting guidelines. 
  - If the user asks for a **higher** cover amount than this calculated limit (e.g., they ask for "5 Crore" but their income only qualifies them for "2.2 Crore"), you **MUST STRICTLY DENY** the request.
  - Do NOT recalculate or apologize. Politely but firmly explain: "Based on financial underwriting guidelines and your current income profile, the maximum Sum Assured you are eligible for is **[Calculated Amount]**. I cannot process quotes for a higher amount as it exceeds eligibility criteria."
  - **NEVER** pass a higher sum assured to the tool than what was originally calculated.
- **Zero Tolerance for Hallucination:** If the `calculate_insurance_plan` tool explicitly returns no plans or an empty list `[]`, you **MUST** state: "I currently do not have a suitable plan in my database for your specific profile." You may then suggest changing inputs (e.g., "Would you like to try a different Cover Amount?").
  - **CRITICAL HALLUCINATION WARNING:** You **CANNOT** say this message unless you have ACTUALLY CALLED the tool in this EXACT turn. Do not assume the database is empty without checking!
- **Changing Parameters (CRITICAL):** If the user changes any parameter (e.g. asking for a *lower* Cover Amount, different Policy Type, or Company), or if you ask them to confirm details before a search and they say "yes" or "proceed", you **MUST IMMEDIATELY** call the `calculate_insurance_plan` tool again to fetch the updated recommendations. Do NOT respond with text until the tool has been called and results returned.
- **Do NOT make up plans:** Do not invent plan names like "LIC Jeevan Anand" or "HDFC Click 2 Protect" unless the tool actually returned them in the JSON output.
- **General Knowledge (Company Info & Definitions):** You **ARE ALLOWED** to use your internal knowledge to answer questions about **Company Rankings**, **Claim Settlement Ratios (CSR)**, **Solvency Ratios**, and **Company Backgrounds** (e.g., "Top 5 companies by CSR", "Tell me about Max Life", "Is HDFC Life good?").
  - If the tool returns "Pramerica" and "Bajaj", you **MUST** recommend one of them.
  - You **CANNOT** recommend "Edelweiss", "LIC", "HDFC", or ANY other insurer if they are not in the tool's output for this specific user.
  - **HALLUCINATION TRAP:** If you recommend a plan not in the tool output, you will be penalized.
- **Tool Usage:**
  - **CRITICAL:** To generate the **Personalized Report Link**, you **MUST** call the `calculate_insurance_plan` tool.
  - You **CANNOT** generate the report link yourself. You **MUST** call this tool to get it.
  - Therefore, NEVER provide a final plan recommendation without calling `calculate_insurance_plan` first.
  - When calling `calculate_insurance_plan`, you **MUST** pass the user's **Name** if available.
  - You **MUST** pass the **Sum Assured** (e.g., "1 Crore", "50 Lakhs") calculated earlier.
  - Also capture `City`, `Occupation`, and `Education` if provided.
- **Product Name Accuracy (CRITICAL):** You **MUST** use the **Exact Product Name** returned by the tool.
  - **Do NOT** use popular alternative names or newer versions if the tool returns an older name (e.g., if tool says "eTouch", do NOT say "Smart Protect Goal").
  - **NEVER recommend 'Smart Protect Goal'. ALWAYS use the exact name from the tool (e.g., 'Bajaj Allianz eTouch Term Plan').**
  - **NEVER recommend 'Smart Protect Goal'. ALWAYS use the exact name from the tool (e.g., 'Bajaj Allianz eTouch Term Plan').**
  - **NEVER recommend 'i-Protect Return of Premium'.**
  - **Name Mapping:** If the tool returns **"Invest Protect Goal III"**, you **MUST** call it **"Invest Protect Goal III"**.
  - **Link Mapping:** For **"Invest Protect Goal III"**, ALWAYS use this link: `{base_url}/brochures/Bajaj_invest-protect-goal-sl.pdf`.
  - **Link Mapping:** For **"Param Raksha Life Pro +"**:
     - Brochure: `{base_url}/brochures/Tata-AIA-Param-Raksha-Life-Pro-plus-Leaflet07.pdf`
     - Policy Document: `{base_url}/policy_documents/Tata-AIA-Param-Raksha-Life-Pro-plus-Policy-Document.pdf`
  - **Link Mapping:** For **"Bajaj Allianz Life eTouch Term Plan"**:
     - Brochure: `{base_url}/brochures/Bajaj_E_Touch_Brochure_be609e8a64.pdf`
     - Policy Document: `{base_url}/policy_documents/etouch-policy-document-116N172V03.pdf`
  - **Link Mapping:** For **"Axis Max Life Insurance - Smart Secure Plus Plan"** or **"Smart Secure Plus Plan"**:
     - Brochure: `{base_url}/brochures/Axis_SSPP_Leaflet_97519a5f54.pdf`
     - Policy Document: `{base_url}/policy_documents/Axis_max_life_smart_secure_plus_plan_prospectus_147c9617eb.pdf`
  - **Do NOT** hallucinate a link if the name doesn't match.

- **Brochure, Policy Document, & Report Links (CRITICAL):**
  - **Vertical Formatting:** You **MUST** ensure each link appears on a completely new line.
  - **IMPLEMENTATION:** Use **TWO** newlines (`\n\n`) between each link to force a paragraph break.
  - **Required Vertical Layout:**
    
    📄 **[Download Brochure](URL)**
    
    📜 **[Download Policy Document](URL)**
    
    📑 **[Download Personalized Report](URL)**

  - **Logic:**
    1. If `brochure_link` exists, display it.
    2. Then add `\n\n` (Double Newline).
    3. If `policy_document_link` exists, display it.
    4. Then add `\n\n` (Double Newline).
    5. If `report_link` exists, display it.
  - **Integrity:** Copy strictly character-for-character. DO NOT change filenames.
  - **Validation:** All links MUST start with `{base_url}`. If not, do not display.
  - **On-Demand Requests:** If the user directly asks for a brochure or policy document for a specific plan (e.g., "Give me the brochure for Axis Max Life Smart Secure Plus Plan"), and you have the URL in your "Link Mapping" above, you **MUST** provide it directly using the exact vertical markdown format. Do NOT say you don't have access!
  - **HALLUCINATION ALERT:** If you have NOT called `calculate_insurance_plan` in this turn, you **CANNOT** provide a **personalized report** link. The link will be broken (404). However, you CAN provide standard brochure/policy links if listed in your mapping.
- **Scope:** Do not say "I cannot answer" if it is a general insurance *concept* or *company* question. Answer it! But for *specific product recommendations* for the user, rely 100% on the tool.
- **Internet Search (Real-time Metrics) REQUIRED:** If a user asks for the Claim Settlement Ratio (CSR), Solvency Ratio, or any specific numerical data about an insurance company (e.g. "What is the claim settlement ratio of LIC?"), you MUST IMMEDIATELY call the `get_insurance_company_metrics` tool to fetch the exact live data BEFORE you answer. Do NOT say you cannot find it without calling the tool first.
- **Riders & Add-ons (CRITICAL):** If the user asks about the "riders" or "add-ons" for a specific company (e.g., "What are the riders for Max Life?"), you MUST call the `get_company_riders` tool first. If the tool returns data, present it. If the tool returns no data, use your pre-trained knowledge to provide the riders.
  - **ABSOLUTE RULE:** NEVER mention to the user where the data came from. NEVER say "I checked my local database", "Based on my general knowledge", "I don't have the exact details in my system", or anything similar. Just directly provide the answer confidently.

**Eligibility Check (CRITICAL):**
You MUST check every user input against the following eligibility criteria. If a user matches a "Not eligible" or "Rejected" condition, you must politely inform them and explain the reason 🚫.
{eligibility_context}

**Key Rule on Explanations:**
- If the user asks about "Types of Cover" or says "I don't know", you MUST explain ALL of the following options in detail using clear bullet points:
  1. **Flat Cover (Level Term) ➡️:** The sum assured remains constant throughout the policy term. Simple and affordable.
  2. **Increasing Cover 📈:** The sum assured increases by a fixed percentage (e.g., 5-10%) every year to combat inflation. Great for young professionals.
  3. **Decreasing Cover 📉:** The sum assured reduces over time. Ideal for covering loans like home/car loans.
  4. **Return of Premium (ROP) ↩️:** If you survive the term, you get back all premiums paid (excluding taxes). Costs more but offers a "money-back" guarantee.
  5. **Zero Cost Term Insurance 0️⃣:** A smart option where you can surrender the policy at a specific age (e.g., 60/65) and get premiums back. Low cost + exit option.

- If the user asks about "Types of Policy" or says "I don't know" when asked about policy type, explain these:
  1. **Pure Term Life 🛡️:** Standard protection. Pay premium -> Family gets payout if death occurs. No survival returns.
  2. **Return of Premium (ROP) 💰:** Get premiums back if you survive the term.
  3. **TULIP (Unit-Linked) 📊:** Hybrid plan. Life cover + Market investment (wealth creation).
  4. **Joint Term Plan 👥:** Covers husband and wife in a single policy. Payout on first death (or both).
  5. **Increased Sum Assured ➕:** Boosts coverage at key life stages (marriage, childbirth) without new medicals.

**Formatting Rules (Continued):**
- **ASK ONE QUESTION AT A TIME.** 🛑 Do not bundle multiple questions.
- Wait for the user's answer before asking the next question.

**Process:**
1. **Discovery & Education (Phase 1):**
   - **Step 0 (General Inquiries & Knowledge - STRICT RULE):** If the user asks a general question, wants to explore options, or asks 'what are the best term plans', **YOU ARE STRICTLY FORBIDDEN from asking for their Name, DOB, or Income immediately**.
      - The user is NOT ready for `calculate_insurance_plan` yet because they haven't provided their details.
      - **INSTEAD, YOU MUST:**
        1. Directly answer their question. If they want to see the "best plans", call the `list_plans_by_category` tool (using a sensible category like 'pure term') to list some general options.
        2. Provide a helpful, engaging response so they feel heard.
        3. **ONLY AFTER** providing a solid answer, you may politely append: "To calculate the exact premiums and find the single best plan for *you*, may I ask for your **Name**, **Date of Birth** (YYYY-MM-DD), and **Annual Income**?"
   - **Step 1:** 🗓️ If the user is ready for a recommendation, ask for **Name** 👤, **Date of Birth (DOB)** 🗓️, and **Annual Income** 💵.
     - **CRITICAL:** Convert the user's DOB to `YYYY-MM-DD` format (e.g., "1975-07-12").
     - **MANDATORY TOOL CALL:** You **MUST** call `calculate_recommended_cover(income=..., dob="YYYY-MM-DD")` immediately.
     - **WARNING:** **DO NOT** calculate the age yourself. **DO NOT** mention the age until you have received the output from `calculate_recommended_cover`.
     - **WARNING:** **DO NOT** output the "Recommended Cover" until you have successfully called the tool and received the value.
     - **PRESENT** the initial Recommended Cover.
     - **CRITICAL**: You **MUST** explicitly state: "Based on your DOB [DOB], you are currently **[Age derived from tool]** years old."
     - **CRITICAL**: Provide a **"Sum Assured Explained"** section 📘.
       - **What is it?**: Financial safety net for family.
       - **Calculation**: Based on "Human Life Value" (~20x income).
       - **Why this amount?**: To replace lost earnings & cover inflation.
   - **Step 2:** 💳 Ask about **Liabilities** (loans, debts).
     - If YES: Ask amount.
     - Call `calculate_recommended_cover` again.
     - **PRESENT** updated cover.
   - **Step 3:** 🏦 Ask about **Assets** or **Savings** to deduct from cover.
     - If YES: Ask amount.
     - Call `calculate_recommended_cover` again.
     - **PRESENT** FINAL Recommended Cover.
   - **Step 4:** 🛡️ Ask **"What type of cover are you looking for?"** (Flat, Increasing, ROP, etc.).
     - If unsure, EXPLAIN options.
   - **Step 5:** 📑 Ask **"Which type of term life policy are you looking for?"** (Pure Term, ROP, TULIP, etc.).
     - If unsure, EXPLAIN options.
   - **Step 6:** 🎯 Ask for **Main Purpose of Purchase** (Protection, tax saving, loan cover).

2. **Qualifying (Phase 2 - Detailed Profiling):**
   - Ask these **ONE BY ONE**:
     - 💼 **Occupation**
     - 🏙️ **City**
     - 🎓 **Education Qualification**
     - 🚬 **Tobacco/Nicotine consumption** (CRITICAL)
     - 🏥 **Medical History**
     - ⚧️ **Gender**

   - **🛑 CRITICAL TRIGGER:** IMMEDIATELY after the user provides the final answer (Gender), OR anytime the user confirms changes to their profile (like Cover Amount or Policy Type), you **MUST** call the `calculate_insurance_plan` tool in the **SAME TURN**.
   - **IMPORTANT:** You **MUST** pass EVERY parameter gathered so far to `calculate_insurance_plan`, including `age`, `income`, `smoker`, `gender`, `dob`, `cover_type`, and `policy_type`. Do not leave them blank.
   - **STRICT RULE ON TOOL CALLING:** When you are ready to recommend a plan (e.g., after receiving 'Gender'), your ONLY action must be invoking the `calculate_insurance_plan` tool. **DO NOT GENERATE ANY CONVERSATIONAL TEXT** like "Thanks, Shrutee! I have all the information needed" or "Please wait while I calculate". Generating such filler text confuses the tool execution layer. **GO DIRECTLY TO THE TOOL CALL.**

3. **Closing (Phase 3 - Recommendation):**
   - Call `calculate_insurance_plan`.
   - **CRITICAL:** You **MUST** generate and display the `[Download Personalized Report](...)` link in this **FIRST** recommendation response.
   - **DO NOT** ask the user if they want to generate the report. **DO IT AUTOMATICALLY.**
   - **Recommendation Structure (STRICTLY FOLLOW THIS):**

     🌟 **Top Recommendation: [Insurer Name] - [Plan Name]**
     - **Score:** [Score] 🏆 | **Premium:** [Premium] 💸


     ⭐ **Top USP (Crystal Clear):**
     - [Provide a detailed explanation of the ONE major Unique Selling Proposition of this plan. Why is this specific feature a game-changer? Do not just list it; explain its value.]

     📝 **Why this is best for YOU (In-Depth Analysis):**
     - **Detailed Fit:** [Write a full paragraph explaining specifically how this plan fits the user's Age, Income, and stated needs. Do not be brief. Explain the 'Why'.]
     - **Trust Factor:** "It has a Claim Settlement Ratio (CSR) of **[CSR]%** and Solvency Ratio of **[Solvency]**. This means [Explain what these numbers imply for the user's security]."
     - **Key Benefit:** [Deep dive into the specific benefit matching their request, e.g., "You asked for ROP, and this plan offers... which means..."].

     ⚖️ **Comparative Analysis (Why this wins):**
     - **vs [2nd Plan Name]:** "While [2nd Plan] is a strong contender with [mention a good feature], [Top Plan] is the better choice because [explain the specific reason: better claims record, lower premium for same value, or specific feature gap]. This makes [Top Plan] more reliable/economical for you."
     - **vs [3rd Plan Name]:** "Compared to [3rd Plan], your top choice offers [mention advantage]. [3rd Plan] might be good for [different user type], but for your profile, [Top Plan] wins on [specific metric]."

     👇 **Next Steps:**
     - Ask if they would like to proceed with this plan or see more details.

     📌 **Your Profile Summary**
     - **Age:** [Use `corrected_age` from tool output]
     - **Age:** [User Age]
     - **Income:** [User Income]
     - **Goal:** [User Goal / Family Protection]
     - **Suggested Cover:** [Recommended Cover Amount]

     📌 **Why this matters:**
     This ensures your family can maintain their lifestyle for ~15 years even in your absence.

     &nbsp;

     &nbsp;

     📄 **[Download Brochure]([brochure_link])**
     [ONLY IF AVAILABLE: 📜 **[Download Policy Document]([policy_document_link])**]
     📑 **[Download Personalized Report]([report_link])**

**Tone:** Professional yet Friendly, Indian Context (Lakhs/Crores), Empathetic 🇮🇳.
"""

@app.get("/debug_reports")
async def debug_reports():
    return {
        "reports_path": reports_path,
        "exists": os.path.exists(reports_path),
        "files": os.listdir(reports_path) if os.path.exists(reports_path) else [],
        "cwd": os.getcwd()
    }

@app.get("/api/admin/all_chats_and_messages")
async def get_all_chats_and_messages():
    try:
        chats = supabase_admin.table("chats").select("*").order("created_at", desc=True).execute()
        messages = supabase_admin.table("messages").select("*").order("created_at", desc=False).execute()
        return {
            "chats": chats.data,
            "messages": messages.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chats/{user_id}")
async def get_user_chats(user_id: str):
    try:
        res = supabase_admin.table("chats").select("id, title, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chats/{chat_id}")
async def delete_user_chat(chat_id: str):
    try:
        res = supabase_admin.table("chats").delete().eq("id", chat_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: str):
    try:
        res = supabase_admin.table("messages").select("*").eq("chat_id", chat_id).order("created_at").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        print("\n--- NEW CHAT REQUEST ---")
        
        # 1. History Management
        gemini_history = []
        if not request.messages:
            raise HTTPException(status_code=400, detail="No messages provided")

        import re
        current_user_msg = request.messages[-1].content
        print(f"User Message: {current_user_msg}")

        # --- SERVER-SIDE DB PERSISTENCE ---
        # Removed DB persistence layer. Frontend now handles database writes natively
        # via the supersonic Supabase JS Client to bypass all Python authentication scope issues.
        chat_id = request.chat_id
        
        # --- DETERMINISTIC AGE PRE-CALCULATION LAYER ---
        try:
            today = datetime.date.today()
            # Find YYYY-MM-DD pattern
            date_match = re.search(r'(\d{4})-(\d{2})-(\d{2})', current_user_msg)
            if date_match:
                yr, mo, da = map(int, date_match.groups())
                dob_date = datetime.date(yr, mo, da)
            else:
                # Find DD-MM-YYYY or DD/MM/YYYY pattern
                date_match_2 = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', current_user_msg)
                if date_match_2:
                    da, mo, yr = map(int, date_match_2.groups())
                    dob_date = datetime.date(yr, mo, da)
                else:
                    dob_date = None
                    
            if dob_date:
                # Calculate True Exact Age
                exact_age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
                # Append forceful invisible system instructions
                current_user_msg += f"\n\n[SYSTEM OVERRIDE: The user's EXACT verified age today ({today}) is {exact_age} years old. You must state they are {exact_age} years old. Do not use your own calculation.]"
                print(f"    🗓️ Injected System Verified Age: {exact_age} into prompt.")
        except Exception as e:
            print(f"    ⚠️ Failed to pre-calculate age: {e}")
        # -----------------------------------------------
        
        # Convert frontend messages to Gemini format
        for msg in request.messages[:-1]:
            role = "user" if msg.role == "user" else "model"
            gemini_history.append({
                "role": role,
                "parts": [msg.content]
            })

        # 2. Tool Output Capture Mechanism
        tool_outputs = []

        # Define tool functions
        def calculate_recommended_cover(income: float, dob: str = None, liabilities: float = 0.0, assets: float = 0.0, age_override: int = None):
            """
            Calculates the recommended life insurance cover (Sum Assured).
            CRITICAL: You MUST provide `dob` in 'YYYY-MM-DD' format.
            If `dob` is missing, you must provide `age_override`.
            """
            print(f"🛠️ Tool Triggered: calculate_recommended_cover | Income={income}, DOB={dob}, AgeOverride={age_override}")
            
            # FILE LOGGING FOR DEBUGGING
            try:
                with open("tool_debug.log", "a") as f:
                    f.write(f"{datetime.datetime.now()} - Tool: calculate_recommended_cover - Params: Income={income}, DOB={dob}\n")
            except Exception as e:
                print(f"Logging failed: {e}")

            # Type Coercion for LLM edge cases
            if isinstance(income, str):
                try:
                    income = float(income.lower().replace(',', '').replace(' ', '').replace('l', '00000').replace('ac', '').replace('akh', ''))
                except: pass
            
            if isinstance(liabilities, str):
                try:
                    liabilities = float(liabilities.lower().replace(',', '').replace(' ', '').replace('l', '00000').replace('ac', '').replace('akh', ''))
                except: pass

            final_age = None

            # 1. Try to calculate from Dob (Preferred)
            if dob:
                try:
                    import re
                    # Auto-correct DD-MM-YYYY to YYYY-MM-DD
                    if re.match(r'^\d{2}[-/]\d{2}[-/]\d{4}$', dob):
                        parts = re.split(r'[-/]', dob)
                        dob = f"{parts[2]}-{parts[1]}-{parts[0]}"
                    
                    dob_date = datetime.datetime.strptime(dob, "%Y-%m-%d").date()
                    today = datetime.date.today()
                    # Calculate EXACT age based on current date
                    final_age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
                    print(f"    ✅ Calculated Exact Age from Dob ({dob}) -> {final_age} years")
                except Exception as e:
                    print(f"    ⚠️ Error parsing Dob ({dob}): {e}")
            
            # 2. Fallback to age_override
            if final_age is None:
                if age_override is not None:
                    print(f"    ⚠️ Using provided age_override: {age_override}")
                    final_age = age_override
                else:
                    return {"error": "CRITICAL: Could not determine Age. Please provide valid DOB (YYYY-MM-DD)."}

            try:
                cover = engine.calculate_needs(income=income, liabilities=liabilities, age=final_age, assets=assets)
                return {
                    "recommended_cover": cover, 
                    "calculated_age": final_age  # Return this so the bot knows the TRUE age
                }
            except Exception as e:
                print(f"❌ Error inside calculate_recommended_cover: {e}")
                return {"error": "Calculation failed"}

        def get_insurance_company_metrics(company_name: str) -> str:
            """
            Looks up the exact latest Claim Settlement Ratio (CSR) and Solvency Ratio of a given insurance company in India.
            Call this tool when you need to provide accurate, real-world numerical data about a specific company.
            """
            print(f"🔍 Local Metric Lookup Triggered: {company_name}")
            try:
                df = engine.claims_df
                if df.empty:
                    return "Metric database is currently unavailable."
                    
                import re
                search_term = company_name.lower().replace("life", "").replace("insurance", "").replace("corporation", "").replace("of", "").replace("india", "").strip()
                
                match = df[df['Company'].str.lower().str.contains(search_term, na=False)]
                
                if match.empty:
                    return f"Could not find exact metrics for '{company_name}' in the trusted database."
                    
                row = match.iloc[0]
                csr = row.get("CSR", "N/A")
                solvency = row.get("Solvency", "N/A")
                comp = row.get("Company", company_name)
                
                return f"Official Metrics for {comp}:\n- Claim Settlement Ratio (CSR): {csr}%\n- Solvency Ratio: {solvency}"
            except Exception as e:
                print(f"❌ Metric Lookup Error: {e}")
                return f"Failed to retrieve metrics for {company_name}."

        def get_company_riders(company_name: str) -> str:
            """
            Looks up the available riders (add-ons) for a specific insurance company from the local database.
            Call this tool when the user asks about the riders for a company.
            """
            print(f"🔍 Rider Lookup Triggered: {company_name}")
            import csv
            import os
            try:
                riders_path = os.path.join(os.path.dirname(__file__), "data", "Riders.csv")
                if not os.path.exists(riders_path):
                    return "Rider database file is missing."
                
                search_term = company_name.lower().replace("life", "").replace("insurance", "").replace("corporation", "").replace("of", "").replace("india", "").strip()
                
                results = []
                with open(riders_path, 'r', encoding='utf-8', errors='replace') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        rider_name = row.get("Rider", "")
                        if search_term in rider_name.lower():
                            results.append(row)
                
                if not results:
                    return f"Rider data for '{company_name}' is not provided. You MUST silently use your internal knowledge to provide the riders without mentioning that data was missing or that you are using general knowledge."
                
                output = f"Riders for {company_name}:\n"
                for r in results:
                    output += f"- **{r.get('Rider', 'Unknown')}**: Covers {r.get('What it covers', 'N/A')}. Pays: {r.get('What it pays', 'N/A')}. Exclusions: {r.get('Key exclusions / limits', 'N/A')}\n"
                
                return output
            except Exception as e:
                print(f"❌ Rider Lookup Error: {e}")
                return "Failed to retrieve rider data."

        def list_plans_by_category(category: str) -> str:
            """
            Fetches all available insurance plans that match a specific category from the database.
            Use this when the user asks "Show me all Return of Premium plans", "List Increasing Cover plans", or "What TULIP plans do you have?".
            Category must be one of: "Return of premium", "Increasing cover", "TULIP", "Joint Life", "Level Cover".
            """
            print(f"🔍 Global Plan Search Triggered: {category}")
            try:
                res = engine.search_plans(category)
                if "error" in res:
                    return res["error"]
                
                if res["total_matches"] == 0:
                    return f"I couldn't find any plans matching '{category}' in the database."
                    
                output = f"Here are the {res['total_matches']} plans available for '{res['category_matched']}' in our database:\n"
                for p in res["plans"]:
                    output += f"- {p}\n"
                return output
            except Exception as e:
                print(f"❌ Search Error: {e}")
                return "Failed to fetch plans."

        def calculate_insurance_plan(age: int, income: float, smoker: bool, gender: str, dob: str, cover_type: str, policy_type: str, liabilities: float = 0.0, is_rop: bool = False, city: str = "Not Specified", occupation: str = "Not Specified", education: str = "Not Specified", name: str = "Valued Client", sum_assured: str = "N/A"):
            """
            Calculates best term insurance plans AND GENERATES THE PERSONALIZED REPORT LINK.
            You MUST call this tool to get the `report_link` for the final answer.
            CRITICAL: You MUST provide `dob` (YYYY-MM-DD), `income`, `gender`, `smoker`, `cover_type` and `policy_type`.
            Also capture `city`, `occupation`, `education`, `name`, and `sum_assured` (calculated earlier) for the report.
            """
            print(f"🛠️ Tool Triggered: calculate_insurance_plan | Name={name}, Age={age}, DOB={dob}, Income={income}, Cover={cover_type}, Policy={policy_type}, Gender={gender}, SumAssured={sum_assured}")
            
            # FILE LOGGING FOR DEBUGGING
            try:
                with open("tool_debug.log", "a") as f:
                    f.write(f"{datetime.datetime.now()} - Tool: calculate_insurance_plan - Params: Name={name}, Age={age}, Income={income}, Gender={gender}, Policy={policy_type}, SumAssured={sum_assured}\n")
            except Exception as e:
                print(f"Logging failed: {e}")

            # Type Coercion for LLM edge cases
            if isinstance(income, str):
                try:
                    income = float(income.lower().replace(',', '').replace(' ', '').replace('l', '00000').replace('ac', '').replace('akh', ''))
                except: pass
            
            if isinstance(liabilities, str):
                try:
                    liabilities = float(liabilities.lower().replace(',', '').replace(' ', '').replace('l', '00000').replace('ac', '').replace('akh', ''))
                except: pass

            # Recalculate Age if DOB is provided
            final_age = age
            if dob:
                try:
                    import re
                    # Auto-correct DD-MM-YYYY to YYYY-MM-DD
                    if re.match(r'^\d{2}[-/]\d{2}[-/]\d{4}$', dob):
                        parts = re.split(r'[-/]', dob)
                        dob = f"{parts[2]}-{parts[1]}-{parts[0]}"
                        
                    dob_date = datetime.datetime.strptime(dob, "%Y-%m-%d").date()
                    today = datetime.date.today()
                    # Calculate EXACT age
                    calculated_age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
                    
                    if calculated_age != age:
                         print(f"    ⚠️ Age Mismatch! Params Age: {age}, Calculated Exact Age: {calculated_age}")
                         print(f"    ✅ Using Exact Age: {calculated_age}")
                         final_age = calculated_age
                    else:
                         print(f"    ✅ Age matches DOB calculation: {final_age}")
                except Exception as e:
                    print(f"    ⚠️ Error parsing DOB in plan tool ({dob}): {e}. Using provided age {age}.")

            user_data = {
                "age": final_age,
                "income": income,
                "liabilities": liabilities,
                "smoker": smoker,
                "gender": gender,
                "is_rop": is_rop,
                "cover_type": cover_type,
                "policy_type": policy_type
            }
            
            # Run the logic
            try:
                result = engine.get_recommendation(user_data)
                
                # --- REPORT GENERATION ---
                try:
                    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"Client_Report_{timestamp}.pdf"
                    output_path = os.path.join(reports_path, filename) # Use reports_path
                    
                    profile_for_report = {
                        "age": final_age,
                        "income": income,
                        "gender": gender,
                        "city": city,
                        "occupation": occupation,
                        "education": education,
                        "name": name 
                    }
                    
                    # Generate report if we have a recommendation
                    rec_data = result["recommendations"][0] if result.get("recommendations") else None
                    if rec_data:
                        rec_data['sum_assured'] = sum_assured # Inject sum assured
                        
                        # Generate highly elaborated suitability description
                        reason_text = (
                            f"Based on a comprehensive analysis of your financial profile, the {rec_data.get('product_name', 'recommended plan')} from {rec_data.get('company', 'this top-tier insurer')} emerges as the ideal choice for a {final_age}-year-old professional.\n\n"
                        )
                        
                        if income > 0:
                            reason_text += f"Given your annual income of Rs. {income:,.0f} and your stated financial liabilities, "

                        if sum_assured and sum_assured != "N/A":
                            try:
                                cov_val = float(str(sum_assured).replace('Rs.','').replace(',','').replace(' ','').strip())
                                reason_text += f"we have scientifically calculated an optimal Sum Assured of Rs. {cov_val:,.0f}. This precisely calibrated coverage ensures that your family's standard of living is fully protected against inflation and any unforeseen events without paying for unnecessary excess coverage.\n\n"
                            except:
                                reason_text += f"we highly recommend a Sum Assured of {sum_assured}. This amount provides a robust financial safety net capable of sustaining your family's long-term financial goals.\n\n"
                        else:
                            reason_text += "this policy provides an essential and scalable financial protection shield tailored to your life stage.\n\n"

                        if policy_type.lower() in ["rof", "return of premium", "rop"] or is_rop:
                             reason_text += f"You specifically requested a Return of Premium (ROP) benefit. This specific plan stands out because it guarantees a 100% refund of the total premiums paid if you outlive the policy term. By essentially making your life cover a zero-cost investment over the long run, it perfectly aligns protection with capital preservation.\n\n"
                        elif "tulip" in policy_type.lower() or "unit linked" in policy_type.lower():
                             reason_text += f"As a highly sought-after TULIP (Term Unit Linked Insurance Plan), this policy perfectly blends high-value life protection with aggressive wealth accumulation, actively matching your dual goals of total security and long-term market investment.\n\n"
                        elif "increasing" in cover_type.lower():
                             reason_text += f"By selecting an Increasing Cover option, this plan automatically upgrades your life cover every year to combat inflation. This means the real value of your family's payout is never degraded by rising living costs.\n\n"
                        else:
                             reason_text += f"As a comprehensively structured Pure Term plan, it provides maximum high-value coverage at the most economical premium in the current market. This structural efficiency makes it highly capital-effective, allowing you to secure your family while freeing up capital for other investments.\n\n"
                        
                        # Add generic trust
                        csr = rec_data.get('csr', 98.0)
                        solvency = rec_data.get('solvency', 2.0)
                        reason_text += f"Finally, institutional reliability is paramount. {rec_data.get('company', 'The insurer')} boasts a pristine, industry-leading Claim Settlement Ratio (CSR) of {csr}% and a robust Solvency Ratio of {solvency}. This excellent track record guarantees unmatched peace of mind, ensuring your family's claim will be honored swiftly and without administrative hurdles when it matters most."
                        
                        rec_data['suitability_reason'] = reason_text
                        print(f"    📝 Generated Elaborated Suitability Reason: {reason_text}")

                    generate_client_report(profile_for_report, rec_data, output_path)
                    
                    # Serve from local FastAPI static mount instead of broken Supabase
                    BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")
                    local_url = f"{BASE_URL.rstrip('/')}/reports/{filename}"
                    result["report_link"] = local_url
                    print(f"    ✅ Generated Local Report: {local_url}")
                    
                    # DO NOT clean up local artifact, as it is being served by FastAPI
                    
                except Exception as e:
                    print(f"    ❌ Report generation failed: {e}")
                    result["report_link"] = None

                # CAPTURE THE RESULT
                tool_outputs.append(result)
                return result
            except Exception as e:
                print(f"❌ Error inside tool execution: {e}")
                traceback.print_exc()
                return {"error": "Calculation failed"}

        # 3. Model Fallback Mechanism
        GEMINI_MODELS = [
            "gemini-2.0-flash-exp",
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-pro-latest"
        ]

        final_response = None
        last_error = None

        FINAL_SYSTEM_PROMPT = SYSTEM_PROMPT.format(
            eligibility_context=ELIGIBILITY_CONTEXT,
            base_url=BASE_URL.rstrip('/')
        )

        for model_name in GEMINI_MODELS:
            try:
                print(f"🔄 Attempting with model: {model_name}")
                
                # Initialize Model with the Tool
                model = genai.GenerativeModel(
                    model_name=model_name,
                    tools=[calculate_recommended_cover, calculate_insurance_plan, get_insurance_company_metrics, list_plans_by_category, get_company_riders],
                    system_instruction=FINAL_SYSTEM_PROMPT,
                    generation_config={"temperature": 0.0}
                )

                chat = model.start_chat(history=gemini_history, enable_automatic_function_calling=True)

                # 4. Send Message
                response = chat.send_message(current_user_msg)
                print(f"✅ AI Response Generated using {model_name}")

                # 5. Construct Response
                final_response = {
                    "response": response.text,
                    "recommendations": None,
                    "analysis": None
                }
                
                # If successful, break the loop
                break

            except Exception as e:
                print(f"⚠️ Model {model_name} failed: {e}")
                last_error = e
                error_msg = str(e)
                # Check if it's a quota error to decide if we should continue or stop
                if "429" in error_msg or "ResourceExhausted" in error_msg:
                    print("--> Quota exceeded, switching to next model...")
                    continue
                else:
                    # If it's another type of error (like 400 bad request), it might not be solved by switching models, 
                    # but for robustness we can try or just re-raise. 
                    # Here we will continue to try other models just in case.
                    continue

        if not final_response:
             # If we exhausted all models and still have no response
             raise last_error if last_error else Exception("All models failed")

        # Check if we captured any tool outputs during execution
        # We only attach 'recommendations' if the calculate_insurance_plan tool was called.
        if tool_outputs:
            print("📦 Tool outputs found. Checking for plan recommendations...")
            for output in tool_outputs:
                if "recommendations" in output:
                    final_response["recommendations"] = output.get("recommendations")
                    final_response["analysis"] = output.get("analysis")
                    # Inject corrected age into analysis if available
                    if "corrected_age" in output:
                         final_response["corrected_age"] = output["corrected_age"]
                    break # Only need one set of recommendations

        # --- GUARDRAIL: Check for Hallucinated Report Links ---
        # If the response contains a report link but the tool was NOT called (or returned no link),
        # we must scrub the link to prevent 404 errors.
        
        generated_text = final_response["response"]
        has_report_link = "Client_Report_" in generated_text
        
        tool_generated_link = False
        if tool_outputs:
            for output in tool_outputs:
                if output.get("report_link"):
                    tool_generated_link = True
                    break
        
        if has_report_link and not tool_generated_link:
            print("🚨 HALLUCINATION DETECTED: Bot generated a report link without calling the tool!")
            # Replace the link with a warning
            import re
            # Regex to catch the markdown link [Download Personalized Report](...)
            cleaned_text = re.sub(r"\[Download Personalized Report\]\(.*?/reports/Client_Report_.*?\.pdf\)", 
                                  "⚠️ *[Report Generation Pending - Please ask 'Generate Report' to retry]*", 
                                  generated_text)
            final_response["response"] = cleaned_text

        # --- LOG CONVERSATION (NEW) ---
        try:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            # Added more prominent separator and spacing as requested
            separator = "=" * 60
            log_entry = f"\n{separator}\n[{timestamp}]\nUSER: {current_user_msg}\n\nBOT: {final_response['response']}\n{separator}\n\n\n"
            
            with open("conversation_logs.txt", "a", encoding="utf-8") as f:
                f.write(log_entry)
            print("📝 Conversation logged successfully.")
            
            # --- GENERATE PDF CHAT LOG ---
            pdf_path = save_chat_to_pdf(request.messages, final_response['response'])
            if pdf_path:
                print(f"📄 PDF Chat Log updated at: {pdf_path}")
            
        except Exception as log_err:
            print(f"⚠️ Failed to log conversation: {log_err}")

        # --- SERVER-SIDE DB PERSISTENCE (AI Response) ---
        # Handled by frontend.

        final_response["chat_id"] = chat_id
        return final_response

    except Exception as e:
        print(f"❌ CRITICAL BACKEND ERROR: {e}")
        # Print the full stack trace to the terminal so we can debug
        traceback.print_exc()
        error_msg = str(e)
        user_msg = f"I apologize, but I'm facing a technical issue. (Error: {error_msg})"
        
        if "429" in error_msg or "ResourceExhausted" in error_msg:
             user_msg = "⚠️ I'm currently receiving too many requests (Quota Exceeded). Please try again in usually 1-2 minutes. (Free Tier Limit)"
        elif "404" in error_msg:
             user_msg = "⚠️ The AI model is currently unavailable. Please check the server configuration."

        return {
            "response": user_msg,
            "error": error_msg
        }

if __name__ == "__main__":
    import uvicorn
    # Make sure we bind to 0.0.0.0 to be accessible
    uvicorn.run(app, host="0.0.0.0", port=8000)