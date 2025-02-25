document.addEventListener('DOMContentLoaded', async function() {
    const unitsList = document.querySelector('.units-list');
    const unitSearch = document.getElementById('unitSearch');
    const urlParams = new URLSearchParams(window.location.search);
    const unitId = urlParams.get('unitId');
    let unitss=[];

    if (unitId) {
        try {
            const unitDetailsRes = await fetch('/api/units/');
            const unitDetails = await unitDetailsRes.json();
            const unitCode = unitDetails[unitId-1].unitCode; // Extract unit code

            // Fetch PDFs
            const pdfsRes = await fetch(`/api/unit/${unitId}/pdfs/`);
            const pdfs = await pdfsRes.json();
            unitss=pdfs;

            // Render PDFs with unitCode
            // loader.style.display = 'none';

            unitsList.innerHTML = pdfs.map(pdf => `
                <div class="unit-card">
                    <div class="unit-info">
                        <div class="unit-code">${unitCode}</div>  <!-- Fixed -->
                        <div class="unit-title">${pdf.pdfTitle}</div>
                    </div>
                    <div class="unit-actions">
                        <a href="${pdf.pdfDownloadLink}" target="_blank">
                            <button class="download-btn">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </a>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error fetching data:', error);
            unitsList.innerHTML = '<p>Failed to load data. Please try again later.</p>';
        }
    } else {
        unitsList.innerHTML = '<p>No unit selected. Please go back and select a unit.</p>';
    }

    // Render all units
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

        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const unitCard = this.closest('.unit-card');
                const unitCode = unitCard.querySelector('.unit-code').textContent;
                console.log(`Downloading notes for ${unitCode}`);
            });
        });
    }

    // Search functionality
    if (typeof units !== 'undefined') {
        renderUnits(units);
    }
});
