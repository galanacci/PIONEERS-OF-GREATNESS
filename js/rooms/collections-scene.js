import * as THREE from "../vendor/three/three.module.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";

let retainedShowroom;

export function mountCollectionsScene(host, products, hooks) {
    retainedShowroom ||= new CollectionsScene(products);
    retainedShowroom.attach(host, hooks);
    return retainedShowroom;
}

class CollectionsScene {
    constructor(products) {
        this.products = products;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.18;
        this.renderer.domElement.className = "collections-renderer";
        this.renderer.domElement.setAttribute("aria-hidden", "true");
        this.loader = new GLTFLoader();
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.target = new THREE.Vector3();
        this.mobile = matchMedia("(max-width: 760px)");
        this.items = [];
        this.focused = 0;
        this.selected = null;
        this.hovered = null;
        this.elapsed = 0;
        this.frame = 0;
        this.last = 0;
        this.pointerDown = null;

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x111117, 2.8));
        const key = new THREE.DirectionalLight(0xffffff, 3.1);
        key.position.set(-4, 6, 8);
        this.scene.add(key);
        const rim = new THREE.DirectionalLight(0x8e70c9, 1.15);
        rim.position.set(5, 1, -4);
        this.scene.add(rim);

        products.forEach((product, index) => this.loadProduct(product, index));
        this.tick = this.tick.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerLeave = this.onPointerLeave.bind(this);
        this.onVisibility = () => document.hidden ? this.stop() : this.start();
    }

    loadProduct(product, index) {
        const group = new THREE.Group();
        group.userData.collectionIndex = index;
        const orientation = new THREE.Group();
        group.add(orientation);
        this.scene.add(group);
        const item = {
            product, group, orientation, materials: [], loaded: false,
            phase: index * 1.47, baseYaw: index % 2 ? -0.16 : 0.16
        };
        this.items.push(item);
        this.loader.load(product.model, ({ scene }) => {
            scene.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(scene);
            const size = box.getSize(new THREE.Vector3());
            const centre = box.getCenter(new THREE.Vector3());
            const longest = Math.max(size.x, size.y, size.z);
            if (!Number.isFinite(longest) || longest <= 0) return this.fail(item);
            scene.position.sub(centre);
            const normalised = new THREE.Group();
            normalised.add(scene);
            normalised.scale.setScalar(2.35 / longest);
            orientation.add(normalised);
            const unique = new Set();
            scene.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = false;
                    node.receiveShadow = false;
                }
                for (const material of [].concat(node.material || [])) {
                    if (unique.has(material)) continue;
                    unique.add(material);
                    if (material.color) item.materials.push({ material, colour: material.color.clone() });
                }
            });
            item.loaded = true;
            this.hooks?.onLoaded(index, false);
            this.checkReady();
            this.start();
        }, undefined, () => this.fail(item));
    }

    fail(item) {
        const fallback = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.7, 1),
            new THREE.MeshStandardMaterial({ color: 0x555555, wireframe: true })
        );
        item.orientation.add(fallback);
        item.loaded = true;
        this.hooks?.onLoaded(this.items.indexOf(item), true);
        this.checkReady();
        this.start();
    }

    checkReady() {
        if (this.items.length === this.products.length && this.items.every((item) => item.loaded)) {
            this.hooks?.onReady();
        }
    }

    attach(host, hooks) {
        this.detach();
        this.host = host;
        this.hooks = hooks;
        host.prepend(this.renderer.domElement);
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(host);
        const canvas = this.renderer.domElement;
        canvas.addEventListener("pointermove", this.onPointerMove);
        canvas.addEventListener("pointerdown", this.onPointerDown);
        canvas.addEventListener("pointerup", this.onPointerUp);
        canvas.addEventListener("pointercancel", this.onPointerLeave);
        canvas.addEventListener("pointerleave", this.onPointerLeave);
        document.addEventListener("visibilitychange", this.onVisibility);
        this.resize();
        this.items.forEach((item, index) => item.loaded && hooks.onLoaded(index, false));
        this.checkReady();
        this.start();
    }

    detach() {
        this.stop();
        this.observer?.disconnect();
        document.removeEventListener("visibilitychange", this.onVisibility);
        const canvas = this.renderer.domElement;
        canvas.removeEventListener("pointermove", this.onPointerMove);
        canvas.removeEventListener("pointerdown", this.onPointerDown);
        canvas.removeEventListener("pointerup", this.onPointerUp);
        canvas.removeEventListener("pointercancel", this.onPointerLeave);
        canvas.removeEventListener("pointerleave", this.onPointerLeave);
        canvas.remove();
        this.host = null;
        this.hooks = null;
    }

    resize() {
        if (!this.host) return;
        const { width, height } = this.host.getBoundingClientRect();
        if (width < 1 || height < 1) return;
        this.width = width;
        this.height = height;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.start();
    }

    setFocus(index, selected = this.selected) {
        this.focused = (index + this.items.length) % this.items.length;
        this.selected = selected;
        if (this.mobile.matches && selected !== null) this.items[this.focused]?.group.position.setX(0);
        this.start();
    }

    setSelected(index) {
        this.setFocus(index, index);
    }

    clearSelected() {
        this.selected = null;
        this.start();
    }

    start() {
        if (this.frame || !this.host?.isConnected || document.hidden) return;
        this.last = performance.now();
        this.frame = requestAnimationFrame(this.tick);
    }

    stop() {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
    }

    tick(now) {
        this.frame = 0;
        if (!this.host?.isConnected || document.hidden) return;
        const dt = Math.min((now - this.last) / 1000, 0.05);
        this.last = now;
        this.elapsed += dt;
        const mobile = this.mobile.matches;
        const cameraZ = mobile ? 7.6 : 10.6;
        this.camera.position.lerp(new THREE.Vector3(0, 0.05, cameraZ), 1 - Math.exp(-dt * 4.5));
        this.camera.lookAt(0, 0, 0);

        this.items.forEach((item, index) => {
            const active = index === this.selected;
            const isFocused = index === this.focused;
            item.group.visible = this.selected === null || active;
            if (!item.group.visible) return;
            let x;
            let layoutY = 0;
            if (mobile) {
                const column = index % 3;
                const row = Math.floor(index / 3);
                const visibleHalfWidth = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * cameraZ * this.camera.aspect;
                x = (column - 1) * visibleHalfWidth * 0.67;
                layoutY = (0.5 - row) * 1.3 + 0.28;
            } else {
                const visibleHalfWidth = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * cameraZ * this.camera.aspect;
                x = (((index + 0.5) / this.items.length) * 2 - 1) * visibleHalfWidth * 0.94;
            }
            if (active) {
                const visibleHalfWidth = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * cameraZ * this.camera.aspect;
                const panelRatio = Math.min(window.innerWidth * 0.34, 440) / window.innerWidth;
                x = mobile ? 0 : -visibleHalfWidth * panelRatio;
                layoutY = mobile ? 1.58 : 0.04;
            }
            const floatY = active ? 0 : Math.sin(this.elapsed * (0.7 + index * 0.035) + item.phase) * 0.03;
            const y = layoutY + floatY - 0.06;
            const z = active ? 0.5 : isFocused ? 0.04 : -0.08;
            this.target.set(x, y, z);
            item.group.position.lerp(this.target, 1 - Math.exp(-dt * 5.5));
            const baseScale = active
                ? (mobile ? 0.55 : 1.55)
                : mobile
                    ? 0.37
                    : 0.65;
            const scale = baseScale * (this.hovered === index ? 1.055 : 1);
            item.group.scale.lerp(this.target.setScalar(scale), 1 - Math.exp(-dt * 5.5));
            item.orientation.rotation.y = active
                ? item.orientation.rotation.y
                : item.baseYaw + Math.sin(this.elapsed * (0.42 + index * 0.025) + item.phase) * 0.13;
            const dim = this.selected !== null && !active ? 0.16 : isFocused || active ? 1 : 0.68;
            item.materials.forEach(({ material, colour }) => material.color.copy(colour).multiplyScalar(dim));
        });

        this.renderer.render(this.scene, this.camera);
        this.frame = requestAnimationFrame(this.tick);
    }

    pick(clientX, clientY) {
        if (!this.host) return null;
        const rect = this.host.getBoundingClientRect();
        this.pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObjects(this.items.filter((item) => item.group.visible).map((item) => item.group), true);
        for (const hit of hits) {
            let node = hit.object;
            while (node) {
                if (Number.isInteger(node.userData.collectionIndex)) return node.userData.collectionIndex;
                node = node.parent;
            }
        }
        return null;
    }

    onPointerMove(event) {
        if (this.pointerDown && this.selected !== null && event.pointerId === this.pointerDown.id) {
            const dx = event.clientX - this.pointerDown.x;
            if (Math.abs(dx) > 3) this.pointerDown.moved = true;
            this.items[this.selected].orientation.rotation.y += dx * 0.008;
            this.pointerDown.x = event.clientX;
            this.start();
            return;
        }
        const next = this.pick(event.clientX, event.clientY);
        if (next !== this.hovered) {
            this.hovered = next;
            this.renderer.domElement.style.cursor = next === null ? "default" : "pointer";
            this.hooks?.onHover(next);
            this.start();
        }
    }

    onPointerDown(event) {
        this.pointerDown = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        this.renderer.domElement.setPointerCapture?.(event.pointerId);
    }

    onPointerUp(event) {
        const gesture = this.pointerDown;
        this.pointerDown = null;
        if (!gesture || gesture.moved) return;
        const index = this.pick(event.clientX, event.clientY);
        this.hooks?.onActivate(index);
    }

    onPointerLeave() {
        this.pointerDown = null;
        if (this.hovered !== null) {
            this.hovered = null;
            this.hooks?.onHover(null);
            this.start();
        }
    }

}
