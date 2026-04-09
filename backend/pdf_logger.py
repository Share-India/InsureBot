import os
import datetime
import re
from fpdf import FPDF
from supabase_client import supabase_admin

def strip_emojis(text):
    """
    Strips emojis and unsupported unicode characters so FPDF default fonts don't crash.
    """
    if not text:
        return ""
    # Encode to latin-1 and ignore unmappable characters, then decode back.
    return str(text).encode('latin-1', 'ignore').decode('latin-1')

def extract_user_name(messages):
    """
    Attempts to extract the user's name from the chat history.
    """
    ignore_list = [
        "hi", "hello", "hey", "yes", "no", "ok", "okay", "sure", "yep", "nope", 
        "please", "thanks", "done", "ho", "male", "female", "flat", "increasing", 
        "decreasing", "pure", "rop", "tulip", "joint", "data", "post", "delhi", "mumbai"
    ]
    
    # PASS 1: Strict Explicit Regex Match across ALL messages
    for msg in reversed(messages):
        role = getattr(msg, 'role', 'user')
        if role == 'user':
            content = getattr(msg, 'content', '').strip()
            # Catch "my name is X", "I am X", "name - X", "Name: X"
            match = re.search(r"(?:my name is|i am|i'm|this is|call me|name\s*[-:=]?)\s*([A-Za-z]{2,})", content, re.IGNORECASE)
            if match:
                extracted = match.group(1).capitalize()
                if extracted.lower() not in ignore_list:
                    return extracted

    # PASS 1.5: Look for "Name, DOB, Income" comma format or similar data dumps
    for msg in reversed(messages):
        role = getattr(msg, 'role', 'user')
        if role == 'user':
            content = getattr(msg, 'content', '').strip()
            # Matches formats like "akshat, 1997-08-30, 15lpa" or "Akshat 1997-08-30"
            match = re.match(r"^([A-Za-z]{2,})\s*[,|-]\s*(?:\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})", content)
            if match:
                extracted = match.group(1).capitalize()
                if extracted.lower() not in ignore_list:
                    return extracted
                    
    # PASS 2: Fallback to short 1-2 word responses (from newest to oldest)
    for msg in reversed(messages):
        role = getattr(msg, 'role', 'user')
        if role == 'user':
            content = getattr(msg, 'content', '').strip()
            
            # Additional check: If it has any numbers, it's probably not a standalone name
            if re.search(r"\d", content): continue
            
            words = content.split()
            if len(words) <= 2 and words:
                first_word = words[0].lower()
                clean_first_word = ''.join(e for e in first_word if e.isalnum())
                
                # Check it's an alphabetical word, longer than 2 chars, and not blacklisted
                if clean_first_word and clean_first_word not in ignore_list and len(clean_first_word) > 2:
                    return clean_first_word.capitalize()
                    
    return "User"

def save_chat_to_pdf(messages, final_bot_response):
    """
    Generates a PDF of the ongoing conversation.
    messages: list of Pydantic models from the frontend request (has .role and .content)
    final_bot_response: string
    """
    try:
        user_name = extract_user_name(messages)
        date_formatted = datetime.datetime.now().strftime("%Y-%m-%d")    
        filename = f"{user_name}_{date_formatted}.pdf"
        
        # Ensure directory exists
        base_path = os.path.dirname(__file__)
        pdf_dir = os.path.join(base_path, "chat_logs_pdf")
        os.makedirs(pdf_dir, exist_ok=True)
        
        filepath = os.path.join(pdf_dir, filename)

        # Cleanup generic 'User' pdf if a real name was found
        if user_name != "User":
            generic_filepath = os.path.join(pdf_dir, f"User_{date_formatted}.pdf")
            if os.path.exists(generic_filepath):
                try:
                    os.remove(generic_filepath)
                    print(f"🗑️ Removed generic chat log: {generic_filepath}")
                except Exception as e:
                    print(f"⚠️ Could not remove generic chat log: {e}")

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        # Title
        pdf.set_font("Helvetica", style="B", size=16)
        pdf.cell(0, 10, f"Chat Transcript: {user_name}", ln=True, align="C")
        pdf.ln(5)
        
        # Date
        full_date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        pdf.set_font("Helvetica", style="I", size=10)
        pdf.cell(0, 10, f"Last Updated: {full_date_str}", ln=True, align="C")
        pdf.ln(10)
        
        # Write Messages
        for msg in messages:
            role = getattr(msg, 'role', 'user')
            content = getattr(msg, 'content', '')
            safe_content = strip_emojis(content)
            
            if role == "user":
                pdf.set_font("Helvetica", style="B", size=11)
                pdf.set_text_color(0, 51, 153) # Blue
                pdf.cell(0, 8, f"{user_name}:", ln=True)
                pdf.set_font("Helvetica", size=11)
                pdf.set_text_color(0, 0, 0) # Black
                pdf.multi_cell(0, 6, safe_content)
            else:
                pdf.set_font("Helvetica", style="B", size=11)
                pdf.set_text_color(0, 102, 0) # Green
                pdf.cell(0, 8, "InsureBot:", ln=True)
                pdf.set_font("Helvetica", size=11)
                pdf.set_text_color(0, 0, 0) # Black
                pdf.multi_cell(0, 6, safe_content)
                
            pdf.ln(5)
            
        # Write the final response of the current turn
        safe_response = strip_emojis(final_bot_response)
        pdf.set_font("Helvetica", style="B", size=11)
        pdf.set_text_color(0, 102, 0) # Green
        pdf.cell(0, 8, "InsureBot:", ln=True)
        pdf.set_font("Helvetica", size=11)
        pdf.set_text_color(0, 0, 0) # Black
        pdf.multi_cell(0, 6, safe_response)
        
        # Save locally first
        pdf.output(filepath)
        
        # Upload to Supabase Cloud Storage
        try:
            print(f"    ☁️ Uploading chat log to Supabase: {filename}")
            with open(filepath, 'rb') as f:
                supabase_admin.storage.from_('reports').upload(
                    path=filename,
                    file=f,
                    file_options={"content-type": "application/pdf", "upsert": "true"}
                )
            # Retrieve Cloud URL
            cloud_url = supabase_admin.storage.from_('reports').get_public_url(filename)
            
            # Clean up local artifact
            os.remove(filepath)
            print(f"    ✅ Generated Cloud Chat Log: {cloud_url}")
            return cloud_url
        except Exception as upload_err:
            print(f"    ⚠️ Failed to upload chat log to Supabase, keeping local fallback: {upload_err}")
            return filepath
        
    except Exception as e:
        print(f"⚠️ Failed to generate PDF Chat Log: {e}")
        return None
