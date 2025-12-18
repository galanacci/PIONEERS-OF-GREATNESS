function startScrolling() {
  const placeholder = document.getElementById('animated-placeholder');
  if (!placeholder) return;

  const text = "ENTER YOUR EMAIL HERE...";
  const container = document.createElement('div');
  container.className = 'scrolling-text-container';

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

  emailForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      statusDiv.textContent = 'Please enter a valid email address';
      return;
    }

    statusDiv.textContent = 'Wait a moment...';

    // ✅ IMPORTANT:
    // Shopify capture requires the input name to be: contact[email]
    // If your input currently has id="email" but name="email", Shopify won't store it.
    // Make sure your HTML input is:
    // <input id="email" name="contact[email]" type="email" ... />

    // Submit the form normally to Shopify (no fetch — avoids CORS issues)
    emailForm.submit();
  });
});
