// Typing animation
const phrases = ["Enter your email here...", "and join the movement!"];
let currentPhraseIndex = 0;
let currentCharIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

function typeAnimation() {
    const placeholder = document.getElementById('animated-placeholder');
    const currentPhrase = phrases[currentPhraseIndex];

    if (!placeholder) return; // Guard clause for missing element

    if (isDeleting) {
        placeholder.textContent = currentPhrase.substring(0, currentCharIndex - 1);
        currentCharIndex--;
    } else {
        placeholder.textContent = currentPhrase.substring(0, currentCharIndex + 1);
        currentCharIndex++;
    }

    if (!isDeleting && currentCharIndex === currentPhrase.length) {
        isDeleting = true;
        typingSpeed = 50;
        setTimeout(typeAnimation, 800);
    } else if (isDeleting && currentCharIndex === 0) {
        isDeleting = false;
        currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
        typingSpeed = 100;
        setTimeout(typeAnimation, 500);
    } else {
        setTimeout(typeAnimation, typingSpeed);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const animatedPlaceholder = document.getElementById('animated-placeholder');
    const emailForm = document.getElementById('email-form');
    const statusDiv = document.getElementById('status');

    if (!emailInput || !animatedPlaceholder || !emailForm || !statusDiv) {
        console.error('Required elements not found');
        return;
    }

    typeAnimation();

    emailInput.addEventListener('focus', () => {
        animatedPlaceholder.style.display = 'none';
    });

    emailInput.addEventListener('blur', () => {
        if (emailInput.value === '') {
            animatedPlaceholder.style.display = 'block';
        }
    });

    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        
        if (!email) {
            statusDiv.textContent = 'Please enter a valid email address';
            return;
        }

        statusDiv.textContent = 'Wait a moment...';
        
        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbzTAn7Ud_iKrspHrP_hUlrrGUGW7fnjbE2SLikfHq3ppeRJyFp8nYLzqZ1IjgtRePIn2A/exec', {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            // Since no-cors mode doesn't return readable response
            // We'll assume success if no error is thrown
            statusDiv.textContent = 'Thank you for joining!';
            emailInput.value = '';
            animatedPlaceholder.style.display = 'block';
            
        } catch (error) {
            console.error("Error:", error);
            statusDiv.textContent = 'An error occurred. Please try again.';
        }
    });
});
