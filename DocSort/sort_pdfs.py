import os
import re
import fitz
from pathlib import Path
from django.conf import settings
import django
from datetime import date
import cloudinary.uploader
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "KuStudyhub.settings")  # Update with your project name
django.setup()
from core.models import UnitProfile, UnitPdf
import subprocess
import sys
from thefuzz import process

UNSORTED_FOLDER=Path(settings.BASE_DIR)/"media"/'unsorted_pdfs'
SORTED_FOLDER=Path(settings.BASE_DIR)/"media"/'sorted_pdfs'
INDIVIDUAL_FOLDER=Path(settings.BASE_DIR)/"media"/'individual_uploads'
NURSING_FOLDER=Path(settings.BASE_DIR)/"media"/'Nursing'

SORTED_FOLDER.mkdir(exist_ok=True,parents=True)
UNIT_CODE_PATTERN = r'([A-Za-z]{3,4})\s*[_-]?\s*(\d{3})'

def direct_code_extraction(fileName):
    match = re.search(r'([A-Za-z]{3,4})[\s_-]?(\d{3})', fileName)
    if match:
        return f"{match.group(1).upper()}{match.group(2)}"
    return None

def extract_text_inside_pdf(pdfPath):
    try:
        pdfDoc = fitz.open(pdfPath)
        text = ""
        for page_num in range(min(3, pdfDoc.page_count)):
            page = pdfDoc[page_num]
            text += page.get_text()
        pdfDoc.close()
        return text
    except Exception as e:
        return None
def extract_unit_code_from_pdf(pdfPath):
    try:
        text = extract_text_inside_pdf(pdfPath)
        return direct_code_extraction(text)
    except Exception as e:
        return None
    
def upload_pdf_to_cloudinary(pdfPath,folder_name):
    try:
        response=cloudinary.uploader.upload(
            pdfPath,
            folder=f"kuStudyHub/{folder_name}",
            resource_type="auto",
        )
        return response["secure_url"]
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
        return None
def extract_pdf_page_count(pdfPath):
    try:
        pdfDoc = fitz.open(pdfPath)
        page_count = pdfDoc.page_count
        pdfDoc.close()
        return page_count
    except Exception as e:
        return None
    
def convert_to_pdf(input_file):
    output_file=str(input_file.with_suffix(".pdf"))
    try:
        subprocess.run(["soffice", "--headless", "--convert-to", "pdf", str(input_file), "--outdir", str(input_file.parent)], check=True)
        return output_file 
    except subprocess.CalledProcessError as e:
        print(f"Failed to convert {input_file}: {e}")
        return None

#Remove all units with more than 6 letters
def clean_database():
    all_units=UnitProfile.objects.all()
    invalid_units=[unit for unit in all_units if len(unit.unitCode)>6]
    for unit in invalid_units:
        print(f"Deleting {unit.unitCode}")
        UnitPdf.objects.filter(unit=unit).delete()
        unit.delete()
        print(f"Deleted {unit.unitCode}")
