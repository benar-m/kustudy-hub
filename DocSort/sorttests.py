import re
import fitz
def direct_code_extraction(fileName):
    match = re.search(r'([A-Za-z]{3,4})[\s_-]?(\d{3})', fileName)
    if match:
        return f"{match.group(1).upper()}{match.group(2)}"



def extract_text_inside_pdf(pdfPath):
    pdfDoc = fitz.open(pdfPath)
    text = ""
    for page_num in range(3):
        page = pdfDoc[page_num]
        text += page.get_text()
    pdfDoc.close()
    return text
def extract_unit_code_from_pdf(pdfPath):
    text = extract_text_inside_pdf(pdfPath)
    return direct_code_extraction(text)

pdfPath='/home/benar/Project5/Kupdfs/KuStudyhub/a.pdf'
print(extract_unit_code_from_pdf(pdfPath))