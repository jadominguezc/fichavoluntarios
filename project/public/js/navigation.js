// Navegación entre páginas del formulario
document.addEventListener('DOMContentLoaded', () => {
    const nextButtons = document.querySelectorAll('.btn-next');
    const prevButtons = document.querySelectorAll('.btn-prev');

    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentStep = document.querySelector('.form-step.active');
            const nextStep = currentStep.nextElementSibling;

            if (nextStep) {
                currentStep.classList.remove('active');
                nextStep.classList.add('active');
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentStep = document.querySelector('.form-step.active');
            const prevStep = currentStep.previousElementSibling;

            if (prevStep) {
                currentStep.classList.remove('active');
                prevStep.classList.add('active');
            }
        });
    });
});
