document.addEventListener('DOMContentLoaded', () => {
    const uploadModeToggle = document.getElementById('uploadModeToggle');
    const singleUploadForm = document.getElementById('singleUploadForm');
    const batchUploadForm = document.getElementById('batchUploadForm');
    const singleFileArea = document.getElementById('singleFileArea');
    const batchFileArea = document.getElementById('batchFileArea');
    const singleFileUpload = document.getElementById('singleFileUpload');
    const batchFileUpload = document.getElementById('batchFileUpload');
    const fileList = document.getElementById('fileList');

    // Toggle between single and batch upload modes
    uploadModeToggle.addEventListener('change', () => {
        if (uploadModeToggle.checked) {
            singleUploadForm.classList.remove('active');
            batchUploadForm.classList.add('active');
        } else {
            singleUploadForm.classList.add('active');
            batchUploadForm.classList.remove('active');
        }
    });

    // Single file upload handling
    singleFileArea.addEventListener('click', () => singleFileUpload.click());
    
    singleFileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (validateFile(file)) {
                updateUploadArea(singleFileArea, file.name);
            } else {
                singleFileUpload.value = '';
            }
        }
    });

    // Batch file upload handling
    batchFileArea.addEventListener('click', () => batchFileUpload.click());
    
    batchFileUpload.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleBatchFiles(files);
    });

    // Drag and drop handling
    [singleFileArea, batchFileArea].forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            if (area === singleFileArea) {
                if (files.length > 0 && validateFile(files[0])) {
                    singleFileUpload.files = e.dataTransfer.files;
                    updateUploadArea(singleFileArea, files[0].name);
                }
            } else {
                handleBatchFiles(files);
            }
        });
    });

    // Form submissions
    singleUploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Add your form submission logic here
        console.log('Single file upload submitted');
    });

    batchUploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Add your form submission logic here
        console.log('Batch upload submitted');
    });

    // Helper functions
    function validateFile(file) {
        if (!file.type.includes('pdf')) {
            alert('Please upload PDF files only');
            return false;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('File size should not exceed 10MB');
            return false;
        }
        return true;
    }

    function updateUploadArea(area, fileName) {
        const content = area.querySelector('.upload-content');
        content.innerHTML = `
            <i class="fas fa-file-pdf"></i>
            <p>${fileName}</p>
            <button type="button" class="browse-btn">Change File</button>
        `;
    }

    function handleBatchFiles(files) {
        if (files.length > 10) {
            alert('Maximum 10 files allowed for batch upload');
            return;
        }

        fileList.innerHTML = '';
        files.forEach(file => {
            if (validateFile(file)) {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <span>${file.name}</span>
                    <i class="fas fa-times remove-file"></i>
                `;
                fileList.appendChild(fileItem);

                // Add remove file functionality
                fileItem.querySelector('.remove-file').addEventListener('click', () => {
                    fileItem.remove();
                });
            }
        });
    }
});