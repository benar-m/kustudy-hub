document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const uploadItemsContainer = document.getElementById('upload-items-container');
    const uploadButtonContainer = document.getElementById('upload-button-container');
    const uploadButton = document.getElementById('upload-button');
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = progressContainer.querySelector('.progress-fill');
    const progressText = progressContainer.querySelector('.progress-text');
    const successMessageContainer = document.getElementById('success-message');
    const uploadMoreButton = document.getElementById('upload-more-btn');
    let uploadItemCount = 1;

    // --- Helper Functions ---

    /**
     * Retrieves the CSRF token from cookies (standard Django method).
     * @returns {string|null} The CSRF token or null if not found.
     */
    function getCsrfToken() {
        let csrfToken = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.startsWith('csrftoken=')) {
                    csrfToken = decodeURIComponent(cookie.substring('csrftoken='.length));
                    break;
                }
            }
        }
        return csrfToken;
    }

    /**
     * Sanitizes a string to be safe for use as part of a B2 path/key.
     * Allows alphanumeric, underscore, hyphen. Replaces others with underscore.
     * @param {string} code - The original unit code.
     * @returns {string} The sanitized code.
     */
    function sanitizeUnitCode(code) {
        if (!code) return '';
        // Replace sequences of invalid characters with a single underscore
        return code.trim().replace(/[^a-zA-Z0-9_-]+/g, '_');
    }

    /**
     * Creates a DOM element for a file preview.
     * @param {File} file - The file object.
     * @returns {HTMLElement} The preview element.
     */
    function createFilePreviewElement(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        // Determine icon based on file type
        let icon = 'fa-file';
        if (file.type.includes('pdf')) {
            icon = 'fa-file-pdf';
        } else if (file.type.includes('image')) {
            icon = 'fa-file-image';
        } else if (file.type.includes('word')) {
            icon = 'fa-file-word';
        }
        
        // Truncate filename if too long
        let fileName = file.name;
        if (fileName.length > 20) {
            const extension = fileName.split('.').pop();
            fileName = fileName.substring(0, 17) + '...' + (extension ? '.' + extension : '');
        }
        
        fileItem.innerHTML = `
            <i class="fas ${icon}"></i>
            <span title="${file.name}">${fileName}</span>
            <span class="remove-file"><i class="fas fa-times"></i></span>
        `;
        
        // Add remove file functionality
        const removeButton = fileItem.querySelector('.remove-file');
        removeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            fileItem.remove();
            
            // Check if this was the last file in the preview
            const parentPreview = fileItem.closest('.file-preview');
            if (parentPreview && parentPreview.children.length === 0) {
                const uploadItem = parentPreview.closest('.upload-item');
                const unitInfo = uploadItem.querySelector('.unit-info');
                unitInfo.style.display = 'none';
                
                // Check if any other item has files
                const anyFilesSelected = Array.from(uploadItemsContainer.querySelectorAll('.file-input'))
                    .some(input => input.files.length > 0);
                    
                if (!anyFilesSelected) {
                    uploadButtonContainer.style.display = 'none';
                }
            }
        });
        
        return fileItem;
    }

    /**
     * Resets a single upload item to its initial state.
     * @param {HTMLElement} item - The .upload-item element.
     */
    function resetUploadItem(item) {
        const fileInput = item.querySelector('.file-input');
        const filePreview = item.querySelector('.file-preview');
        const unitInfo = item.querySelector('.unit-info');
        const unitCodeInput = item.querySelector('.unit-code');
        const unitTitleInput = item.querySelector('.unit-title');
        const unitYearSelect = item.querySelector('.unit-year');
        const unitSemesterSelect = item.querySelector('.unit-semester');

        if (fileInput) fileInput.value = ''; // Clear selected files
        if (filePreview) filePreview.innerHTML = ''; // Clear previews
        if (unitInfo) unitInfo.style.display = 'none'; // Hide unit info
        if (unitCodeInput) {
            unitCodeInput.value = '';
            unitCodeInput.classList.remove('error');
        }
        if (unitTitleInput) unitTitleInput.value = '';
        if (unitYearSelect) {
            unitYearSelect.selectedIndex = 0;
            unitYearSelect.classList.remove('error');
        }
        if (unitSemesterSelect) {
            unitSemesterSelect.selectedIndex = 0;
            unitSemesterSelect.classList.remove('error');
        }
    }

    /**
     * Resets the entire form to allow more uploads.
     */
    function resetForm() {
        // Reset the form
        uploadItemsContainer.innerHTML = '';
        uploadItemCount = 0;
        addNewUploadItem();
        
        // Reset visibility
        successMessageContainer.style.display = 'none';
        uploadButtonContainer.style.display = 'none';
        progressContainer.style.display = 'none';
        uploadItemsContainer.style.display = 'block';
        uploadButton.disabled = false;
        progressBarFill.style.width = '0%';
        progressText.textContent = 'Uploading... 0%';
    }

    /**
     * Adds a new upload item to the container.
     */
    function addNewUploadItem() {
        uploadItemCount++;
        
        const newItem = document.createElement('div');
        newItem.className = 'upload-item';
        newItem.innerHTML = `
            <div class="file-upload-box">
                <input type="file" id="file-upload-${uploadItemCount}" class="file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple>
                <label for="file-upload-${uploadItemCount}" class="file-label">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Click to upload or drag files here</span>
                    <p class="file-types">PDF, DOC, DOCX, JPG, JPEG, PNG</p>
                </label>
                <div class="file-preview"></div>
            </div>
            <div class="unit-info" style="display: none;">
                <div class="unit-header">
                    <h3>Unit Information</h3>
                    <span class="unit-badge">Unit ${uploadItemCount}</span>
                </div>
                <div class="input-group">
                    <label for="unit-code-${uploadItemCount}">Unit Code*</label>
                    <input type="text" id="unit-code-${uploadItemCount}" class="unit-code" placeholder="e.g. COMP3000">
                </div>
                <div class="input-group">
                    <label for="unit-title-${uploadItemCount}">Unit Title (Optional)</label>
                    <input type="text" id="unit-title-${uploadItemCount}" class="unit-title" placeholder="e.g. Software Engineering">
                </div>
                <div class="input-row">
                    <div class="input-group">
                        <label for="unit-year-${uploadItemCount}">Year*</label>
                        <select id="unit-year-${uploadItemCount}" class="unit-year">
                            <option value="">Select Year</option>
                            <option value="1">Year 1</option>
                            <option value="2">Year 2</option>
                            <option value="3">Year 3</option>
                            <option value="4">Year 4</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="unit-semester-${uploadItemCount}">Semester*</label>
                        <select id="unit-semester-${uploadItemCount}" class="unit-semester">
                            <option value="">Select Semester</option>
                            <option value="1">Semester 1</option>
                            <option value="2">Semester 2</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        
        uploadItemsContainer.appendChild(newItem);
        
        // Add event listener to new file input
        const newFileInput = document.getElementById(`file-upload-${uploadItemCount}`);
        newFileInput.addEventListener('change', handleFileChange);
        
        // Setup drag and drop for the new upload box
        setupDragAndDrop(newItem.querySelector('.file-upload-box'));
    }

    /**
     * Updates the file preview and shows unit info for a specific item.
     * @param {Event} event - The file input change event.
     */
    function handleFileChange(event) {
        const fileInput = event.target;
        const uploadItem = fileInput.closest('.upload-item');
        if (!uploadItem) return;

        const filePreview = uploadItem.querySelector('.file-preview');
        const unitInfo = uploadItem.querySelector('.unit-info');
        const files = fileInput.files;

        // Clear previous previews
        filePreview.innerHTML = '';

        if (files.length > 0) {
            // Display previews for selected files
            Array.from(files).forEach(file => {
                const previewElement = createFilePreviewElement(file);
                filePreview.appendChild(previewElement);
            });
            
            // Show unit info section for this item
            unitInfo.style.display = 'block';
            
            // Show the main upload button container
            uploadButtonContainer.style.display = 'block';
            
            // Add new upload item if this is the last one
            if (uploadItem === uploadItemsContainer.lastElementChild) {
                addNewUploadItem();
            }
        } else {
            // Hide unit info if no files are selected
            unitInfo.style.display = 'none';

            // Check if any other item still has files selected
            const anyFilesSelected = Array.from(uploadItemsContainer.querySelectorAll('.file-input'))
                .some(input => input.files.length > 0);
                
            if (!anyFilesSelected) {
                uploadButtonContainer.style.display = 'none';
            }
        }
    }

    /**
     * Handles the main upload process when the button is clicked.
     */
    async function handleUpload() {
        const uploadItems = uploadItemsContainer.querySelectorAll('.upload-item');
        const formData = new FormData();
        let isValid = true;
        let fileCountTotal = 0;
        const unitsProcessed = new Set(); // To check for duplicate unit codes

        // --- Prepare UI for Upload ---
        uploadButton.disabled = true;
        successMessageContainer.style.display = 'none';
        progressContainer.style.display = 'block';
        progressBarFill.style.width = '0%';
        progressText.textContent = 'Preparing upload...';

        // Reset any previous error states
        uploadItemsContainer.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
        });

        // --- Iterate and Validate Each Upload Item ---
        uploadItems.forEach((item, index) => {
            const unitCodeInput = item.querySelector('.unit-code');
            const fileInput = item.querySelector('.file-input');
            const unitNumberBadge = item.querySelector('.unit-badge');
            const yearSelect = item.querySelector('.unit-year');
            const semesterSelect = item.querySelector('.unit-semester');

            // Skip items with no files selected
            if (!fileInput || fileInput.files.length === 0) {
                return;
            }

            const unitCode = unitCodeInput ? unitCodeInput.value.trim() : '';
            const files = fileInput.files;
            const unitLabel = unitNumberBadge ? unitNumberBadge.textContent : `Item ${index + 1}`;

            // Validate unit code
            if (!unitCode) {
                console.error(`${unitLabel}: Unit code is missing but files are selected.`);
                unitCodeInput.classList.add('error');
                isValid = false;
            }

            // Check for duplicate unit codes
            if (unitCode && unitsProcessed.has(unitCode.toUpperCase())) {
                console.error(`${unitLabel}: Duplicate Unit Code "${unitCode}".`);
                unitCodeInput.classList.add('error');
                isValid = false;
            } else if (unitCode) {
                unitsProcessed.add(unitCode.toUpperCase());
            }

            // Validate year and semester
            const yearValue = yearSelect ? yearSelect.value : '';
            const semesterValue = semesterSelect ? semesterSelect.value : '';
            
            if (!yearValue) {
                console.error(`${unitLabel}: Year is missing for unit "${unitCode}".`);
                yearSelect.classList.add('error');
                isValid = false;
            }
            
            if (!semesterValue) {
                console.error(`${unitLabel}: Semester is missing for unit "${unitCode}".`);
                semesterSelect.classList.add('error');
                isValid = false;
            }

            // If valid, add to formData
            if (unitCode && isValid) {
                const sanitizedUnitCode = sanitizeUnitCode(unitCode);
                if (!sanitizedUnitCode) {
                    console.error(`${unitLabel}: Unit code "${unitCode}" resulted in empty sanitized code.`);
                    isValid = false;
                    return;
                }
                
                const formDataKey = `files_${sanitizedUnitCode}`;
                console.log(`${unitLabel}: Adding ${files.length} files under key "${formDataKey}"`);
                
                for (const file of files) {
                    formData.append(formDataKey, file);
                    fileCountTotal++;
                }

                // Add metadata
                const titleInput = item.querySelector('.unit-title');
                let metadata = {
                    originalCode: unitCode,
                    title: titleInput ? titleInput.value.trim() : '',
                    year: yearValue,
                    semester: semesterValue
                };
                formData.append(`metadata_${sanitizedUnitCode}`, JSON.stringify(metadata));
            }
        });

        // --- Final Validation Check ---
        if (!isValid) {
            console.error("Validation errors found. Please correct them and try again.");
            alert("Please check the form for missing or duplicate unit codes, or missing year/semester.");
            uploadButton.disabled = false;
            progressContainer.style.display = 'none';
            return;
        }

        if (fileCountTotal === 0) {
            console.warn("No files found to upload after processing all items.");
            alert("No files found to upload. Please select files and provide unit codes.");
            uploadButton.disabled = false;
            progressContainer.style.display = 'none';
            return;
        }

        console.log(`Attempting to upload ${fileCountTotal} file(s) in total.`);
        progressText.textContent = `Uploading ${fileCountTotal} file(s)... 0%`;

        // --- Perform the Fetch Request ---
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            console.error("CSRF token not found. Cannot upload.");
            alert("Error: Security token not found. Please refresh the page.");
            uploadButton.disabled = false;
            progressContainer.style.display = 'none';
            return;
        }

        try {
            // Simulate progress
            progressBarFill.style.width = '25%';

            const response = await fetch('/api/exam_papers/', { 
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                body: formData
            });

            progressBarFill.style.width = '75%';

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { message: `Upload failed with status: ${response.status} ${response.statusText}` };
                }
                const error = new Error(errorData.message || 'Unknown upload error');
                error.data = errorData; 
                error.status = response.status;
                throw error;
            }

            // --- Handle Success ---
            progressBarFill.style.width = '100%';
            progressText.textContent = 'Upload Complete!';
            const data = await response.json();
            console.log('Upload successful:', data);

            // Hide form/progress, show success message
            uploadItemsContainer.style.display = 'none';
            uploadButtonContainer.style.display = 'none';
            progressContainer.style.display = 'none';
            successMessageContainer.style.display = 'block';

        } catch (error) {
            // --- Handle Errors ---
            console.error('Upload failed:', error);
            let errorMessage = 'An unexpected error occurred during upload.';
            if (error.data && error.data.message) {
                errorMessage = `Upload failed: ${error.data.message}`;
                if (error.data.errors) {
                    console.error("Specific errors:", error.data.errors);
                    errorMessage += " Check console for details.";
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            alert(errorMessage);
            uploadButton.disabled = false;
            progressContainer.style.display = 'none';
        }
    }

    /**
     * Sets up drag and drop functionality for a file upload box.
     * @param {HTMLElement} dropZone - The element to enable drag and drop on.
     */
    function setupDragAndDrop(dropZone) {
        if (!dropZone) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropZone.classList.add('highlight');
        }
        
        function unhighlight() {
            dropZone.classList.remove('highlight');
        }
        
        dropZone.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const fileInput = dropZone.querySelector('.file-input');
            if (!fileInput) return;
            
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                fileInput.files = files;
                
                // Trigger change event
                const event = new Event('change');
                fileInput.dispatchEvent(event);
            }
        }
    }

    // --- Event Listeners ---
    
    // Upload button click
    uploadButton.addEventListener('click', handleUpload);
    
    // "Upload More" button click
    uploadMoreButton.addEventListener('click', resetForm);
    
    // Add event listener to initial file input
    const initialFileInput = document.getElementById('file-upload-1');
    if (initialFileInput) {
        initialFileInput.addEventListener('change', handleFileChange);
    }
    
    // Setup drag and drop for initial upload box
    setupDragAndDrop(document.querySelector('.file-upload-box'));
    
    // Fix for iOS touch events
    function addTouchSupport() {
        const fileLabels = document.querySelectorAll('.file-label');
        fileLabels.forEach(label => {
            label.addEventListener('click', function(e) {
                e.preventDefault();
                const fileInput = this.parentElement.querySelector('.file-input');
                if (fileInput) fileInput.click();
            });
        });
    }
    
    // Add touch support for mobile devices
    addTouchSupport();
    
    // Fix for mobile viewport height issues
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    
    // --- Initial State ---
    // Hide elements that shouldn't be visible initially
    uploadButtonContainer.style.display = 'none';
    progressContainer.style.display = 'none';
    successMessageContainer.style.display = 'none';
    
    // Hide unit info in the initial item until files are selected
    const initialItem = uploadItemsContainer.querySelector('.upload-item');
    if (initialItem) {
        const initialUnitInfo = initialItem.querySelector('.unit-info');
        if (initialUnitInfo) initialUnitInfo.style.display = 'none';
    }
});