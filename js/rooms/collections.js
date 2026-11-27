import { COLLECTIONS_PREVIEW_ENABLED } from "../room-registry.js";
import { initMadeToOrder } from "./made-to-order.js";

const ROOM_ID = "collections-room";
const sound = (name) => window.dispatchEvent(new CustomEvent("pog:menu-sound", { detail: { name } }));

export function initCollections() {
    if (!COLLECTIONS_PREVIEW_ENABLED) return;
    const room = document.getElementById(ROOM_ID);
    const stage = document.getElementById("collections-stage");
    const canvas = document.getElementById("collections-canvas");
    const status = document.getElementById("collections-status");
    const page = document.getElementById("collections-product-sheet");
    const back = room?.querySelector(".room-return");
    const imagePrevious = page?.querySelector(".collections-image-previous");
    const imageNext = page?.querySelector(".collections-image-next");
    if (!room || !stage || !canvas || !status || !page || !back || !imagePrevious || !imageNext) return;

    const type = document.getElementById("collections-product-type");
    const title = document.getElementById("collections-product-title");
    const price = document.getElementById("collections-product-price");
    const description = document.getElementById("collections-product-description");
    const spec = document.getElementById("collections-product-spec");
    const drawer = document.getElementById("collections-product-drawer");
    const sizeOptions = document.getElementById("collections-size-options");
    const sizeFeedback = document.getElementById("collections-size-feedback");
    const imageContainer = page.querySelector(".collections-product-images");
    const indicatorContainer = page.querySelector(".collections-image-indicators");
    const productImages = [...page.querySelectorAll("[data-collections-product-image]")];
    const placeholderTemplates = productImages.map((image) => image.firstElementChild.cloneNode(true));
    const imageIndicators = [...page.querySelectorAll(".collections-image-indicators span")];
    const actionButtons = [...page.querySelectorAll("[data-collections-action]")];
    const panels = [...page.querySelectorAll("[data-collections-panel]")];
    if (!type || !title || !price || !description || !spec || !drawer || !sizeOptions || !sizeFeedback || !imageContainer || !indicatorContainer) return;

    const order = initMadeToOrder(page);
    let orderSettings = {};
    let chosenSize = null;
    let products = [];
    let scene;
    let loading;
    let focused = 0;
    let selected = -1;
    let hovered = -1;
    let imageIndex = 0;
    let imageCount = productImages.length;
    let openPanel = null;
    let readySent = false;

    const sendReady = () => {
        if (readySent) return;
        readySent = true;
        window.dispatchEvent(new CustomEvent("pog:room-ready", { detail: { roomId: ROOM_ID } }));
    };

    const setProductImage = (index) => {
        imageIndex = (index + imageCount) % imageCount;
        productImages.forEach((image, itemIndex) => image.classList.toggle("is-active", itemIndex === imageIndex));
        imageIndicators.forEach((indicator, itemIndex) => indicator.classList.toggle("is-active", itemIndex === imageIndex));
    };

    const ensureImageSlots = (count) => {
        while (productImages.length < count) {
            const image = document.createElement("figure");
            image.className = "collections-product-image";
            image.dataset.collectionsProductImage = "";
            image.hidden = true;
            imageContainer.append(image);
            productImages.push(image);

            const indicator = document.createElement("span");
            indicator.hidden = true;
            indicatorContainer.append(indicator);
            imageIndicators.push(indicator);
        }
    };

    const closePanels = () => {
        openPanel = null;
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        drawer.inert = true;
        panels.forEach((panel) => { panel.hidden = true; });
        actionButtons.forEach((button) => {
            button.classList.remove("is-active");
            button.setAttribute("aria-expanded", "false");
        });
    };

    const togglePanel = (name) => {
        if (openPanel === name) return closePanels();
        openPanel = name;
        drawer.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
        drawer.inert = false;
        panels.forEach((panel) => { panel.hidden = panel.dataset.collectionsPanel !== name; });
        actionButtons.forEach((button) => {
            const active = button.dataset.collectionsAction === name;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-expanded", String(active));
        });
    };

    const buildSizes = (product) => {
        sizeOptions.replaceChildren(...product.sizes.map((value) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = value;
            button.setAttribute("aria-label", `Select size ${value}`);
            button.setAttribute("aria-pressed", "false");
            button.addEventListener("click", () => {
                chosenSize = value;
                sizeOptions.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
                sizeFeedback.textContent = `SIZE ${value} SELECTED`;
                page.querySelector('[data-collections-action="size"]').textContent = `SIZE ${value}`;
                order.size(value);
                sound("confirm");
            });
            return button;
        }));
        sizeFeedback.textContent = "";
    };

    const fillProduct = (index) => {
        const product = products[index];
        type.textContent = product.type;
        title.textContent = product.title;
        chosenSize = null;
        page.querySelector('[data-collections-action="size"]').textContent = "SIZE";
        order.product(product, orderSettings);
        description.textContent = product.description;
        spec.textContent = `${product.colours.join(" / ")} · PLACEHOLDER MATERIAL AND CONSTRUCTION DETAILS`;
        imageCount = product.images?.length || placeholderTemplates.length;
        ensureImageSlots(imageCount);
        productImages.forEach((image, itemIndex) => {
            const asset = product.images?.[itemIndex];
            const content = asset ? document.createElement("img") : (placeholderTemplates[itemIndex] || placeholderTemplates.at(-1)).cloneNode(true);
            if (asset) {
                content.className = "collections-product-photo";
                content.src = asset.src;
                content.alt = asset.alt;
                content.decoding = "async";
            } else {
                content.querySelector("[data-collections-image-title]").textContent = product.title;
            }
            image.replaceChildren(content);
            image.hidden = itemIndex >= imageCount;
        });
        imageIndicators.forEach((indicator, itemIndex) => { indicator.hidden = itemIndex >= imageCount; });
        imagePrevious.hidden = imageCount < 2;
        imageNext.hidden = imageCount < 2;
        buildSizes(product);
        setProductImage(0);
    };

    const revealProduct = () => {
        fillProduct(focused);
        closePanels();
        room.classList.add("is-product-open");
        page.classList.add("is-visible");
        page.setAttribute("aria-hidden", "false");
        page.inert = false;
        page.scrollTop = 0;
        back.setAttribute("aria-label", "Back to collection");
    };

    const hideProduct = () => {
        closePanels();
        room.classList.remove("is-product-open");
        page.classList.remove("is-visible");
        page.setAttribute("aria-hidden", "true");
        page.inert = true;
    };

    const selectProduct = (index) => {
        if (!products.length) return;
        focused = (index + products.length) % products.length;
        selected = focused;
        revealProduct();
        scene?.setFocus(focused, null);
    };

    const closeProduct = () => {
        selected = -1;
        hideProduct();
        scene?.clearSelected();
        back.setAttribute("aria-label", "Back");
    };

    const mount = async () => {
        loading ||= Promise.all([
            fetch("data/collections.json").then((response) => {
                if (!response.ok) throw new Error("Collections data unavailable");
                return response.json();
            }),
            import("./collections-scene.js")
        ]);
        try {
            const [data, module] = await loading;
            products = data.products;
            orderSettings = data.madeToOrder || {};
            scene = module.mountCollectionsScene(canvas, products, {
                onLoaded(index, failed) {
                    if (failed) console.warn(`Collection placeholder ${index + 1} could not be loaded.`);
                },
                onReady() {
                    stage.classList.add("is-ready");
                    stage.setAttribute("aria-busy", "false");
                    status.textContent = "";
                    sendReady();
                },
                onHover(index) {
                    const nextHover = Number.isInteger(index) ? index : -1;
                    if (nextHover >= 0 && nextHover !== hovered) sound("select");
                    hovered = nextHover;
                },
                onActivate(index) {
                    if (!Number.isInteger(index)) return;
                    sound("confirm");
                    selectProduct(index);
                }
            });
            scene.setFocus(focused, null);
            stage.classList.add("is-ready");
            sendReady();
        } catch (error) {
            console.error(error);
            status.textContent = "COLLECTIONS PREVIEW UNAVAILABLE";
            stage.setAttribute("aria-busy", "false");
            sendReady();
        }
    };

    imagePrevious.addEventListener("click", () => setProductImage(imageIndex - 1));
    imageNext.addEventListener("click", () => setProductImage(imageIndex + 1));
    actionButtons.forEach((button) => button.addEventListener("click", () => {
        const name = button.dataset.collectionsAction;
        if (name === "enquiry" && !chosenSize) {
            if (openPanel !== "size") togglePanel("size");
            sizeFeedback.textContent = "CHOOSE YOUR SIZE TO CONTINUE";
            sizeOptions.querySelector("button")?.focus();
            return;
        }
        togglePanel(name);
    }));
    back.addEventListener("click", (event) => {
        if (selected < 0) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        closeProduct();
        back.focus();
    }, true);

    room.addEventListener("keydown", (event) => {
        if (["ArrowLeft", "ArrowRight"].includes(event.key) && event.target.closest("input, select, textarea")) return;
        if (event.key === "ArrowLeft") {
            if (selected < 0) return;
            event.preventDefault();
            setProductImage(imageIndex - 1);
        } else if (event.key === "ArrowRight") {
            if (selected < 0) return;
            event.preventDefault();
            setProductImage(imageIndex + 1);
        } else if (event.key === "Escape") {
            if (openPanel) {
                event.stopPropagation();
                const trigger = actionButtons.find((button) => button.dataset.collectionsAction === openPanel);
                closePanels();
                trigger?.focus();
            } else if (selected >= 0) {
                event.stopPropagation();
                closeProduct();
            }
        }
    });

    window.addEventListener("pog:collections-open-product", (event) => {
        if (!Number.isInteger(event.detail?.index)) return;
        selectProduct(event.detail.index);
    });

    window.addEventListener("pog:room-opened", (event) => {
        if (event.detail?.roomId !== ROOM_ID) return;
        readySent = false;
        sendReady();
        mount();
    });
    window.addEventListener("pog:room-closed", (event) => {
        if (event.detail?.roomId !== ROOM_ID) return;
        scene?.detach();
        closeProduct();
    });
}
