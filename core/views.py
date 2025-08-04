from django.shortcuts import render
from core.models import UnitProfile, UnitPdf
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from datetime import date
from django.views.decorators.csrf import csrf_exempt
import fitz
import os
import re
import cloudinary.uploader
from django.conf import settings
import logging
import json
import uuid
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.http import require_POST
from b2sdk.v2 import B2Api, InMemoryAccountInfo # Import base B2Error from the v2 API module
from b2sdk.v2.exception import NonExistentBucket,B2Error
logger = logging.getLogger(__name__)
from .models import UnitProfile, UnitPdf, ExamPaper

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

    return JsonResponse({"message": "Invalid request method"}, status=405)



UNIT_CODE_PATTERN = r'([A-Za-z]{3,4})\s*[_-]?\s*(\d{3})'

def direct_code_extraction(fileName):
    """Extract unit code from filename"""
    match = re.search(UNIT_CODE_PATTERN, fileName)
    return f"{match.group(1).upper()}{match.group(2)}" if match else None

def extract_text_inside_pdf(pdf):
    """Extracts text from the first 3 pages of a PDF"""
    try:
        pdfDoc = fitz.open(stream=pdf.read(), filetype="pdf")
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
        uploaded_files = request.FILES.getlist('files')

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
                        pdfSize=file.size // 1024,
                        pdfPageCount=extract_pdf_page_count(file),
                        pdfDate=date.today()
                    )

                    file_urls.append(cloudinary_url)

        return JsonResponse({'message': 'Files processed and uploaded!', 'files': file_urls})

    return JsonResponse({'error': 'Invalid request'}, status=400)