def sort_pdfs():
    for file in UNSORTED_FOLDER.glob("*"):
        if file.suffix.lower() in [".doc", ".docx", ".ppt", ".pptx"]:
            new_pdf = convert_to_pdf(file)
            if new_pdf:
                file.unlink() 
    for pdf_file in UNSORTED_FOLDER.glob("*.[Pp][Dd][Ff]"):
        unit_Code=direct_code_extraction(pdf_file.name)
        print(pdf_file.name)

        if not unit_Code:
            unit_Code=extract_unit_code_from_pdf(pdf_file)
        
        if unit_Code:
            unit_folder=SORTED_FOLDER/unit_Code
            unit_folder.mkdir(exist_ok=True,parents=True)
            cloudinary_url=upload_pdf_to_cloudinary(str(pdf_file),unit_Code)

            if cloudinary_url:
                unit,created=UnitProfile.objects.get_or_create(unitCode=unit_Code,defaults={"unitTitle":unit_Code})
                UnitPdf.objects.create(
                    unit=unit,
                    pdfTitle=pdf_file.stem,
                    pdfDownloadLink=cloudinary_url,
                    pdfSize=os.path.getsize(pdf_file)//1024,
                    pdfPageCount=extract_pdf_page_count(pdf_file),
                    pdfDate=date.today()
                )

            sorted_pdf_path=unit_folder/pdf_file.name
            pdf_file.rename(sorted_pdf_path)
            print(f"Uploaded and stored {pdf_file.name} to {unit_Code}")

    for folder in INDIVIDUAL_FOLDER.iterdir():
        for pdf_file in folder.glob("*.pdf"):
            unit_Code=folder.name
            if unit_Code:
                unit_folder=SORTED_FOLDER/unit_Code
                unit_folder.mkdir(exist_ok=True,parents=True)
                cloudinary_url=upload_pdf_to_cloudinary(str(pdf_file),unit_Code)
                if cloudinary_url:
                    unit,created=UnitProfile.objects.get_or_create(unitCode=unit_Code,defaults={"unitTitle":unit_Code})
                    UnitPdf.objects.create(
                        unit=unit,
                        pdfTitle=pdf_file.stem,
                        pdfDownloadLink=cloudinary_url,
                        pdfSize=os.path.getsize(pdf_file)//1024,
                        pdfPageCount=extract_pdf_page_count(pdf_file),
                        pdfDate=date.today()
                    )
                sorted_pdf_path=unit_folder/pdf_file.name
                pdf_file.rename(sorted_pdf_path)
                print(f"Uploaded and stored {pdf_file.name} to {unit_Code}")



#Nursing Files Sortings
unit_mapping = {
    "Gross Anatomy": "RCH 101",
    "Systemic Anatomy": "RCH 102",
    "Anatomy (Head, Neck, Upper Limbs & Thorax)": "RCH 106",
    "Anatomy (Abdomen, Back, Pelvis & Lower Limbs)": "RCH 107",
    "Physiology of the Cell & Excitable Tissue": "RMS 101",
    "Physiology of the Nervous System": "RMS 102",
    "Introduction to Embryology": "RCH 111",
    "Development of Organs and Systems": "RCH 112",
    "Professionalism in Nursing": "RMS 106",
    "Nursing Theories and Reflective Practice": "RMS 107",
    "Biochemistry (Structures and Function of Biomolecules)": "RMS 110",
    "Biochemistry (Bioenergetics and Metabolism)": "RMS 115",
    "Physiology (Endocrine & Reproductive system)": "RMS 121",
    "Physiology of Digestive System": "RMS 122",
    "Physiology of Circulatory System": "RMS 126",
    "Physiology of the Respiratory & Renal system": "RMS 127",
    "Introduction to Nursing Practice": "RMS 131",
    "Basic Nursing Skills": "RMS 132",
    "Nursing Skills and Documentation": "RMS 133",
    "Introduction to Clinical methods": "RMS 136",
    "Health Assessment of Various Body Systems": "RMS 137",
    "Basic Human Nutrition": "RCH 116",
    "Nutrition in Health & Disease": "RCH 117",
    "Biochemistry (Tissue Metabolism and Integrated metabolism)": "RMS 140",
    "First Aid & Basic Life Support": "RNS 100",
    "Introduction to Medical Microbiology": "RCH 201",
    "Pathogenic Bacteria": "RCH 202",
    "General Pathology": "RMS 201",
    "Hematology": "RMS 202",
    "Clinical Chemistry": "RMS 203",
    "Medical Surgical Nursing (Respiratory System)": "RMS 206",
    "Medical Surgical Nursing (Cardiovascular & Hematological Systems)": "RMS 207",
    "Fundamentals of Clinical Pharmacology": "RMS 211",
    "Drugs that Act on the Nervous System": "RMS 212",
    "Introduction to Community Health": "RCH 206",
    "Maternal Child Health and Family Planning": "RCH 207",
    "Medical Mycology & Virology": "RCH 221",
    "Immunology": "RCH 222",
    "Medical Surgical Nursing (Neurological System)": "RMS 216",
    "Medical Surgical Nursing (Musculoskeletal System)": "RMS 217",
    "Medical Surgical Nursing (Gastrointestinal and Genital-urinary System)": "RMS 221",
    "Medical Surgical Nursing (Endocrine System)": "RMS 222",
    "Drugs Acting on Various Body Systems": "RMS 226",
    "Chemotherapeutic Agents": "RMS 227",
    "Fundamentals of Midwifery and Preconception Care": "RCH 226",
    "Normal Pregnancy": "RCH 227",
    "Normal Labour & Birth": "RCH 231",
    "Normal Puerperium": "RCH 232",
    "Principles of Human Psychology": "RMS 230"
}

