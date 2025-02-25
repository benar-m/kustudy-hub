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
    pdfPageCount = models.IntegerField()
    pdfSize = models.IntegerField(help_text="Size in KB",blank=True)
    pdfDate = models.DateField(auto_now_add=True)
    uploadedBy = models.CharField(max_length=100, blank=True, null=True,default="Anonymous")

    def __str__(self):
        return f"{self.pdfTitle} ({self.unit.unitCode})"
