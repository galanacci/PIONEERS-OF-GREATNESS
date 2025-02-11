function startScrolling() {
    const placeholder = document.getElementById('animated-placeholder');
    if (!placeholder) return;
    
    const text = "Enter your email here and join the movement!";
    // Create container for scrolling animation
    const container = document.createElement('div');
    container.className = 'scrolling-text-container';
    
    // Add two copies of the text for seamless loop
    const span1 = document.createElement('span');
    span1.className = 'scrolling-text';
    span1.textContent = text;
    
    const span2 = document.createElement('span');
    span2.className = 'scrolling-text';
    span2.textContent = text;
    
    container.appendChild(span1);
    container.appendChild(span2);
    placeholder.innerHTML = '';
    placeholder.appendChild(container);
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

    startScrolling();

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
