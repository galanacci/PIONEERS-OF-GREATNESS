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
