from django.shortcuts import render
from core.models import UnitProfile, UnitPdf
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from DocSort.sort_pdfs import upload_pdf_to_cloudinary,extract_pdf_page_count
from datetime import date
from django.views.decorators.csrf import csrf_exempt
import fitz
from django.conf import settings
import os


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


@csrf_exempt
def multipleFileUploads(request):
    if request.method=='POST' and request.FILES.getlist('files'):
        uploaded_files = request.FILES.getlist('files')  # Get multiple files
        save_dir = os.path.join(settings.MEDIA_ROOT, 'unsorted_pdfs')  # Store in media/uploads/

        os.makedirs(save_dir, exist_ok=True)  # Ensure directory exists

        file_urls = []
        for file in uploaded_files:
            file_path = os.path.join(save_dir, file.name)
            
            # Save file to disk
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            file_urls.append(f"{settings.MEDIA_URL}uploads/{file.name}")

        return JsonResponse({'message': 'Files uploaded successfully!', 'files': file_urls})

    return JsonResponse({'error': 'Invalid request'}, status=400)
