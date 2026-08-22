const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrXHACtOo08hlGwUsThMtkHuXlU1F5ktcRiVCMHHbB-gvX7LNEbBeVM-vC966yv6YZTA/exec";

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

            status.textContent = data.message;

            if(data.status === "success"){

                emailInput.value = "";

                placeholder.style.display = "block";

            }

        }

        catch(err){

            console.error(err);

            status.textContent = "Unable to connect.";

        }

    });

});
