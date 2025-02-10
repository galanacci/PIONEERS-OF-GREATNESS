// Typing animation
const phrases = ["Enter your email here...", "To join our waiting list!"];
let currentPhraseIndex = 0;
let currentCharIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

function typeAnimation() {
    const placeholder = document.getElementById('animated-placeholder');
    const currentPhrase = phrases[currentPhraseIndex];

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
    typeAnimation();

    document.getElementById('email').addEventListener('focus', function() {
        document.getElementById('animated-placeholder').style.display = 'none';
    });

    document.getElementById('email').addEventListener('blur', function() {
        if (this.value === '') {
            document.getElementById('animated-placeholder').style.display = 'block';
        }
    });

    document.getElementById('email-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var email = document.getElementById('email').value;
        var statusDiv = document.getElementById('status');
        
        statusDiv.textContent = 'Greatness takes time...';
        
        fetch('https://script.google.com/macros/s/AKfycbzIGpH52dMRf2CZhvQ4OVVEtNQrtKEOByTn8JsaNuvve5HM17hDOG9Q5rgfZc7jIXq1/exec', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({ email: email })
        })
        .then(response => {
            statusDiv.textContent = 'Thank you for joining!';
            document.getElementById('email').value = '';
        })
        .catch(error => {
            statusDiv.textContent = 'An error occurred. Please try again.';
        });
    });
});