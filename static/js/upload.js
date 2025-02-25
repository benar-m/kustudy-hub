document.addEventListener('DOMContentLoaded', () => {

    const singleUploadForm = document.getElementById('singleUploadForm');
    const singleFileUpload = document.getElementById('singleFileUpload');
    const singleFileArea = document.getElementById('singleFileArea');
    const loader= document.querySelector('.loader');
    loader.style.display = 'none';

    // Single file area click triggers file input
    singleFileArea.addEventListener('click', () => singleFileUpload.click());

    // Show selected file name
    singleFileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && validateFile(file)) {
            updateUploadArea(singleFileArea, file.name);
        } else {
            singleFileUpload.value = ''; // Reset invalid file
        }
    });

    document.getElementById('singleUploadButton').addEventListener('click', async () => {
        console.log("Single file upload button clicked!");
    
        const unitCode = document.getElementById('unitCode').value.trim();
        const unitTitle = document.getElementById('unitTitle').value.trim();
        const documentType = document.getElementById('documentType').value;
        const pdf = singleFileUpload.files[0];
    
        if (!unitCode || !unitTitle || !documentType || !pdf) {
            alert('All fields are required');
            return;
        }
        if (!validateFile(pdf)) {
            return;
        }
    
        const formData = new FormData();
        formData.append('unitCode', unitCode);
        formData.append('unitTitle', unitTitle);
        formData.append('documentType', documentType);
        formData.append('pdf', pdf);
        
        try {
            console.log("Sending file...");
            loader.style.display = 'block';
            const res = await fetch('/api/upload_pdf/', {
                method: 'POST',
                body: formData
            });
    
            console.log("Response received:", res);
    
            const data = await res.json();
            loader.style.display = 'none';
            updateUploadArea(singleFileArea, 'Choose a file');

            if (data.status === '201') {
                alert('File uploaded successfully');
                singleUploadForm.reset();
                updateUploadArea(singleFileArea, 'Choose a file');
            }

        } catch (err) {
            console.error("Upload failed:", err);
            alert('An error occurred. Please try again');
        }
    });
    


    // Helper function: Validate file
    function validateFile(file) {
        if (!file.type.includes('pdf')) {
            alert('Only PDF files are allowed');
            return false;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('File size should not exceed 10MB');
            return false;
        }
        return true;
    }

    // Helper function: Update upload area with file name
    function updateUploadArea(area, fileName) {
        const content = area.querySelector('.upload-content');
        content.innerHTML = `
            <i class="fas fa-file-pdf"></i>
            <p>${fileName}</p>
            <button type="button" class="browse-btn">Change File</button>
        `;
    }
});
