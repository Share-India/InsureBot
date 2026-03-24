import pandas as pd
import json
import random
import os

class InsuranceEngine:
    def __init__(self):
        # 1. LOAD THE REAL CLAIMS CSV
        try:
            # Absolute path calculation to avoid FileNotFoundError
            base_path = os.path.dirname(os.path.abspath(__file__))
            csv_path = os.path.join(base_path, "data", "insurance_claims_dataset.csv")
            json_path = os.path.join(base_path, "data", "products_config.json")
            
            # Check if files exist
            if not os.path.exists(csv_path):
                print(f"❌ CSV NOT FOUND at: {csv_path}")
                self.claims_df = pd.DataFrame()
            else:
                self.claims_df = pd.read_csv(csv_path)
                print("✅ CSV Loaded Successfully")

            # Load Primary Config (from CSV mapping) to retain BROCHURE LINKS
            mapped_json_path = os.path.join(base_path, "data", "mapped_products_config.json")
            self.product_data = {"policies": []}
            if os.path.exists(mapped_json_path):
                with open(mapped_json_path, "r") as f:
                    self.product_data["policies"].extend(json.load(f).get("policies", []))

            # Load Detailed Config (for rich brochure features)
            self.detailed_product_data = {"policies": []}
            if os.path.exists(json_path):
                with open(json_path, "r") as f:
                    self.detailed_product_data["policies"].extend(json.load(f).get("policies", []))

            # 2. LOAD DIRECT PLANS CSV (REPLACING JSON FOR FILTERING)
            plans_csv_path = os.path.join(base_path, "data", "insurance_plans_updated_1.csv")
            if os.path.exists(plans_csv_path):
                raw_df = pd.read_csv(plans_csv_path)
                new_cols = []
                for i in range(len(raw_df.columns)):
                    if 'Unnamed' not in raw_df.columns[i] and raw_df.columns[i] not in ['Eligibility Criteria', 'Plan Options', 'Riders']:
                        new_cols.append(raw_df.columns[i])
                    else:
                        new_cols.append(str(raw_df.iloc[0, i]).strip())
                raw_df.columns = new_cols
                self.plans_df = raw_df.drop(0).reset_index(drop=True)
                
                # Sanitize Data
                def parse_sa(val):
                    if pd.isna(val): return 0
                    val = str(val).replace(',', '').strip().lower()
                    if 'no limit' in val: return float('inf')
                    if 'crore' in val:
                        num_part = val.replace('crore', '').strip()
                        try: return float(num_part) * 10000000
                        except: return 0
                    if 'lakh' in val:
                        num_part = val.replace('lakh', '').strip()
                        try: return float(num_part) * 100000
                        except: return 0
                    try: return float(val)
                    except: return 0

                self.plans_df['Minimum Sum Assured'] = self.plans_df['Minimum Sum Assured'].apply(parse_sa)
                self.plans_df['Maximum Sum Assured'] = self.plans_df['Maximum Sum Assured'].apply(parse_sa)
                
                # Convert ages to numeric, coercing errors
                self.plans_df['Minimum Entry Age'] = pd.to_numeric(self.plans_df['Minimum Entry Age'], errors='coerce').fillna(18)
                self.plans_df['Maximum Entry Age'] = pd.to_numeric(self.plans_df['Maximum Entry Age'], errors='coerce').fillna(65)
                
                # Fill N/As
                self.plans_df['Product Name'] = self.plans_df['Product Name'].fillna('Unknown Plan')
                self.plans_df['Insurer Name'] = self.plans_df['Insurer Name'].fillna('Unknown Insurer')
                
                print(f"✅ Primary Config (from CSV) Loaded Successfully: {len(self.plans_df)} plans")
            else:
                self.plans_df = pd.DataFrame()
                print(f"⚠️ Primary Config NOT FOUND at: {plans_csv_path}")
            
            # Load Eligibility CSV
            eligibility_csv_path = os.path.join(base_path, "data", "term_insurance_eligibility.csv")
            if not os.path.exists(eligibility_csv_path):
                print(f"❌ Eligibility CSV NOT FOUND at: {eligibility_csv_path}")
                self.eligibility_df = pd.DataFrame()
            else:
                self.eligibility_df = pd.read_csv(eligibility_csv_path)
                print("✅ Eligibility CSV Loaded Successfully")
            
            # --- DATA CLEANING ---
            if not self.claims_df.empty:
                # Rename columns safely
                rename_map = {
                    'Company': 'Company',
                    'Claims_Paid_Ratio_Death': 'CSR',      
                    'Solvency_2025': 'Solvency'
                }
                # Only rename columns that actually exist
                self.claims_df.rename(columns={k: v for k, v in rename_map.items() if k in self.claims_df.columns}, inplace=True)

                # Clean percentage signs
                if 'CSR' in self.claims_df.columns and self.claims_df['CSR'].dtype == 'object':
                    self.claims_df['CSR'] = self.claims_df['CSR'].str.replace('%', '').astype(float)
                
                # Ensure Solvency is numeric
                if 'Solvency' in self.claims_df.columns:
                    self.claims_df['Solvency'] = pd.to_numeric(self.claims_df['Solvency'], errors='coerce').fillna(0)
                
        except Exception as e:
            print(f"❌ CRITICAL ERROR initializing engine: {e}")
            self.claims_df = pd.DataFrame()
            self.product_data = {}
            self.eligibility_df = pd.DataFrame()

    def get_eligibility_context(self):
        """
        Returns a formatted string of eligibility conditions from the CSV.
        """
        if self.eligibility_df.empty:
            return "No eligibility data available."
        
        context = "### Term Insurance Eligibility Conditions:\n"
        for _, row in self.eligibility_df.iterrows():
            category = row.get('Category', 'General')
            condition = row.get('Condition / Profile', 'Unknown')
            impact = row.get('Impact on Eligibility', 'Review needed')
            context += f"- **{category}**: If user matches '{condition}', then: {impact}\n"
        
        return context

    def calculate_needs(self, income, liabilities, age, assets=0):
        # Age-based multipliers
        multiplier = 20 # Fallback
        
        if 18 <= age <= 35:
            multiplier = 25
        elif 36 <= age <= 40:
            multiplier = 20
        elif 41 <= age <= 45:
            multiplier = 15
        elif 46 <= age <= 50:
            multiplier = 12
        elif 51 <= age <= 55:
            multiplier = 10
        elif 56 <= age <= 60:
            multiplier = 5
            
        print(f"💰 Calculating Needs: Age={age}, Income={income}, Liabilities={liabilities}, Assets={assets}, Multiplier={multiplier}x")
        
        # Formula: (Income * Multiplier) + Liabilities - Assets
        total_needs = (income * multiplier) + liabilities - assets
        
        # Ensure it doesn't go below zero (or some minimum sensible basic cover, but strict math says 0)
        return float(max(total_needs, 0))

    def estimate_premium(self, age, sum_insured, smoker, is_rop, gender, company_name="Unknown", cover_type="Flat", policy_type="Pure Term"):
        base_rate = 12000
        
        # Company Tier Factors (Simulated Market Rates)
        # Tier 1 (Premium Brands) -> Higher Cost
        # Tier 2 (Value Brands) -> Medium Cost
        # Tier 3 (Budget Brands) -> Lower Cost
        company_factors = {
            "HDFC Life": 1.15,
            "ICICI Prudential": 1.12,
            "SBI Life": 1.10,
            "Max Life": 1.05,
            "Bajaj Allianz Life": 1.00, # Benchmark
            "TATA AIA": 1.02,
            "Kotak Life": 0.95,
            "Pramerica Life": 0.90,
            "Aditya Birla": 1.00
        }
        
        # Default to 1.0 if company not found
        market_factor = 1.0
        for key, val in company_factors.items():
            if key.lower() in str(company_name).lower():
                market_factor = val
                break
        
        cover_factor = sum_insured / 10000000
        age_factor = 1 + ((age - 30) * 0.05) if age > 30 else 1
        smoker_factor = 1.5 if smoker else 1.0
        rop_factor = 1.9 if is_rop else 1.0
        gender_factor = 0.85 if str(gender).lower() == "female" else 1.0
        
        # Cover Type Factor
        cover_type_factor = 1.0
        ct_lower = str(cover_type).lower()
        if "increasing" in ct_lower:
            cover_type_factor = 1.2
        elif "decreasing" in ct_lower:
            cover_type_factor = 0.9
            
        # Policy Type Factor
        policy_type_factor = 1.0
        pt_lower = str(policy_type).lower()
        
        if "joint" in pt_lower:
            policy_type_factor = 1.7 # Spouse cover cost
        elif "tulip" in pt_lower or "unit linked" in pt_lower:
            policy_type_factor = 1.5 # Investment component
        elif "return of premium" in pt_lower:
            rop_factor = 1.9 # Ensure ROP factor is applied if selected here
        elif "increasing" in pt_lower or "increased" in pt_lower:
             cover_type_factor = 1.2 # Ensure Increasing factor is applied
        
        final_premium = int(round(base_rate * cover_factor * age_factor * smoker_factor * rop_factor * gender_factor * market_factor * cover_type_factor * policy_type_factor))
        
        return final_premium

    def calculate_suitability_score(self, user_data, policy_details):
        if not policy_details:
            return -50 # Penalty for unknown policies
            
        score = 0
        
        # 1. Eligibility Check (Hard Constraints)
        eligibility = policy_details.get('eligibility', {})
        min_age = eligibility.get('min_age', 18)
        max_age = eligibility.get('max_age', 65)
        min_income = eligibility.get('min_income', 0)
        
        user_age = int(user_data.get('age', 30))
        user_income = float(user_data.get('income', 0))
        
        if user_age < min_age or user_age > max_age:
            return -1000 # Disqualify
            
        if user_income < min_income:
            return -1000 # Disqualify

        # 2. Feature Matching (Soft Constraints)
        features = policy_details.get('features', {})
        user_wants_rop = bool(user_data.get('is_rop', False))
        
        # ROP Matching
        if user_wants_rop:
            if features.get('rop'):
                score += 20 # Strong Boost for exact match
            else:
                score -= 30 # Strong Penalty if requirement not met
        elif features.get('rop'):
             # If user didn't ask for ROP but policy has it, it usually costs more. 
             # We let the premium penalty handle the cost, but maybe slight unmatched penalty?
             # actually, ROP plans are good, maybe neutral.
             pass

        # Budget Matching
        if user_income < 500000:
            if features.get('cheap'):
                score += 15 # Boost for budget-friendly plans for lower income
        
        # General Feature Bonuses
        if features.get('critical_illness'):
            score += 5
        if features.get('wop'): # Waiver of Premium
            score += 3
        if features.get('govt_backed'):
            score += 2
        if features.get('whole_life'):
            score += 2
        
        print(f"    ℹ️ Suitability for {policy_details['metadata']['product_name']}: {score}")
        return score

    def get_recommendation(self, user_data):
        import datetime
        try:
            with open("logic_debug.log", "a") as f:
                f.write(f"\n{datetime.datetime.now()} [START get_recommendation] User Data: {user_data}\n")
        except:
            pass
            
        print(f"⚙️ Processing Recommendation for: {user_data}")
        
        if self.claims_df.empty:
            print("⚠️ Claims DataFrame is empty. Cannot recommend.")
            return {"error": "Data not loaded correctly"}

        try:
            age = int(float(user_data.get('age', 30)))
            income = float(user_data.get('income', 1000000))
            liabilities = float(user_data.get('liabilities', 0))
            smoker = bool(user_data.get('smoker', False))
            is_rop = bool(user_data.get('is_rop', False))
            gender = str(user_data.get('gender', 'Male'))
            cover_type = str(user_data.get('cover_type', 'Flat'))
            policy_type = str(user_data.get('policy_type', 'Pure Term'))

            recommended_cover = self.calculate_needs(income, liabilities, age)

            # STRATEGIC CSV DATA FILTERING
            if self.plans_df.empty:
                return {"error": "CSV Plans Database is empty."}
                
            # Filter by Age Boundaries
            df_filtered = self.plans_df[
                (self.plans_df['Minimum Entry Age'] <= age) &
                (self.plans_df['Maximum Entry Age'] >= age)
            ]
            
            # Filter by Cover Limit Boundaries
            df_filtered = df_filtered[
                (df_filtered['Minimum Sum Assured'] <= recommended_cover) &
                (df_filtered['Maximum Sum Assured'] >= recommended_cover)
            ]
            
            # Filter by Feature Type
            user_policy_type = policy_type.lower()
            if "tulip" in user_policy_type or "unit linked" in user_policy_type:
                df_filtered = df_filtered[df_filtered['TULIP'].astype(str).str.contains('Yes', case=False, na=False)]
            elif "return of premium" in user_policy_type:
                df_filtered = df_filtered[df_filtered['Return of premium'].astype(str).str.contains('Yes', case=False, na=False)]
            else:
                # Default Pure Term (exclude TULIP and pure ROP focused unless requested)
                df_filtered = df_filtered[~df_filtered['TULIP'].astype(str).str.contains('Yes', case=False, na=False)]
                
            # If no exact match on features, fallback to age and cover bounds
            if df_filtered.empty:
                df_filtered = self.plans_df[
                    (self.plans_df['Minimum Entry Age'] <= age) &
                    (self.plans_df['Maximum Entry Age'] >= age) &
                    (self.plans_df['Minimum Sum Assured'] <= recommended_cover) &
                    (self.plans_df['Maximum Sum Assured'] >= recommended_cover)
                ]

            # Select one distinct plan per company
            unique_companies_seen = set()
            results = []
            
            for index, row in df_filtered.iterrows():
                company = str(row.get('Insurer Name', 'Unknown'))
                if company in unique_companies_seen: continue
                unique_companies_seen.add(company)
                
                product_name = str(row.get('Product Name', 'Term Plan')).strip()
                
                # Retrieve links and USP from secondary JSON mapping
                brochure_link = None
                policy_document_link = None
                usp = "Comprehensive Term Coverage"
                features_dict = {}
                
                for p in self.product_data.get('policies', []):
                    if p['metadata']['product_name'].lower() == product_name.lower():
                        brochure_link = p['metadata'].get('brochure_link')
                        policy_document_link = p['metadata'].get('policy_document_link')
                        features_dict = p.get('features', {})
                        usp = features_dict.get('description', usp)
                        break

                # Now try to replace 'features_dict' with rich textual brochure features
                rich_features = {}
                found_detailed = False
                for dp in self.detailed_product_data.get('policies', []):
                    # More robust matching: Check if company + product name partially matches
                    dp_name = dp['metadata']['product_name'].lower()
                    if dp_name in product_name.lower() or product_name.lower() in dp_name.lower():
                        
                        # Extract core benefits
                        core = dp.get('core_benefits', {})
                        for k, v in core.items():
                            clean_key = k.replace("_", " ").title()
                            # Extra cleaning for massive text blocks
                            rich_features[clean_key] = str(v).replace("\n", " ").strip()
                            
                        # Extract plan variants (very important for what the plan actually is)
                        variants = dp.get('plan_variants', [])
                        if variants:
                             variant_texts = []
                             for var in variants:
                                 v_name = var.get('variant_name', '')
                                 v_desc = var.get('description', '')
                                 if v_name and v_desc:
                                      variant_texts.append(f"{v_name}: {v_desc}")
                             if variant_texts:
                                  rich_features["Plan Variants Available"] = " | ".join(variant_texts)
                            
                        # Extract special features
                        special = dp.get('special_features', {})
                        for k, v in special.items():
                            clean_key = k.replace("_", " ").title()
                            if isinstance(v, dict):
                                rich_features[clean_key] = v.get("description", str(v)).replace("\n", " ").strip()
                            else:
                                rich_features[clean_key] = str(v).replace("\n", " ").strip()
                                
                        found_detailed = True
                        break
                        
                if found_detailed and rich_features:
                    features_dict = rich_features
                else:
                    # Fallback: Convert boolean dictionary into a readable list of included features
                    # AND pull in raw CSV data if available
                    readable_features = {}
                    
                    # Add standard CSV indicators
                    if row.get('Return of premium', 'No') == 'Yes':
                        readable_features["Return of Premium"] = "Guarantees a 100% refund of all annualized premiums paid upon surviving the policy term."
                    if row.get('Increasing cover', 'No') == 'Yes':
                        readable_features["Increasing Cover"] = "The Sum Assured increases periodically to help your coverage keep pace with inflation."
                    if row.get('Accidental Death Benefit', 'No') == 'Yes':
                        readable_features["Accidental Death Benefit"] = "Provides an additional lump sum payout to the family in case of death due to an accident."
                    if row.get('Critical Illness Rider', 'No') == 'Yes':
                        readable_features["Critical Illness Protection"] = "Offers a lump sum payout upon diagnosis of specified critical illnesses."
                    if row.get('Terminal Illness', 'No') == 'Yes':
                        readable_features["Terminal Illness Benefit"] = "Accelerates the death benefit payout if diagnosed with a terminal illness."
                    
                    for k, v in features_dict.items():
                        if k == 'description': continue
                        if v is True:
                            clean_name = k.replace("_", " ").title()
                            if clean_name not in readable_features:
                                readable_features[clean_name] = f"Includes comprehensive {clean_name.lower()} coverage as part of the core policy structure."
                    
                    if not readable_features:
                        readable_features["Core Coverage"] = "Provides a highly reliable, standard term life protection payout to your beneficiaries."
                    
                    features_dict = readable_features

                # Dynamic Suitability Scoring
                suitability_score = 50 # Base score
                
                # Check soft matching for prioritization
                pt_lower = str(policy_type).lower()
                ct_lower = str(cover_type).lower()
                
                is_plan_rop = str(row.get('Return of premium', 'No')).lower() == 'yes'
                is_plan_inc = str(row.get('Increasing cover', 'No')).lower() == 'yes'
                is_plan_tulip = str(row.get('TULIP', 'No')).lower() == 'yes'
                
                # Boost score if user explicitly requested and plan has it
                if "return of premium" in pt_lower or is_rop:
                    if is_plan_rop: suitability_score += 30
                
                if "increasing" in ct_lower:
                    if is_plan_inc: suitability_score += 30
                    
                # Add a tiny random variance (e.g. 0.01 to 0.99) to break ties organically
                import random
                tie_breaker = random.uniform(0.01, 0.99)
                suitability_score += tie_breaker
                
                est_premium = self.estimate_premium(
                    age, recommended_cover, smoker, is_rop, gender, company, cover_type, policy_type
                )
                
                csr_val = 98.0
                solvency_val = 2.0
                if not self.claims_df.empty:
                    for _, r in self.claims_df.iterrows():
                        claim_company = str(r.get('Company', ''))
                        if claim_company.lower() in company.lower() or company.lower() in claim_company.lower():
                            csr_val = float(r.get('CSR', 98.0))
                            solvency_val = float(r.get('Solvency', 2.0))
                            break
                            
                score = float(csr_val + (solvency_val * 0.5) + suitability_score)
                
                results.append({
                    "company": company,
                    "product_name": str(product_name),
                    "usp": str(usp),
                    "premium_estimate": int(est_premium),
                    "csr": csr_val,
                    "solvency": solvency_val,
                    "score": score,
                    "suitability": suitability_score,
                    "features": features_dict,
                    "brochure_link": brochure_link,
                    "policy_document_link": policy_document_link
                })

            # Sort by Score
            sorted_results = sorted(results, key=lambda x: x['score'], reverse=True)
            top_3 = sorted_results[:3]

            print(f"✅ Generated {len(top_3)} recommendations")
            
            try:
                with open("logic_debug.log", "a") as f:
                    f.write(f"Matched {len(results)} policies, Selected top 3.\n")
                    if len(top_3) > 0:
                        f.write(f"Top 1: {top_3[0]['product_name']}\n")
            except:
                pass
            
            return {
                "analysis": {
                    "recommended_cover": float(recommended_cover),
                    "logic": f"Calculated based on 20x annual income ({income}) plus liabilities ({liabilities}).",
                    "corrected_age": age
                },
                "recommendations": top_3
            }
        except Exception as e:
            print(f"❌ Logic Error: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}

    def search_plans(self, query: str):
        """
        Searches the database for a specific category of plans globally.
        """
        if self.plans_df.empty:
            return {"error": "CSV Database not loaded."}
            
        q_lower = query.lower()
        target_col = None
        
        # Mapping common queries to exact CSV columns
        if "return of premium" in q_lower or "rop" in q_lower:
            target_col = "Return of premium"
        elif "increasing" in q_lower:
            target_col = "Increasing cover"
        elif "tulip" in q_lower or "unit" in q_lower or "ulip" in q_lower:
            target_col = "TULIP"
        elif "joint" in q_lower or "spouse" in q_lower:
            target_col = "Joint Life"
        elif "level" in q_lower or "pure term" in q_lower:
            target_col = "Level Cover"
        else:
            return {"error": f"Unknown category: {query}. Try Return of premium, Increasing cover, TULIP, etc."}
            
        if target_col not in self.plans_df.columns:
            return {"error": f"Column {target_col} not found in database."}
            
        # Filter where column value contains 'Yes'
        matches = self.plans_df[self.plans_df[target_col].astype(str).str.contains('Yes', case=False, na=False)]
        
        results = []
        for _, row in matches.iterrows():
            insurer = str(row.get('Insurer Name', 'Unknown'))
            product = str(row.get('Product Name', 'Unknown'))
            details = str(row.get(target_col, 'Yes'))
            # Format nicely
            results.append(f"**{insurer} - {product}**")
            
        return {
            "query": query,
            "category_matched": target_col,
            "total_matches": len(results),
            "plans": results
        }