def clean_text(text):
    """
    Cleans folder name by removing doctor names, underscores, special characters, and extra spaces.
    """
    text = re.sub(r'_.*$', '', text)  # Remove everything after first underscore
    text = re.sub(r'[^\w\s]', '', text)  # Remove special characters
    text = re.sub(r'\s+', ' ', text).strip().lower()  # Normalize spaces & lowercase
    return text
def clean_folderName(text):
    """
    Cleans folder name by removing doctor names, underscores, and extra characters.
    """
    text = re.sub(r'_.*$', '', text)  # Remove everything after first underscore
    text = re.sub(r'[^\w\s]', '', text)  # Remove special characters
    return text

def Sort_Nursing_Files():
    reverse_unit_mapping = {v: k for k, v in unit_mapping.items()}
    
    for folder in NURSING_FOLDER.iterdir():
        if folder.is_dir():
            # Try to match folder name with unit titles in unit_mapping
            folder_name = folder.name
            best_match = None
            
            # Look for direct matches in unit_mapping keys
            for unit_title, unit_code in unit_mapping.items():
                if unit_title.lower() in folder_name.lower() or folder_name.lower() in unit_title.lower():
                    best_match = unit_code
                    break
            
            if not best_match:
                print(f"Could not find unit code for folder {folder.name}")
                continue
                
            unit_code = best_match
            unit_title = reverse_unit_mapping.get(unit_code, folder.name)
            print(f"Processing folder: {folder.name} -> {unit_code} ({unit_title})")
            
            for file in folder.iterdir():
                if file.suffix.lower() in [".doc", ".docx", ".ppt", ".pptx"]:
                    new_pdf = convert_to_pdf(file)
                    if new_pdf:
                        file.unlink()

            
            for pdf_file in folder.glob("*.[Pp][Dd][Ff]"):
                unit_folder = SORTED_FOLDER / unit_code
                unit_folder.mkdir(exist_ok=True, parents=True)
                folder_name=clean_folderName(folder.name)
                cloudinary_url = upload_pdf_to_cloudinary(str(pdf_file), unit_code)
                if cloudinary_url:
                    unit, created = UnitProfile.objects.get_or_create(unitCode=unit_code,defaults={"unitTitle": unit_title})
                    UnitPdf.objects.create(
                        unit=unit,
                        pdfTitle=pdf_file.stem,
                        pdfDownloadLink=cloudinary_url,
                        pdfSize=os.path.getsize(pdf_file) // 1024,
                        pdfPageCount=extract_pdf_page_count(pdf_file),
                        pdfDate=date.today()
                    )
                sorted_pdf_path = unit_folder / pdf_file.name
                pdf_file.rename(sorted_pdf_path)
                print(f"Uploaded and stored {pdf_file.name} to {unit_code}")
            

def clean_units_column():
    for unit in UnitProfile.objects.all():
        if unit.unitCode:
            cleaned_unit = unit.unitCode.replace(" ", "")  # Remove spaces
            if cleaned_unit != unit.unitCode:  # Only update if changed
                unit.unitCode = cleaned_unit
                unit.save()
    print("Database units column cleaned successfully.")

def correct_available_units():
    reverse_unit_mapping = {v: k for k, v in unit_mapping.items()}
    for unit in UnitProfile.objects.all():
        if unit.unitCode in reverse_unit_mapping:
            unit.unitTitle = reverse_unit_mapping[unit.unitCode]
            unit.save()
    print("Available units corrected successfully.")
if __name__ == "__main__":
    sort_pdfs()
    clean_database()
    # Sort_Nursing_Files()
    # correct_available_units()
    # clean_units_column()
