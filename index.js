// Landing Page - External script (avoids CSP violation)

function scrollToSection(id) {
    const element = document.getElementById(id);
    element.scrollIntoView({ behavior: 'smooth' });
}

function handleDemo(event) {
    if (event && event.key !== 'Enter') return;
    const input = document.getElementById('userInput');
    const value = input.value.trim();
    if (!value) return;
    
    alert("Créez votre agent pour commencer à discuter avec lui en profondeur !");
    input.value = '';
}

// Add smooth scroll behavior
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const id = this.getAttribute('href').substring(1);
            scrollToSection(id);
        });
    });
});
