from django.shortcuts import render
from core.models import UnitProfile, UnitPdf
from django.http import JsonResponse
from django.shortcuts import get_object_or_404


def get_units(request):
    units = UnitProfile.objects.all()
    return JsonResponse(list(units),safe=False)

def get_pdfs_by_unit(request,unit_id):
    unit=get_object_or_404(UnitProfile,id=unit_id)
    pdfs=UnitPdf.objects.filter(unit=unit).values('id','pdfTitle','pdfDownloadLink','pdfPageCount','pdfSize','pdfDate','uploadedBy')
    return JsonResponse(list(pdfs),safe=False)

def render_home(request):
    return render(request, 'core/home.html')

def render_upload_pdf(request):
    return render(request, 'core/upload.html')