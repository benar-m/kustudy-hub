
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
        const previewElement = document.createElement('div');
        previewElement.classList.add('file-preview-item');

        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-file-alt'); // Generic file icon
        // Optional: Add specific icons based on file.type

        const fileName = document.createElement('span');
        fileName.textContent = file.name;
        fileName.classList.add('file-preview-name');

        previewElement.appendChild(icon);
        previewElement.appendChild(fileName);
        return previewElement;
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
        if (unitCodeInput) unitCodeInput.value = '';
        if (unitTitleInput) unitTitleInput.value = '';
        if (unitYearSelect) unitYearSelect.selectedIndex = 0;
        if (unitSemesterSelect) unitSemesterSelect.selectedIndex = 0;
        // Reset any validation error states if you added them
    }

    /**
     * Resets the entire form to allow more uploads.
     */
    function resetForm() {
        const allUploadItems = uploadItemsContainer.querySelectorAll('.upload-item');
        allUploadItems.forEach(resetUploadItem);

        // Ensure the first item's unit info is hidden and preview cleared
        if (allUploadItems.length > 0) {
             resetUploadItem(allUploadItems[0]);
        }

        // Reset visibility
        successMessageContainer.style.display = 'none';
        uploadButtonContainer.style.display = 'none'; // Hide until files are selected again
        progressContainer.style.display = 'none';
        uploadItemsContainer.style.display = '';
        uploadButton.disabled = false;
        progressBarFill.style.width = '0%';
        progressText.textContent = 'Uploading... 0%';
    }


    /**
     * Updates the file preview and shows unit info for a specific item.
     * @param {Event} event - The file input change event.
     */
    function handleFileChange(event) {
        const fileInput = event.target;
        const uploadItem = fileInput.closest('.upload-item'); // Find parent item
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
            unitInfo.style.display = ''; // Or 'block', 'flex' etc.
            // Show the main upload button container if it's hidden
            uploadButtonContainer.style.display = '';
        } else {
            // Hide unit info if no files are selected
            unitInfo.style.display = 'none';

            // Optional: Check if any *other* item still has files selected
            // If not, hide the main upload button container again.
            const allFileInputs = uploadItemsContainer.querySelectorAll('.file-input');
            let anyFilesSelected = false;
            allFileInputs.forEach(input => {
                if (input.files.length > 0) {
                    anyFilesSelected = true;
                }
            });
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
        const unitsProcessed = new Set(); // To check for duplicate unit codes if needed

        // --- Prepare UI for Upload ---
        uploadButton.disabled = true;
        successMessageContainer.style.display = 'none';
        progressContainer.style.display = 'block';
        progressBarFill.style.width = '0%';
        progressText.textContent = 'Preparing upload...';

        // --- Iterate and Validate Each Upload Item ---
        uploadItems.forEach((item, index) => {
            const unitCodeInput = item.querySelector('.unit-code');
            const fileInput = item.querySelector('.file-input');
            const unitNumberBadge = item.querySelector('.unit-badge'); // For error messages

            const unitCode = unitCodeInput.value.trim();
            const files = fileInput.files;
            const unitLabel = unitNumberBadge ? unitNumberBadge.textContent : `Item ${index + 1}`;


            // Skip items with no files *selected* (they might just be empty placeholders)
            if (files.length === 0) {
                 console.log(`${unitLabel}: No files selected, skipping.`);
                 // Don't mark as invalid, just skip empty items.
                return;
            }

             // Now, if files ARE selected, the unit code MUST be present
            if (!unitCode) {
                console.error(`${unitLabel}: Unit code is missing but files are selected.`);
                // TODO: Display error message near the unitCodeInput for the user
                // e.g., unitCodeInput.classList.add('error');
                // Maybe add a general error message div somewhere.
                isValid = false;
                return; // Stop processing this item due to error
            }

            // Optional: Check for duplicate unit codes if that's not allowed
            if (unitsProcessed.has(unitCode.toUpperCase())) { // Case-insensitive check
                console.error(`${unitLabel}: Duplicate Unit Code "${unitCode}".`);
                // TODO: Display error message
                 isValid = false;
                 return;
            }
            unitsProcessed.add(unitCode.toUpperCase());

            // --- Sanitize and Append to FormData ---
            const sanitizedUnitCode = sanitizeUnitCode(unitCode);
            if (!sanitizedUnitCode) { // Should not happen if unitCode is not empty, but good check
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

            // --- Optional: Append Metadata ---
            const titleInput = item.querySelector('.unit-title');
            const yearSelect = item.querySelector('.unit-year');
            const semesterSelect = item.querySelector('.unit-semester');
            // Basic validation for required Year/Semester if needed
            const yearValue = yearSelect ? yearSelect.value : '';
            const semesterValue = semesterSelect ? semesterSelect.value : '';
            if (!yearValue || !semesterValue) {
                 console.error(`${unitLabel}: Year or Semester is missing for unit "${unitCode}".`);
                 // TODO: Display error message near the selects
                 isValid = false;
                 // Decide if you want to return here or allow upload without year/sem
            }

            let metadata = {
                originalCode: unitCode,
                title: titleInput ? titleInput.value.trim() : '',
                year: yearValue,
                semester: semesterValue
            };
            formData.append(`metadata_${sanitizedUnitCode}`, JSON.stringify(metadata));
            // --- End Optional Metadata ---

        }); // End loop through uploadItems


        // --- Final Validation Check ---
        if (!isValid) {
            console.error("Validation errors found. Please correct them and try again.");
            alert("Validation errors found. Please check the form for missing or duplicate unit codes, or missing year/semester.");
            // Re-enable button, hide progress
            uploadButton.disabled = false;
            progressContainer.style.display = 'none';
            return; // Stop upload
        }

        if (fileCountTotal === 0) {
            console.warn("No files found to upload after processing all items.");
             alert("No files found to upload. Please select files and provide unit codes.");
            // Re-enable button, hide progress
            uploadButton.disabled = false;
            progressContainer.style.display = 'none';
            return; // Stop upload
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
            // **Progress Simulation:** Fetch API doesn't easily provide upload progress.
            // We simulate by updating text. For real progress, use XMLHttpRequest.
            progressBarFill.style.width = '25%'; // Simulate some progress

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
                    // Backend didn't send JSON or other parsing error
                    errorData = { message: `Upload failed with status: ${response.status} ${response.statusText}` };
                }
                 // Throw an error object compatible with the catch block
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
             progressContainer.style.display = 'none'; // Hide progress finally
             successMessageContainer.style.display = 'block'; // Or 'flex'

        } catch (error) {
             // --- Handle Errors (Network or Backend) ---
            console.error('Upload failed:', error);
            let errorMessage = 'An unexpected error occurred during upload.';
            if (error.data && error.data.message) {
                errorMessage = `Upload failed: ${error.data.message}`;
                if (error.data.errors) { // If backend sends specific field errors
                     console.error("Specific errors:", error.data.errors);
                     errorMessage += " Check console for details.";
                }
            } else if (error.message) {
                 errorMessage = error.message; // Use message from thrown error
            }

             alert(errorMessage); // Show error to user

             // Reset UI potentially
             uploadButton.disabled = false;
             progressContainer.style.display = 'none'; // Hide progress on error
        }

    }


    // --- Event Listeners ---

    // Use event delegation for file inputs inside the container
    uploadItemsContainer.addEventListener('change', (event) => {
        if (event.target.classList.contains('file-input')) {
            handleFileChange(event);
        }
    });

    // Upload button click
    uploadButton.addEventListener('click', handleUpload);

    // "Upload More" button click
    uploadMoreButton.addEventListener('click', resetForm);

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

   

}); // End DOMContentLoaded