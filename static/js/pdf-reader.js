function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

const url = getQueryParam('filelink');
function darkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');

    document.querySelectorAll('.pdf-page').forEach(page => {
        page.classList.toggle('dark-mode'); 
    });
    document.querySelector('.pdf-container').classList.toggle('dark-mode');

    document.getElementById('pdf-viewer').classList.toggle('dark-mode');

    const darkModeBtnIcon= document.getElementById('darkmodeicon');
    if (darkModeBtnIcon.classList.contains('fa-moon')) {
        darkModeBtnIcon.classList.remove('fa-moon');
        darkModeBtnIcon.classList.add('fa-sun');
    }
    else {
        darkModeBtnIcon.classList.remove('fa-sun');
        darkModeBtnIcon.classList.add('fa-moon');
    }

    // Change button text accordingly
}




if (!url) {
    console.error("No file link provided in URL");
    document.querySelector('#pdf-viewer').innerHTML = "<p>Error: No PDF file specified.</p>";
} else {
    let pdfDoc = null,
        pageNum = 1,
        pagesRendering = new Set(),
        pageNumIsPending = null;

    const scale = 1.5,
        pdfViewer = document.querySelector('#pdf-viewer');

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

    // Render the page
    const renderPage = num => {
        if (pagesRendering.has(num)) return;
        pagesRendering.add(num);

        pdfDoc.getPage(num).then(page => {
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };

            canvas.classList.add('pdf-page');
            pdfViewer.appendChild(canvas);

            page.render(renderContext).promise.then(() => {
                pagesRendering.delete(num);
                if (num < pdfDoc.numPages) {
                    renderPage(num + 1);
                }
            });
        });
    };

    // Queue rendering
    const queueRenderPage = num => {
        if (pagesRendering.size > 2) {
            pageNumIsPending = num;
        } else {
            renderPage(num);
        }
    };



    // Load the PDF
    pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        renderPage(pageNum);
        const loader = document.querySelector('.loader');
        if (loader) loader.style.display = 'none'; // Hide loader after PDF loads
    }).catch(err => {
        console.error("Error loading PDF:", err);
        const div = document.createElement('div');
        div.className = 'error';
        div.textContent = err.message;
        pdfViewer.appendChild(div);
    });

    // Lazy Loading
    window.addEventListener('scroll', () => {
        if (pdfDoc && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            if (pageNum < pdfDoc.numPages) {
                pageNum++;
                queueRenderPage(pageNum);
            }
        }
    });

}
document.addEventListener('DOMContentLoaded', () => {
    const darkModeBtn = document.getElementById('darkModeButton');
    darkModeBtn.addEventListener('click', darkMode);
});
