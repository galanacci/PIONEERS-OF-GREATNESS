import { COLLECTIONS_PREVIEW_ENABLED } from "../room-registry.js";

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
    const roomCartButton = room?.querySelector("[data-collections-room-cart]");
    const roomCartDrawer = document.getElementById("collections-room-cart-drawer");
    const roomCartCount = document.getElementById("collections-room-cart-count");
    const roomCartEmpty = document.getElementById("collections-room-cart-empty");
    const roomCartList = document.getElementById("collections-room-cart-list");
    const imagePrevious = page?.querySelector(".collections-image-previous");
    const imageNext = page?.querySelector(".collections-image-next");
    if (!room || !stage || !canvas || !status || !page || !back || !roomCartButton || !roomCartDrawer || !roomCartCount || !roomCartEmpty || !roomCartList || !imagePrevious || !imageNext) return;

    const type = document.getElementById("collections-product-type");
    const title = document.getElementById("collections-product-title");
    const price = document.getElementById("collections-product-price");
    const description = document.getElementById("collections-product-description");
    const spec = document.getElementById("collections-product-spec");
    const drawer = document.getElementById("collections-product-drawer");
    const sizeOptions = document.getElementById("collections-size-options");
    const sizeFeedback = document.getElementById("collections-size-feedback");
    const cartCount = document.getElementById("collections-cart-count");
    const cartEmpty = document.getElementById("collections-cart-empty");
    const cartList = document.getElementById("collections-cart-list");
    const placeholderTitles = [...page.querySelectorAll("[data-collections-image-title]")];
    const productImages = [...page.querySelectorAll("[data-collections-product-image]")];
    const imageIndicators = [...page.querySelectorAll(".collections-image-indicators span")];
    const actionButtons = [...page.querySelectorAll("[data-collections-action]")];
    const panels = [...page.querySelectorAll("[data-collections-panel]")];
    if (!type || !title || !price || !description || !spec || !drawer || !sizeOptions || !sizeFeedback || !cartCount || !cartEmpty || !cartList) return;

    let products = [];
    let scene;
    let loading;
    let focused = 0;
    let selected = -1;
    let hovered = -1;
    let imageIndex = 0;
    let openPanel = null;
    let readySent = false;
    const cart = [];

    const sendReady = () => {
        if (readySent) return;
        readySent = true;
        window.dispatchEvent(new CustomEvent("pog:room-ready", { detail: { roomId: ROOM_ID } }));
    };

    const setProductImage = (index) => {
        imageIndex = (index + productImages.length) % productImages.length;
        productImages.forEach((image, itemIndex) => image.classList.toggle("is-active", itemIndex === imageIndex));
        imageIndicators.forEach((indicator, itemIndex) => indicator.classList.toggle("is-active", itemIndex === imageIndex));
    };

    const closePanels = () => {
        openPanel = null;
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
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
        panels.forEach((panel) => { panel.hidden = panel.dataset.collectionsPanel !== name; });
        actionButtons.forEach((button) => {
            const active = button.dataset.collectionsAction === name;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-expanded", String(active));
        });
    };

    const closeRoomCart = () => {
        roomCartDrawer.classList.remove("is-open");
        roomCartDrawer.setAttribute("aria-hidden", "true");
        roomCartButton.classList.remove("is-active");
        roomCartButton.setAttribute("aria-expanded", "false");
    };

    const toggleRoomCart = () => {
        const opening = !roomCartDrawer.classList.contains("is-open");
        closeRoomCart();
        if (!opening) return;
        roomCartDrawer.classList.add("is-open");
        roomCartDrawer.setAttribute("aria-hidden", "false");
        roomCartButton.classList.add("is-active");
        roomCartButton.setAttribute("aria-expanded", "true");
    };

    const fillCartList = (list) => {
        list.replaceChildren(...cart.map((entry) => {
            const item = document.createElement("li");
            item.innerHTML = `<span>${products[entry.productIndex].title}</span><span>SIZE ${entry.size}</span>`;
            return item;
        }));
    };

    const renderCart = () => {
        cartCount.textContent = String(cart.length);
        roomCartCount.textContent = String(cart.length);
        const cartButton = page.querySelector('[data-collections-action="cart"]');
        cartButton?.setAttribute("aria-label", `Cart, ${cart.length} item${cart.length === 1 ? "" : "s"}`);
        roomCartButton.setAttribute("aria-label", `Cart, ${cart.length} item${cart.length === 1 ? "" : "s"}`);
        cartEmpty.hidden = cart.length > 0;
        roomCartEmpty.hidden = cart.length > 0;
        fillCartList(cartList);
        fillCartList(roomCartList);
    };

    const addToCart = (size) => {
        cart.push({ productIndex: focused, size });
        renderCart();
        sizeFeedback.textContent = `SIZE ${size} ADDED TO CART`;
        sound("confirm");
    };

    const buildSizes = (product) => {
        sizeOptions.replaceChildren(...product.sizes.map((value) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = value;
            button.setAttribute("aria-label", `Add size ${value} to cart`);
            button.addEventListener("click", () => addToCart(value));
            return button;
        }));
        sizeFeedback.textContent = "";
    };

    const fillProduct = (index) => {
        const product = products[index];
        type.textContent = product.type;
        title.textContent = product.title;
        price.textContent = product.price;
        description.textContent = product.description;
        spec.textContent = `${product.colours.join(" / ")} · PLACEHOLDER MATERIAL AND CONSTRUCTION DETAILS`;
        placeholderTitles.forEach((node) => { node.textContent = product.title; });
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
        closeRoomCart();
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
            renderCart();
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
    roomCartButton.addEventListener("click", toggleRoomCart);
    actionButtons.forEach((button) => button.addEventListener("click", () => togglePanel(button.dataset.collectionsAction)));
    back.addEventListener("click", (event) => {
        if (selected < 0) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        closeProduct();
        back.focus();
    }, true);

    room.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
            if (selected < 0) return;
            event.preventDefault();
            setProductImage(imageIndex - 1);
        } else if (event.key === "ArrowRight") {
            if (selected < 0) return;
            event.preventDefault();
            setProductImage(imageIndex + 1);
        } else if (event.key === "Escape") {
            if (selected >= 0) {
                event.stopPropagation();
                closeProduct();
            } else if (roomCartDrawer.classList.contains("is-open")) {
                event.stopPropagation();
                closeRoomCart();
                roomCartButton.focus();
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
        closeRoomCart();
        closeProduct();
    });
}
