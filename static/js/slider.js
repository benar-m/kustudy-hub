document.addEventListener('DOMContentLoaded', () => {

    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    let currentSlide = 0;
    const notesGrid = document.querySelector('.notes-grid');
    const loader= document.querySelector('.loader');
    const searchInput = document.querySelector('.search-box');
    function comingSoon() {
        const messagearea = document.getElementById('comingSoon');
        messagearea.style.display = 'block';
    
        // Hide the message after 3 seconds
        setTimeout(() => {
            messagearea.style.display = 'none';
        }, 3000);
    }
    let units=[];

    // Fetch data from the API
    fetch('/api/units')
        .then(response => response.json())
        .then(data => {
            units = data;
            notesGrid.innerHTML = '';
            loader.style.display = 'none';
            data.forEach(unit => {
                const noteCard = document.createElement('div');
                noteCard.className = 'note-card';
                noteCard.id = unit.id; 
                noteCard.innerHTML = `
                    <div class="pdf-icon">PDF</div>
                    <div class="note-info">
                        <div class="course-code"> ${unit.unitCode}</div>
                        <h3> ${unit.unitTitle}</h3>
                        <a href="/units/?unitId=${unit.id}"> 
                            <button class="view-pdf-btn">VIEW FILES</button>
                        </a>
                    </div>
                `;
                notesGrid.appendChild(noteCard); // Append the card to the grid
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });

    // Function to show a specific slide
    function showSlide(n) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        currentSlide = (n + slides.length) % slides.length;

        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    // Function to move to the next slide
    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    // Function to move to the previous slide
    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    // Event Listeners
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showSlide(index));
    });

    setInterval(nextSlide, 20000);
    document.querySelectorAll('.icon-btn').forEach(button => {
        button.addEventListener('click', comingSoon);
    });

    //Search Functionality
    searchInput.addEventListener('input', () => {
        const searchValue = searchInput.value.toLowerCase().replace(/\s+/g, ''); // Remove spaces
        const filteredUnits = units.filter(unit => {
            const unitCodeNoSpaces = unit.unitCode.toLowerCase().replace(/\s+/g, ''); // Remove spaces from unitCode
            const unitTitleNoSpaces = unit.unitTitle.toLowerCase().replace(/\s+/g, ''); // Remove spaces from unitTitle
            return unitCodeNoSpaces.includes(searchValue) || unitTitleNoSpaces.includes(searchValue);
        });
    
        notesGrid.innerHTML = '';
        filteredUnits.forEach(unit => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            noteCard.id = unit.id;
            noteCard.innerHTML = `
                <div class="pdf-icon">PDF</div>
                <div class="note-info">
                    <div class="course-code"> ${unit.unitCode}</div>
                    <h3> ${unit.unitTitle}</h3>
                    <a href="/units/?unitId=${unit.id}">
                        <button class="view-pdf-btn">VIEW FILES</button>
                    </a>
                </div>
            `;
            notesGrid.appendChild(noteCard);
        });
    });
});    