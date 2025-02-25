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


UNSORTED_FOLDER=Path(settings.BASE_DIR)/"media"/'unsorted_pdfs'
SORTED_FOLDER=Path(settings.BASE_DIR)/"media"/'sorted_pdfs'

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
        for page_num in range(3):
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
        print(f"Cloadinary upload failed: {e}")
        return None
def extract_pdf_page_count(pdfPath):
    try:
        pdfDoc = fitz.open(pdfPath)
        return pdfDoc.page_count
    except Exception as e:
        return None

def sort_pdfs():
    for pdf_file in UNSORTED_FOLDER.glob("*.pdf" or "*.PDF" or "*.Pdf" or "*.pDf" or "*.pdF" or "*.PDf" or "*.pDF" or "*.PdF" or "*..pdf" or "*.pDf" or "*.pdF" or "*.PDf" or "*.pDF" or "*.PdF" or "*..pdf"):
        unit_Code=direct_code_extraction(pdf_file.name)

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



        

if __name__ == "__main__":
    sort_pdfs()
        
