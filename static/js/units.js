document.addEventListener('DOMContentLoaded', async function() {
    const unitsList = document.querySelector('.units-list');
    const unitSearch = document.getElementById('unitSearch');
    const urlParams = new URLSearchParams(window.location.search);
    const unitId = urlParams.get('unitId');

    function comingSoon() {
        const messagearea = document.getElementById('comingSoon');
        if (messagearea) {
            messagearea.style.display = 'block';
        }
    }
    

    
    if (unitId) {
        try {
            const unitDetailsRes = await fetch('/api/units/');
            const unitDetails = await unitDetailsRes.json();
    
            // Convert unitId to an integer for safe comparison
            const unitIdNum = parseInt(unitId, 10);
    
            // Find the correct unit in the array
            const unit = unitDetails.find(u => u.id === unitIdNum);
    
            if (!unit) {
                unitsList.innerHTML = '<p>Unit not found.</p>';
                return;
            }
    
            const unitCode = unit.unitCode;
    
            const pdfsRes = await fetch(`/api/unit/${unitId}/pdfs/`);
            const pdfs = await pdfsRes.json();
    
            // Render PDFs
            unitsList.innerHTML = pdfs.map(pdf => `
                <div class="unit-card">
                    <div class="unit-info">
                        <div class="unit-code">${unitCode}</div>  
                        <div class="unit-title">${pdf.pdfTitle}</div>
                    </div>
                    <div class="unit-actions">
                        <button class="read-btn" filelink="${pdf.pdfDownloadLink}" 
                                data-filename="${pdf.pdfTitle.replace(/\s+/g, '_')}.pdf">
                            <i class="fas fa-book"></i> Read
                        </button>
                        <button class="download-btn" data-url="${pdf.pdfDownloadLink}" 
                                data-filename="${pdf.pdfTitle.replace(/\s+/g, '_')}.pdf">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error fetching unit details or PDFs:', error);
            unitsList.innerHTML = '<p>Failed to load unit details. Please try again later.</p>';
        }
    } else {
        unitsList.innerHTML = '<p>No unit selected. Please go back and select a unit.</p>';
    }
   

    function renderUnits(units) {
        unitsList.innerHTML = units.map(unit => `
            <div class="unit-card">
                <div class="unit-info">
                    <div class="unit-code">${unit.code}</div>
                    <div class="unit-title">${unit.title}</div>
                </div>
                <div class="unit-actions">
                    <button class="download-btn">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `).join('');
    }
    document.querySelectorAll('.icon-btn').forEach(button => {
        button.addEventListener('click', () => {
            comingSoon();
            button.disabled = true; // Disable the button
            setTimeout(() => {
                button.disabled = false; // Re-enable after 3 seconds
            }, 3000);
        });
    });
    

    document.addEventListener('click', async function(e) {
        if (e.target.closest('.download-btn')) {
            const button = e.target.closest('.download-btn');
            const fileUrl = button.getAttribute('data-url');
            const fileName = button.getAttribute('data-filename');
            const message = document.createElement('p');
            message.textContent = '📥 Download Started...';
            message.style.color = 'green';
            message.style.fontWeight = 'bold';
            button.parentNode.appendChild(message);
            setTimeout(() => message.remove(), 3000);


            try {
                const response = await fetch(fileUrl);
                const blob = await response.blob();

                // Create a download link
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName; // Forces the correct filename
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Free up memory
                URL.revokeObjectURL(link.href);
            } catch (error) {
                console.error("Download failed:", error);
            }
        }
    });

    // If units exist, render them
    if (typeof units !== 'undefined') {
        renderUnits(units);
    }
});
