const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjvkTDouoDXWbSvmKCsznmiRc51S5uP9BDBzBJ8CnEaHGTDFPODgH39ZJWg2XtSgQdUg/exec";

function startScrolling() {

    const placeholder = document.getElementById("animated-placeholder");

    if (!placeholder) return;

    const text = "ENTER YOUR EMAIL HERE...";

    const container = document.createElement("div");
    container.className = "scrolling-text-container";

    const span1 = document.createElement("span");
    span1.className = "scrolling-text";
    span1.textContent = text;

    const span2 = document.createElement("span");
    span2.className = "scrolling-text";
    span2.textContent = text;

    container.appendChild(span1);
    container.appendChild(span2);

    placeholder.innerHTML = "";
    placeholder.appendChild(container);

}

document.addEventListener("DOMContentLoaded", () => {

    startScrolling();

    const form = document.getElementById("email-form");
    const emailInput = document.getElementById("email");
    const status = document.getElementById("status");
    const placeholder = document.getElementById("animated-placeholder");

    emailInput.addEventListener("focus", () => {

        placeholder.style.display = "none";

    });

    emailInput.addEventListener("blur", () => {

        if(emailInput.value === ""){

            placeholder.style.display = "block";

        }

    });

    form.addEventListener("submit", async function(e){

        e.preventDefault();

        const email = emailInput.value.trim();

        if(email === ""){

            status.textContent = "Please enter an email.";

            return;

        }

        status.textContent = "Joining...";

        const formData = new FormData();

        formData.append("email", email);

        try{

            const response = await fetch(SCRIPT_URL,{

                method:"POST",

                body:formData

            });

            const data = await response.json();

switch (data.status) {

    case "success":

        status.textContent = "Welcome to the movement.";
        status.style.color = "#7dff7d";

        emailInput.value = "";
        placeholder.style.display = "block";

        break;

    case "duplicate":

        status.textContent = "Already signed up.";
        status.style.color = "#ffbf47";

        break;

    default:

        status.textContent = "Something went wrong.";
        status.style.color = "#ff6b6b";

}

        }

        catch(err){

            console.error(err);

            status.textContent = "Unable to connect.";

        }

    });

});
// Fullscreen menu overlay controls. Kept separate from the waitlist logic.
document.addEventListener("DOMContentLoaded", () => {

    const menuButton = document.querySelector(".menu-toggle");
    const menuOverlay = document.getElementById("menu-overlay");
    const menuPanel = menuOverlay?.querySelector(".menu-panel");
    const menuItems = Array.from(menuPanel?.querySelectorAll(".menu-item") ?? []);
    let selectedIndex = Math.max(0, menuItems.findIndex((item) => item.classList.contains("is-selected")));

    if (!menuButton || !menuOverlay || !menuPanel || menuItems.length === 0) return;

    function updateSelection(nextIndex) {

        selectedIndex = (nextIndex + menuItems.length) % menuItems.length;

        menuItems.forEach((item, index) => {

            const isSelected = index === selectedIndex;
            item.classList.toggle("is-selected", isSelected);
            item.tabIndex = isSelected ? 0 : -1;
            isSelected ? item.setAttribute("aria-current", "true") : item.removeAttribute("aria-current");

        });

    }

    updateSelection(selectedIndex);

    function openMenu() {

        menuOverlay.classList.add("is-open");
        menuOverlay.setAttribute("aria-hidden", "false");
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", "Close menu");
        updateSelection(selectedIndex);
        menuItems[selectedIndex].focus();

    }

    function closeMenu() {

        menuOverlay.classList.remove("is-open");
        menuOverlay.setAttribute("aria-hidden", "true");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open menu");
        menuButton.focus();

    }

    menuButton.addEventListener("click", () => {

        const isOpen = menuOverlay.classList.contains("is-open");
        isOpen ? closeMenu() : openMenu();

    });

    menuPanel.addEventListener("click", (event) => {

        const menuItem = event.target.closest(".menu-item");

        if (!menuItem) return;

        updateSelection(menuItems.indexOf(menuItem));

        if (menuItem.getAttribute("aria-disabled") === "true") return;

        const action = menuItem.dataset.menuAction;

        if (action === "waitlist") {

            closeMenu();
            document.getElementById("email")?.focus();

        } else if (action === "external") {

            const destination = menuItem.dataset.menuUrl;
            if (destination) window.open(destination, "_blank", "noopener,noreferrer");

        } else if (action === "exit") {

            closeMenu();

        }

    });

    menuPanel.addEventListener("pointerover", (event) => {

        const menuItem = event.target.closest(".menu-item");

        if (!menuItem) return;

        updateSelection(menuItems.indexOf(menuItem));

    });

    document.addEventListener("keydown", (event) => {

        if (!menuOverlay.classList.contains("is-open")) return;

        if (event.key === "ArrowUp") {

            event.preventDefault();
            updateSelection(selectedIndex - 1);
            menuItems[selectedIndex].focus();

        } else if (event.key === "ArrowDown") {

            event.preventDefault();
            updateSelection(selectedIndex + 1);
            menuItems[selectedIndex].focus();

        } else if (event.key === "Enter") {

            event.preventDefault();
            menuItems[selectedIndex].click();

        } else if (event.key === "Escape") {

            event.preventDefault();
            closeMenu();

        }

    });

});
