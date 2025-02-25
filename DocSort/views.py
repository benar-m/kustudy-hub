from django.shortcuts import render
import os
import re
import fitz

def direct_code_extraction(fileName):
    pattern=r'[A-Z]{3}\d{3}'
    match=re.search(pattern,fileName.upper())
    return map.group() if match else None




# Create your views here.
