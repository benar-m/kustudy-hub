from django.shortcuts import render
from core.models import UnitProfile, UnitPdf
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from DocSort.sort_pdfs import upload_pdf_to_cloudinary,extract_pdf_page_count
from datetime import date
from django.views.decorators.csrf import csrf_exempt
import fitz
import os
import re
import fitz
import cloudinary.uploader
from django.conf import settings


def get_units(request):
    units = UnitProfile.objects.all().values("id","unitCode","unitTitle")
    return JsonResponse(list(units),safe=False)

def get_pdfs_by_unit(request,unit_id):
    unit=get_object_or_404(UnitProfile,id=unit_id)
    pdfs=UnitPdf.objects.filter(unit=unit).values('id','pdfTitle','pdfDownloadLink','pdfPageCount','pdfSize','pdfDate','uploadedBy')
    return JsonResponse(list(pdfs),safe=False)

def render_home(request):
    return render(request, 'core/home.html')

def render_upload_pdf(request):
    return render(request, 'core/upload.html')

def render_units(request):
    return render(request, 'core/units.html')

def fetch_unit_code(unit_id):
    unit = get_object_or_404(UnitProfile, id=unit_id)
    return unit.unitCode

@csrf_exempt
def single_upload_pdf(request):
    if request.method == 'POST':
        pdf_file = request.FILES.get("pdf")
        
        if not pdf_file:
            return JsonResponse({"message": "No PDF file provided"}, status=400)

        try:
            unit_code = request.POST.get("unitCode")
            if not unit_code:
                return JsonResponse({"message": "Unit code is required"}, status=400)

            # Upload file and get download link
            DownloadLink = upload_pdf_to_cloudinary(pdf_file, unit_code)
            #check if Unit Exists and create if not
            if not UnitProfile.objects.filter(unitCode=unit_code).exists():
                unit = UnitProfile.objects.create(unitCode=unit_code)


            # Save to database
            unit_pdf = UnitPdf.objects.create(
                unit=UnitProfile.objects.get(unitCode=unit_code),
                pdfTitle=pdf_file.name,
                pdfDownloadLink=DownloadLink,
                pdfSize=pdf_file.size,
                pdfPageCount=extract_pdf_page_count(pdf_file),
                pdfDate=date.today()
            )
        

            return JsonResponse({"message": "PDF uploaded successfully"}, status=201)

        except Exception as error:
            return JsonResponse({"message": f"PDF upload failed: {error}"}, status=400)

    # Handle non-POST requests
    return JsonResponse({"message": "Invalid request method"}, status=405)



UNIT_CODE_PATTERN = r'([A-Za-z]{3,4})\s*[_-]?\s*(\d{3})'

def direct_code_extraction(fileName):
    """Extract unit code from filename"""
    match = re.search(UNIT_CODE_PATTERN, fileName)
    return f"{match.group(1).upper()}{match.group(2)}" if match else None

def extract_text_inside_pdf(pdf):
    """Extracts text from the first 3 pages of a PDF"""
    try:
        pdfDoc = fitz.open(stream=pdf.read(), filetype="pdf")  # Open in-memory
        text = "".join([pdfDoc[page_num].get_text() for page_num in range(min(3, len(pdfDoc)))])
        pdfDoc.close()
        return text
    except Exception as e:
        return None

def extract_unit_code_from_pdf(pdf):
    """Extract unit code from PDF text"""
    return direct_code_extraction(extract_text_inside_pdf(pdf))

def upload_pdf_to_cloudinary(pdf, folder_name):
    """Upload PDF directly to Cloudinary"""
    try:
        response = cloudinary.uploader.upload(
            pdf,
            folder=f"kuStudyHub/{folder_name}",
            resource_type="auto",
        )
        return response["secure_url"]
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
        return None

def extract_pdf_page_count(pdf):
    """Extract number of pages in a PDF"""
    try:
        pdfDoc = fitz.open(stream=pdf.read(), filetype="pdf")
        return pdfDoc.page_count
    except Exception as e:
        return None

@csrf_exempt
def multipleFileUploads(request):
    if request.method == 'POST' and request.FILES.getlist('files'):
        uploaded_files = request.FILES.getlist('files')  # Get multiple files

        file_urls = []
        for file in uploaded_files:
            unit_Code = direct_code_extraction(file.name) or extract_unit_code_from_pdf(file)

            if unit_Code:
                cloudinary_url = upload_pdf_to_cloudinary(file, unit_Code)

                if cloudinary_url:
                    unit, _ = UnitProfile.objects.get_or_create(unitCode=unit_Code, defaults={"unitTitle": unit_Code})
                    UnitPdf.objects.create(
                        unit=unit,
                        pdfTitle=file.name,
                        pdfDownloadLink=cloudinary_url,
                        pdfSize=file.size // 1024,  # Convert to KB
                        pdfPageCount=extract_pdf_page_count(file),
                        pdfDate=date.today()
                    )

                    file_urls.append(cloudinary_url)

        return JsonResponse({'message': 'Files processed and uploaded!', 'files': file_urls})

    return JsonResponse({'error': 'Invalid request'}, status=400)
