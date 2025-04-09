from django.db import models
from cloudinary.models import CloudinaryField

class UnitProfile(models.Model):
    unitTitle = models.CharField(max_length=100,blank=True)
    unitCode = models.CharField(max_length=10, unique=True, db_index=True)

    def __str__(self):
        return f"{self.unitCode} - {self.unitTitle}"

class UnitPdf(models.Model):
    unit = models.ForeignKey(UnitProfile, on_delete=models.CASCADE, related_name="pdfs")
    pdfTitle = models.CharField(max_length=1000)
    pdfFile = CloudinaryField('pdfs/')
    pdfDownloadLink = models.URLField(max_length=2000, blank=True, null=True)
    pdfPageCount = models.IntegerField(null=True, blank=True)
    pdfSize = models.IntegerField(help_text="Size in KB",blank=True)
    pdfDate = models.DateField(auto_now_add=True)
    uploadedBy = models.CharField(max_length=100, blank=True, null=True,default="Anonymous")

    def __str__(self):
        return f"{self.pdfTitle} ({self.unit.unitCode})"
    

from django.conf import settings # To link to the User model correctly
class ExamPaper(models.Model):
    """
    Represents a single uploaded exam paper file stored in Backblaze B2.
    """

    # --- Information from Metadata ---
    unit_code = models.CharField(
        max_length=50,
        db_index=True, # Index for faster lookups by unit code
        help_text="The unit code (e.g., SMA191, UCU112). Should match the 'originalCode' if available."
    )
    title = models.CharField(
        max_length=255,
        blank=True, # Optional field
        null=True,
        help_text="The title of the unit (optional)."
    )
    year = models.PositiveSmallIntegerField(
        blank=True, # Assuming year/semester might sometimes be missing from metadata
        null=True,
        help_text="Year of study (e.g., 1, 2, 3, 4)."
    )
    SEMESTER_CHOICES = [
        (1, 'Semester 1'),
        (2, 'Semester 2'),
    ]
    semester = models.PositiveSmallIntegerField(
        choices=SEMESTER_CHOICES,
        blank=True, # Assuming year/semester might sometimes be missing from metadata
        null=True,
        help_text="Semester (1 or 2)."
    )

    # --- File Specific Information ---
    original_filename = models.CharField(
        max_length=255,
        help_text="The original filename as uploaded by the user."
    )
    content_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="The MIME type of the uploaded file (e.g., 'image/jpeg')."
    )
    size = models.BigIntegerField(
        blank=True, # Size might not always be perfectly captured or needed
        null=True,
        help_text="File size in bytes."
    )


    # --- B2 Storage Information ---
    b2_file_path = models.CharField(
        max_length=1024, # B2 object names can be long
        unique=True, # Each record should correspond to a unique file path in B2
        db_index=True,
        help_text="The full path/object name of the file in the B2 bucket (e.g., 'exam_papers/SMA_191/uuid_xyz.jpg')."
    )
    b2_file_id = models.CharField(
        max_length=100, # Adjust if B2 file IDs have a different length
        unique=True, # B2 File IDs are unique
        blank=True, # May not be available immediately or if upload fails mid-process
        null=True,
        help_text="The unique File ID assigned by Backblaze B2 upon upload."
    )

    # --- Tracking Information ---
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, # Keep paper record if user is deleted, set uploader to NULL
        null=True, # Allow anonymous uploads if request.user is AnonymousUser
        blank=True,
        related_name='uploaded_papers', # How to access papers from a User instance (user.uploaded_papers.all())
        help_text="The user who uploaded this paper (optional)."
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True, # Automatically set when the record is first created
        help_text="Timestamp when the paper was uploaded."
    )
