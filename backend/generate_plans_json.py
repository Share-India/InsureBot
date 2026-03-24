import pandas as pd
import os
import json
import re
import urllib.parse

base_path = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_path, "data", "insurance_plans_updated_1.csv")
brochures_path = os.path.join(base_path, "data", "brochures")
policy_docs_path = os.path.join(base_path, "data", "policy_documents")
json_output_path = os.path.join(base_path, "data", "mapped_products_config.json")

# Read CSV skipping the first two header rows and dealing with multi-headers
raw_df = pd.read_csv(csv_path, header=None)

row1 = raw_df.iloc[0].fillna('')
row2 = raw_df.iloc[1].fillna('')

cols = []
for c1, c2 in zip(row1, row2):
    c1 = str(c1).strip()
    c2 = str(c2).strip()
    if c1 and c2:
        cols.append(f"{c1}_{c2}")
    elif c2:
        cols.append(c2)
    elif c1:
        cols.append(c1)
    else:
        cols.append("Unknown")

df = raw_df.iloc[2:].copy()
df.columns = cols

df = df.rename(columns={
    "Insurer Name": "Insurer",
    "Product Name": "Product"
})

df = df.dropna(subset=["Product"])
df["Insurer"] = df["Insurer"].ffill()

# Get brochures
brochures = os.listdir(brochures_path)
pdf_files = [f for f in brochures if f.endswith(".pdf")]

# Get policy docs
policy_docs = os.listdir(policy_docs_path)
policy_pdf_files = [f for f in policy_docs if f.endswith(".pdf")]

# Setup manual overrides for hard-to-match files
manual_overrides = {
    "Aditya Birla Sun Life Insurance - Life Shield Plan": "ABSLI_Life_Shield_Plan_Leaflet_Insurance.pdf",
    "ACKO Life - Flexi Term Plan": "Acko_Life_Brochure_2_5dc18d28ae.pdf"
}

# Setup manual overrides for policy docs
policy_manual_overrides = {
    "Aditya Birla Sun Life Insurance - Life Shield Plan": None, # Example if needed
}

policies = []

for idx, row in df.iterrows():
    insurer = str(row["Insurer"]).strip()
    product = str(row["Product"]).strip()
    
    # 1. Map Brochure
    key = f"{insurer} - {product}"
    best_match = manual_overrides.get(key)
    
    if not best_match:
        ins_clean = insurer.lower().replace("life insurance", "").strip()
        prod_clean = product.lower()
        
        search_words = re.findall(r'\w+', ins_clean) + re.findall(r'\w+', prod_clean)
        search_words = [w for w in search_words if w not in ['plan', 'life', 'insurance', 'the', 'of', 'and', 'term']]
        
        best_score = 0
        for pdf in pdf_files:
            pdf_lower = pdf.lower()
            score = sum(1 for w in search_words if w in pdf_lower)
            if score > best_score:
                best_score = score
                best_match = pdf
                
        if best_score < 1:
             best_match = None
             
    if best_match:
        encoded_match = urllib.parse.quote(best_match)
        brochure_link = f"http://localhost:8000/brochures/{encoded_match}"
    else:
        brochure_link = None
        
    # 1.5 Map Policy Document
    best_policy_match = policy_manual_overrides.get(key)
    
    if not best_policy_match:
        # Re-use search words from before
        best_policy_score = 0
        for pdf in policy_pdf_files:
            pdf_lower = pdf.lower()
            score = sum(1 for w in search_words if w in pdf_lower)
            if score > best_policy_score:
                best_policy_score = score
                best_policy_match = pdf
                
        if best_policy_score < 1:
             best_policy_match = None
             
    if best_policy_match:
        encoded_policy_match = urllib.parse.quote(best_policy_match)
        policy_document_link = f"http://localhost:8000/policy_documents/{encoded_policy_match}"
    else:
        policy_document_link = None

    # 2. Parse numbers safely
    def parse_num(val, default):
        val_str = str(val).replace(',', '').strip()
        numbers = re.findall(r'\d+', val_str)
        if numbers:
            return int(numbers[0])
        return default
        
    def parse_max_sa(val):
         val_str = str(val).lower()
         if "no limit" in val_str or "baup" in val_str:
             return 999999999 # Treat no limit as very high
         val_str = val_str.replace(',', '').strip()
         if "crore" in val_str:
             nums = re.findall(r'\d+', val_str)
             if nums:
                  return int(nums[0]) * 10000000
         nums = re.findall(r'\d+', val_str)
         if nums:
             return int(nums[0])
         return 999999999

    min_age = parse_num(row.get("Eligibility Criteria_Minimum Entry Age", 18), 18)
    max_age = parse_num(row.get("Eligibility Criteria_Maximum Entry Age", 65), 65)
    min_sa = parse_num(row.get("Eligibility Criteria_Minimum Sum Assured", 500000), 500000)
    max_sa = parse_max_sa(row.get("Eligibility Criteria_Maximum Sum Assured", "No Limit"))
    
    # 3. Features
    is_rop = False
    rop_val = str(row.get("Plan Options_Return of premium", "")).lower()
    if "yes" in rop_val:
        is_rop = True
        
    features_desc = []
    if "yes" in str(row.get("Plan Options_Level Cover", "")).lower(): features_desc.append("Level Cover")
    if "yes" in str(row.get("Plan Options_Increasing cover", "")).lower(): features_desc.append("Increasing Cover")
    if is_rop: features_desc.append("Return of Premium")
    if "yes" in str(row.get("Riders_Accidental Death Benefit", "")).lower(): features_desc.append("Accidental Death Benefit")
    if "yes" in str(row.get("Riders_Critical Illness Rider", "")).lower(): features_desc.append("Critical Illness Cover")
    
    usp = ", ".join(features_desc) if features_desc else "Comprehensive Life Cover"

    policy_data = {
        "metadata": {
            "insurer_name": insurer,
            "product_name": product,
            "product_category": "Term Insurance",
            "brochure_type": "Return of Premium" if is_rop else "Term Insurance",
            "marketing_tagline": usp,
            "brochure_link": brochure_link,
            "policy_document_link": policy_document_link
        },
        "eligibility": {
            "min_age": min_age,
            "max_age": max_age,
            "min_income": 0,
            "sum_assured_min": min_sa,
            "sum_assured_max": max_sa
        },
        "features": {
            "description": f"A comprehensive plan from {insurer} offering {usp}.",
            "rop": is_rop,
            "level_cover": "yes" in str(row.get("Plan Options_Level Cover", "")).lower(),
            "increasing_cover": "yes" in str(row.get("Plan Options_Increasing cover", "")).lower(),
            "critical_illness": "yes" in str(row.get("Riders_Critical Illness Rider", "")).lower()
        }
    }
    
    policies.append(policy_data)

final_json = {
    "policies": policies
}

with open(json_output_path, "w") as f:
    json.dump(final_json, f, indent=4)
    
print(f"✅ Generated mapped JSON at {json_output_path} with {len(policies)} policies.")
