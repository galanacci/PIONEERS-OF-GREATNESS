import * as THREE from "../vendor/three/three.module.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";

const ASSETS = Object.freeze({
    workspace: "src/video-journal/workspace-scan.glb"
});

// Spatial calibration remains isolated here so the room can evolve without rebuilding its interaction layer.
export const VIDEO_JOURNAL_LAYOUT = Object.freeze({
    workspaceWidth: 6.2,
    camera: Object.freeze({ position: Object.freeze([0, 0.08, 3.4]), target: Object.freeze([0, 0.08, 0]) })
});

let retainedScene;

export function mountVideoJournalScene(host, hooks = {}) {
    retainedScene ||= new VideoJournalScene();
    retainedScene.attach(host, hooks);
    return retainedScene;
}

class VideoJournalScene {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x17120e);
        this.scene.fog = new THREE.FogExp2(0x17120e, 0.04);
        this.camera = new THREE.PerspectiveCamera(39, 1, 0.05, 40);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.25 : 1.5));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.92;
        this.renderer.domElement.className = "documentary-renderer";
        this.renderer.domElement.tabIndex = -1;
        this.renderer.domElement.setAttribute("aria-hidden", "true");
        this.loader = new GLTFLoader();
        this.scene.environment = this.createStudioEnvironment();
        this.scene.environmentIntensity = 1.1;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.clock = new THREE.Clock();
        this.loaded = false;
        this.failed = false;
        this.hovered = false;
        this.frame = 0;
        this.bootPromise = null;
        this.screenMode = "off";
        this.staticFrame = 0;
        this.mouse = new THREE.Vector2();
        this.televisionMeshes = [];
        this.cameraTarget = new THREE.Vector3(...VIDEO_JOURNAL_LAYOUT.camera.target);
        this.lastScreenRect = "";

        this.screenCanvas = document.createElement("canvas");
        this.screenCanvas.width = 512;
        this.screenCanvas.height = 384;
        this.screenContext = this.screenCanvas.getContext("2d", { alpha: false });
        this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
        this.screenTexture.colorSpace = THREE.SRGBColorSpace;
        this.screenTexture.minFilter = THREE.LinearFilter;
        this.screenTexture.flipY = false;
        this.drawScreen("off");

        this.scene.add(new THREE.HemisphereLight(0xc8b79e, 0x100d0b, .8));
        this.screenGlow = new THREE.PointLight(0xa9c8d7, 0, 3.2, 2);
        this.screenGlow.position.set(0.08, 0.18, 1.55);
        this.scene.add(this.screenGlow);

        this.tick = this.tick.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerLeave = this.onPointerLeave.bind(this);
        this.onResize = this.onResize.bind(this);
        this.load();
    }

    createStudioEnvironment() {
        const studio = new THREE.Scene();
        studio.background = new THREE.Color(0x17120e);
        const panel = (colour, size, position) => {
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(...size),
                new THREE.MeshBasicMaterial({ color: colour, side: THREE.DoubleSide })
            );
            mesh.position.set(...position);
            mesh.lookAt(0, 0, 0);
            studio.add(mesh);
            return mesh;
        };
        panel(0xffdfb7, [5.5, 3.2], [-3.8, 4.5, 4.2]);
        panel(0x66727a, [3.4, 4.8], [4.6, 1.2, 3.2]);
        panel(0x7a4c2d, [5.8, 2.5], [-2.4, -3.5, 1.5]);
        const generator = new THREE.PMREMGenerator(this.renderer);
        const target = generator.fromScene(studio, .08);
        generator.dispose();
        studio.traverse((node) => {
            node.geometry?.dispose?.();
            node.material?.dispose?.();
        });
        return target.texture;
    }

    async load() {
        try {
            const workspace = await this.loadAsset(ASSETS.workspace);
            this.prepareWorkspace(workspace.scene);
            this.loaded = true;
            this.hooks?.onReady?.();
            this.start();
        } catch (error) {
            this.failed = true;
            console.error("Video Journal reconstruction could not be loaded.", error);
            this.hooks?.onError?.(error);
        }
    }

    loadAsset(url) {
        return new Promise((resolve, reject) => this.loader.load(url, resolve, undefined, reject));
    }

    prepareWorkspace(root) {
        root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        const scale = VIDEO_JOURNAL_LAYOUT.workspaceWidth / size.x;
        root.position.sub(centre);
        root.scale.setScalar(scale);
        root.traverse((node) => {
            if (!node.isMesh) return;
            node.castShadow = false;
            node.receiveShadow = false;
            const materials = [].concat(node.material || []).map((material) => {
                const materialName = material?.name || "";
                const isTelevision = /^TV(?:front|screen|back)$/i.test(materialName);
                if (isTelevision) {
                    node.userData.isTelevision = true;
                    if (!this.televisionMeshes.includes(node)) this.televisionMeshes.push(node);
                }
                if (/^TVScreen$/i.test(materialName)) {
                    this.screenMesh = node;
                    return new THREE.MeshBasicMaterial({
                        name: "TVScreenInteractive",
                        map: this.screenTexture,
                        color: 0xffffff,
                        toneMapped: false
                    });
                }
                if (!material?.map) return material;
                material.map.colorSpace = THREE.SRGBColorSpace;
                material.map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
                if (/^TV(?:front|back)$/i.test(materialName)) {
                    const televisionMaterial = material.clone();
                    televisionMaterial.name = materialName;
                    televisionMaterial.map = material.map;
                    televisionMaterial.color.multiplyScalar(.88);
                    televisionMaterial.envMapIntensity = .45;
                    televisionMaterial.needsUpdate = true;
                    return televisionMaterial;
                }
                return new THREE.MeshBasicMaterial({
                    name: materialName,
                    map: material.map,
                    color: /^Unnamed$/i.test(materialName) ? 0xffd0a3 : 0xffffff,
                    side: material.side
                });
            });
            node.material = Array.isArray(node.material) ? materials : materials[0];
        });
        this.workspace = root;
        this.scene.add(root);
        root.updateMatrixWorld(true);
        const televisionBox = this.televisionMeshes.length
            ? new THREE.Box3().setFromObject(this.televisionMeshes[0])
            : null;
        this.televisionMeshes.slice(1).forEach((mesh) => televisionBox?.expandByObject(mesh));
        if (televisionBox && !televisionBox.isEmpty()) {
            const televisionCentre = televisionBox.getCenter(new THREE.Vector3());
            this.cameraTarget.copy(televisionCentre);
            this.screenGlow.position.copy(televisionCentre);
            this.screenGlow.position.z += 0.18;
            this.placeTelevisionLights(televisionCentre);
        }
    }

    placeTelevisionLights(centre) {
        this.televisionLights?.removeFromParent();
        const rig = new THREE.Group();
        const addDirectional = (colour, intensity, offset) => {
            const light = new THREE.DirectionalLight(colour, intensity);
            light.position.copy(centre).add(new THREE.Vector3(...offset));
            light.target.position.copy(centre);
            rig.add(light, light.target);
        };
        addDirectional(0xffdfb7, 3.1, [-2.8, 3.4, 4.8]);
        addDirectional(0xc8d2d7, 1.05, [3.1, 1.2, 3.5]);
        addDirectional(0xffa65c, .9, [-3.4, 1.8, -2.2]);
        this.televisionLights = rig;
        this.scene.add(rig);
    }

    attach(host, hooks) {
        this.detach();
        this.host = host;
        this.hooks = hooks;
        host.prepend(this.renderer.domElement);
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.resizeObserver.observe(host);
        this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
        this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
        this.renderer.domElement.addEventListener("pointerleave", this.onPointerLeave);
        this.onResize();
        if (this.loaded) hooks.onReady?.();
        else if (this.failed) hooks.onError?.();
        this.start();
    }

    detach() {
        this.stop();
        this.resizeObserver?.disconnect();
        this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
        this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
        this.renderer.domElement.removeEventListener("pointerleave", this.onPointerLeave);
        this.renderer.domElement.remove();
        this.host = null;
        this.hooks = null;
    }

    onResize() {
        if (!this.host) return;
        const { width, height } = this.host.getBoundingClientRect();
        if (width < 1 || height < 1) return;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.lastScreenRect = "";
        this.start();
    }

    emitScreenRect() {
        if (!this.screenMesh || !this.host || !this.hooks?.onScreenRect) return;
        const { width, height } = this.host.getBoundingClientRect();
        if (width < 1 || height < 1) return;
        this.screenMesh.updateWorldMatrix(true, false);
        this.camera.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(this.screenMesh);
        const min = box.min;
        const max = box.max;
        const corners = [
            [min.x,min.y,min.z],[min.x,min.y,max.z],[min.x,max.y,min.z],[min.x,max.y,max.z],
            [max.x,min.y,min.z],[max.x,min.y,max.z],[max.x,max.y,min.z],[max.x,max.y,max.z]
        ].map(([x,y,z]) => new THREE.Vector3(x,y,z).project(this.camera));
        const left = Math.max(0, Math.min(...corners.map((point) => (point.x + 1) * .5 * width)));
        const right = Math.min(width, Math.max(...corners.map((point) => (point.x + 1) * .5 * width)));
        const top = Math.max(0, Math.min(...corners.map((point) => (1 - point.y) * .5 * height)));
        const bottom = Math.min(height, Math.max(...corners.map((point) => (1 - point.y) * .5 * height)));
        const rect = {
            left: Math.round(left),
            top: Math.round(top),
            width: Math.round(Math.max(0, right - left)),
            height: Math.round(Math.max(0, bottom - top))
        };
        const signature = `${rect.left}:${rect.top}:${rect.width}:${rect.height}`;
        if (signature === this.lastScreenRect) return;
        this.lastScreenRect = signature;
        this.hooks.onScreenRect(rect);
    }

    pick(event) {
        if (!this.televisionMeshes.length || !this.host) return false;
        const rect = this.host.getBoundingClientRect();
        this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        return this.raycaster.intersectObjects(this.televisionMeshes, false).length > 0;
    }

    onPointerMove(event) {
        const rect = this.host.getBoundingClientRect();
        this.mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
        const hovered = this.pick(event);
        if (hovered === this.hovered) return;
        this.hovered = hovered;
        this.renderer.domElement.style.cursor = hovered ? "pointer" : "default";
        this.hooks?.onHover?.(hovered);
    }

    onPointerDown(event) {
        if (!this.pick(event) || this.bootPromise) return;
        this.hooks?.onActivate?.();
    }

    onPointerLeave() {
        this.hovered = false;
        this.mouse.set(0, 0);
        this.renderer.domElement.style.cursor = "default";
        this.hooks?.onHover?.(false);
    }

    reset() {
        this.bootPromise = null;
        this.screenMode = "off";
        this.screenGlow.intensity = 0;
        this.drawScreen("off");
        this.start();
    }

    boot() {
        if (this.bootPromise) return this.bootPromise;
        this.bootPromise = (async () => {
            this.hooks?.onCrtPower?.();
            this.screenMode = "line";
            this.screenGlow.intensity = 0.45;
            this.drawScreen("line");
            await this.wait(420);
            this.screenMode = "static";
            this.screenGlow.intensity = 1.1;
            this.hooks?.onCrtStaticStart?.(920);
            await this.wait(920);
            this.hooks?.onCrtStaticEnd?.();
            this.screenMode = "tracking";
            this.drawScreen("tracking");
            await this.wait(760);
            this.screenMode = "ready";
            this.drawScreen("ready");
            await this.wait(620);
        })();
        return this.bootPromise;
    }

    beginPlayback() {
        this.screenMode = "playback";
        this.screenGlow.intensity = .22;
        this.drawScreen("playback");
        this.start();
    }

    wait(duration) {
        return new Promise((resolve) => window.setTimeout(resolve, duration));
    }

    drawScreen(mode) {
        const context = this.screenContext;
        const { width, height } = this.screenCanvas;
        context.fillStyle = mode === "off" ? "#070807" : "#020303";
        context.fillRect(0, 0, width, height);
        if (mode === "line") {
            const gradient = context.createLinearGradient(0, height / 2 - 8, 0, height / 2 + 8);
            gradient.addColorStop(0, "rgba(220,245,240,0)");
            gradient.addColorStop(.5, "rgba(235,255,250,1)");
            gradient.addColorStop(1, "rgba(220,245,240,0)");
            context.fillStyle = gradient;
            context.fillRect(0, height / 2 - 10, width, 20);
        } else if (mode === "static") {
            const image = context.createImageData(width, height);
            for (let index = 0; index < image.data.length; index += 4) {
                const value = Math.random() * 210;
                image.data[index] = value;
                image.data[index + 1] = value;
                image.data[index + 2] = value;
                image.data[index + 3] = 255;
            }
            context.putImageData(image, 0, 0);
        } else if (mode === "tracking" || mode === "ready") {
            const shift = mode === "tracking" ? Math.sin(performance.now() * .02) * height * .12 : 0;
            const glow = context.createLinearGradient(0,height * .34 + shift,0,height * .66 + shift);
            glow.addColorStop(0,"rgba(205,218,210,0)");
            glow.addColorStop(.44,mode === "tracking" ? "rgba(205,218,210,.08)" : "rgba(205,218,210,.025)");
            glow.addColorStop(.5,mode === "tracking" ? "rgba(225,236,229,.18)" : "rgba(225,236,229,.06)");
            glow.addColorStop(.56,mode === "tracking" ? "rgba(205,218,210,.08)" : "rgba(205,218,210,.025)");
            glow.addColorStop(1,"rgba(205,218,210,0)");
            context.fillStyle = glow;
            context.fillRect(0,0,width,height);
        }
        this.drawGlassReflection(mode);
        context.fillStyle = "rgba(0,0,0,.18)";
        for (let y = 0; y < height; y += 4) context.fillRect(0, y, width, 2);
        this.screenTexture.needsUpdate = true;
    }

    drawGlassReflection(mode) {
        const context = this.screenContext;
        const { width, height } = this.screenCanvas;
        const strength = mode === "off" ? 1 : mode === "line" ? .58 : .16;
        context.save();
        context.globalCompositeOperation = "screen";

        const roomGlow = context.createRadialGradient(width * .24, height * .05, 4, width * .32, height * .24, width * .72);
        roomGlow.addColorStop(0, `rgba(224,226,218,${.15 * strength})`);
        roomGlow.addColorStop(.34, `rgba(168,172,166,${.06 * strength})`);
        roomGlow.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = roomGlow;
        context.fillRect(0, 0, width, height);

        const glassCurve = context.createLinearGradient(0, 0, 0, height);
        glassCurve.addColorStop(0, `rgba(210,216,209,${.08 * strength})`);
        glassCurve.addColorStop(.13, `rgba(145,151,146,${.03 * strength})`);
        glassCurve.addColorStop(.58, "rgba(0,0,0,0)");
        glassCurve.addColorStop(1, `rgba(170,145,112,${.022 * strength})`);
        context.fillStyle = glassCurve;
        context.fillRect(0, 0, width, height);

        context.globalCompositeOperation = "multiply";
        const edgeFalloff = context.createRadialGradient(width / 2, height / 2, width * .22, width / 2, height / 2, width * .65);
        edgeFalloff.addColorStop(0, "rgba(255,255,255,1)");
        edgeFalloff.addColorStop(.72, "rgba(235,235,235,.96)");
        edgeFalloff.addColorStop(1, "rgba(32,32,32,.82)");
        context.fillStyle = edgeFalloff;
        context.fillRect(0, 0, width, height);
        context.restore();
    }

    start() {
        if (this.frame || !this.host?.isConnected || document.hidden) return;
        this.clock.start();
        this.frame = requestAnimationFrame(this.tick);
    }

    stop() {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.clock.stop();
    }

    tick() {
        this.frame = 0;
        if (!this.host?.isConnected || document.hidden) return;
        const elapsed = this.clock.getElapsedTime();
        const cameraConfig = VIDEO_JOURNAL_LAYOUT.camera;
        const mobile = innerWidth < 760;
        const baseZ = mobile ? 4.8 : cameraConfig.position[2];
        this.camera.position.set(
            this.cameraTarget.x + cameraConfig.position[0] + this.mouse.x * .055,
            this.cameraTarget.y + cameraConfig.position[1] - this.mouse.y * .035,
            this.cameraTarget.z + baseZ
        );
        this.camera.lookAt(this.cameraTarget);
        if (this.screenMode === "static" && elapsed - this.staticFrame > .055) {
            this.staticFrame = elapsed;
            this.drawScreen("static");
        }
        if (this.screenMode === "tracking" && elapsed - this.staticFrame > .09) {
            this.staticFrame = elapsed;
            this.drawScreen("tracking");
        }
        this.renderer.render(this.scene, this.camera);
        this.emitScreenRect();
        this.frame = requestAnimationFrame(this.tick);
    }
}