@require_POST
@csrf_exempt
def upload_exam_papers_view(request):
    """
    Handles POST requests to upload exam paper files, grouped by unit code,
    to Backblaze B2 storage. Expects files under keys like 'files_UNITCODE'
    and optional metadata under 'metadata_UNITCODE'.
    """
    uploaded_file_details = []
    errors = []
    processed_unit_codes = set()

    b2_key_id = getattr(settings, 'B2_APPLICATION_KEY_ID', None)
    b2_key = getattr(settings, 'B2_APPLICATION_KEY', None)
    b2_bucket_name = getattr(settings, 'B2_BUCKET_NAME', None)
    b2_base_folder = getattr(settings, 'B2_UPLOAD_FOLDER', 'uploads/')

    if not all([b2_key_id, b2_key, b2_bucket_name]):
        logger.error("B2 configuration missing in Django settings (B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME).")
        return JsonResponse({'status': 'error', 'message': 'Server configuration error: Storage not configured.'}, status=500)

    try:
        logger.info("Initializing B2 API.")
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", b2_key_id, b2_key)
        logger.info(f"Attempting to get B2 bucket: {b2_bucket_name}")
        bucket = b2_api.get_bucket_by_name(b2_bucket_name)
        logger.info(f"Successfully accessed B2 bucket: {b2_bucket_name}")
    except NonExistentBucket:
         logger.error(f"B2 Bucket '{b2_bucket_name}' not found.", exc_info=True)
         return JsonResponse({'status': 'error', 'message': f"Server configuration error: B2 Bucket '{b2_bucket_name}' not found."}, status=500)
    except B2Error as e:
        logger.error(f"B2 API Error during initialization or bucket access: {e}", exc_info=True)
        return JsonResponse({'status': 'error', 'message': 'Error connecting to storage service.'}, status=500)
    except Exception as e:
        logger.error(f"Unexpected error during B2 initialization: {e}", exc_info=True)
        return JsonResponse({'status': 'error', 'message': 'An unexpected server error occurred during storage initialization.'}, status=500)

    if not request.FILES:
        logger.warning("Upload request received with no files.")
        return HttpResponseBadRequest("No files were submitted in the request.")

    file_key_prefix = "files_"
    metadata_key_prefix = "metadata_"

    for file_key in request.FILES.keys():
        if not file_key.startswith(file_key_prefix):
            logger.warning(f"Skipping unexpected file key in request: {file_key}")
            continue

        sanitized_unit_code = file_key[len(file_key_prefix):]

        if not sanitized_unit_code:
             logger.warning(f"Could not extract unit code from file key: {file_key}")
             errors.append({'key': file_key, 'error': 'Invalid file key format.'})
             continue

        if sanitized_unit_code in processed_unit_codes:
             continue
        processed_unit_codes.add(sanitized_unit_code)

        files_for_unit = request.FILES.getlist(file_key)
        if not files_for_unit:
            logger.warning(f"No files found for key {file_key}, though key exists.")
            continue

        metadata_key = f"{metadata_key_prefix}{sanitized_unit_code}"
        metadata_str = request.POST.get(metadata_key)
        metadata = {}
        original_code = sanitized_unit_code

        if metadata_str:
            try:
                metadata = json.loads(metadata_str)
                original_code = metadata.get('originalCode', sanitized_unit_code)
                logger.info(f"Parsed metadata for {sanitized_unit_code}: {metadata}")
            except json.JSONDecodeError:
                logger.warning(f"Could not decode JSON metadata for key {metadata_key}. String was: '{metadata_str}'")
                errors.append({'unit_code': sanitized_unit_code, 'error': 'Invalid metadata format received.'})
            except Exception as e:
                 logger.error(f"Error processing metadata for {metadata_key}: {e}", exc_info=True)
                 errors.append({'unit_code': sanitized_unit_code, 'error': f'Error processing metadata: {e}'})

        for f in files_for_unit:
            try:
                f.seek(0)
                file_data = f.read()
                original_filename = f.name
                content_type = f.content_type or 'application/octet-stream'

                unique_suffix = f"{uuid.uuid4()}_{original_filename}"
                b2_object_name_parts = [b2_base_folder.strip('/'), sanitized_unit_code, unique_suffix]
                b2_object_name = "/".join(part for part in b2_object_name_parts if part)

                logger.info(f"Uploading file '{original_filename}' for unit '{original_code}' to B2 path: {b2_object_name}")

                uploaded_b2_file_info = bucket.upload_bytes(
                    data_bytes=file_data,
                    file_name=b2_object_name,
                    content_type=content_type
                )

                try:
                    paper_title = metadata.get('title', None)

                    paper_year_str = metadata.get('year', None)
                    paper_year = None
                    if paper_year_str:
                        try:
                            paper_year = int(paper_year_str)
                        except (ValueError, TypeError):
                            logger.warning(f"Could not convert year '{paper_year_str}' to integer for unit {original_code}. Saving as NULL.")
                            errors.append({'unit_code': original_code, 'filename': f.name, 'warning': f'Invalid year value received: {paper_year_str}'})


                    paper_semester_str = metadata.get('semester', None)
                    paper_semester = None
                    if paper_semester_str:
                        try:
                            paper_semester = int(paper_semester_str)
                            if paper_semester not in [choice[0] for choice in ExamPaper.SEMESTER_CHOICES]:
                                logger.warning(f"Invalid semester value '{paper_semester}' received for unit {original_code}. Saving as NULL.")
                                errors.append({'unit_code': original_code, 'filename': f.name, 'warning': f'Invalid semester value received: {paper_semester_str}'})
                                paper_semester = None
                        except (ValueError, TypeError):
                            logger.warning(f"Could not convert semester '{paper_semester_str}' to integer for unit {original_code}. Saving as NULL.")
                            errors.append({'unit_code': original_code, 'filename': f.name, 'warning': f'Invalid semester value received: {paper_semester_str}'})

                    uploader_user = None
                    if request.user.is_authenticated:
                        uploader_user = request.user

                    paper_record = ExamPaper.objects.create(
                        unit_code=original_code,
                        title=paper_title,
                        year=paper_year,
                        semester=paper_semester,
                        original_filename=original_filename,
                        content_type=content_type,
                        size=f.size,
                        b2_file_path=b2_object_name,
                        b2_file_id=uploaded_b2_file_info.id_,
                        uploader=uploader_user
                    )
                    logger.info(f"Successfully saved DB record for {b2_object_name} with ID {paper_record.id}")

                    upload_detail = {
                        'db_id': paper_record.id,
                        'unit_identifier': original_code,
                        'sanitized_code': sanitized_unit_code,
                        'original_filename': original_filename,
                        'b2_object_name': b2_object_name,
                        'b2_file_id': uploaded_b2_file_info.id_,
                        'size': f.size,
                        'content_type': content_type,
                        'metadata': metadata
                    }
                    uploaded_file_details.append(upload_detail)

                except Exception as db_exc:
                    logger.error(f"Database Error saving record for B2 file {b2_object_name} (Unit: {original_code}, File: {original_filename}): {db_exc}", exc_info=True)
                    errors.append({
                        'unit_code': original_code,
                        'filename': original_filename,
                        'error': f'Database saving error: {db_exc}'
                    })

            except B2Error as e:
                logger.error(f"B2 Upload Error for {sanitized_unit_code}/{f.name}: {e}", exc_info=True)
                errors.append({
                    'unit_code': original_code,
                    'filename': f.name,
                    'error': f'Storage upload error: {e}'
                })
            except Exception as e:
                logger.error(f"General Error processing file {sanitized_unit_code}/{f.name}: {e}", exc_info=True)
                errors.append({
                    'unit_code': original_code,
                    'filename': f.name,
                    'error': f'Server processing error: {e}'
                })

    if errors and not uploaded_file_details:
        logger.error(f"Upload request failed. Errors: {errors}")
        return JsonResponse({
            'status': 'error',
            'message': 'File upload failed for all items.',
            'errors': errors
        }, status=400)
    elif errors:
        logger.warning(f"Upload partially succeeded. Uploaded: {len(uploaded_file_details)}, Errors: {errors}")
        return JsonResponse({
            'status': 'partial_success',
            'message': f'Successfully uploaded {len(uploaded_file_details)} file(s), but some errors occurred.',
            'uploaded': uploaded_file_details,
            'errors': errors
        }, status=207)
    else:
        logger.info(f"Successfully uploaded {len(uploaded_file_details)} file(s).")
        return JsonResponse({
            'status': 'success',
            'message': f'Successfully uploaded {len(uploaded_file_details)} file(s).',
            'uploaded': uploaded_file_details
        }, status=201)



def render_search_console_verifier(request):
    return render(request, 'core/googlefd298c7641c3b2af.html')

def render_reader(request):
    return render(request, 'core/pdf-reader.html')

def render_examuploader(request):
    return render(request, 'core/examuploads.html')