import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';

// One retained archive runtime. Detaching stops work; returning reuses its GPU resources.
let archive;
export function mountJourneyScene(host, memories, hooks) {
    if (!archive) archive = new JourneyScene(memories);
    archive.attach(host, hooks);
    return archive;
}

class JourneyScene {
    constructor(memories) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.domElement.setAttribute('aria-hidden','true');
        this.loader = new GLTFLoader();
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.anchor = new THREE.Vector3();
        this.target = new THREE.Vector3();
        this.quaternion = new THREE.Quaternion();
        // One shared radial texture, used only as a soft interaction indicator.
        const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
        const ctx=glowCanvas.getContext('2d');
        const gradient=ctx.createRadialGradient(64,64,0,64,64,64);
        gradient.addColorStop(0,'rgba(255,255,255,.9)');
        gradient.addColorStop(.35,'rgba(255,255,255,.45)');
        gradient.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
        this.glowTexture=new THREE.CanvasTexture(glowCanvas);
        this.scene.add(new THREE.HemisphereLight(0xffffff,0x777789,2.4));
        const key = new THREE.DirectionalLight(0xffffff,3.0);key.position.set(-3,6,8);this.scene.add(key);
        const fill = new THREE.DirectionalLight(0xdce3ff,1.6);fill.position.set(4,1,4);this.scene.add(fill);
        this.models = [];
        this.elapsed = 0;this.frame = 0;this.last = 0;this.renderCount = 0;
        this.mobile = matchMedia('(max-width:700px)');
        this.scene.userData.kind = 'PoG Journey archive';
        memories.forEach((memory,index)=>this.createArtefact(memory,index));
        this.tick = this.tick.bind(this);
        this.onVisibility = () => document.hidden ? this.stop() : this.start();
        this.onContextLost = e => {
            e.preventDefault();this.stop();this.hooks?.onFailure();
            // Next entry can build a fresh context rather than retaining a dead renderer.
            archive = null;
            this.dispose();
        };
        this.renderer.domElement.addEventListener('webglcontextlost',this.onContextLost);
    }

    createArtefact(memory,index) {
        const config = memory.scene;
        const group = new THREE.Group();group.userData.journeyIndex=index;
        const orientation = new THREE.Group();group.add(orientation);
        const rootRotation = new THREE.Euler(...config.baseRotation);
        orientation.quaternion.setFromEuler(rootRotation);
        const label = new THREE.Object3D();label.position.fromArray(config.labelOffset);group.add(label);
        group.position.fromArray(config.position);this.scene.add(group);
        const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color:0x673caf,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
        glow.renderOrder=-1;glow.raycast=()=>{};this.scene.add(glow);
        const item = {memory,group,orientation,label,glow,config,materials:[],yaw:config.startRotation || 0,loaded:false,failed:false,
            spin:config.startRotation + Math.random()*Math.PI*2,
            spinDelay:Math.random()*2.5,
            spinSpeed:config.idleRotationSpeed*(.8+Math.random()*.4)};
        this.models.push(item);
        this.loader.load(memory.media.src,gltf=>{
            if(this.destroyed){this.release(gltf.scene);return;}
            const model = gltf.scene;
            // Preserve GLB hierarchy/materials. Centre before applying the display orientation.
            model.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const centre = box.getCenter(new THREE.Vector3());
            const longest = Math.max(size.x,size.y,size.z);
            if(!Number.isFinite(longest)||longest<=0){this.release(model);this.fail(item);return;}
            model.position.sub(centre);
            const normalised = new THREE.Group();normalised.add(model);
            normalised.scale.setScalar(config.scale/longest);
            orientation.add(normalised);
            const unique=new Set();
            model.traverse(node=>{
                if(node.isMesh){node.castShadow=false;node.receiveShadow=false;}
                for(const material of [].concat(node.material || [])){
                    if(!unique.has(material)){unique.add(material);if(material.color)item.materials.push({material,base:material.color.clone()});}
                }
            });
            item.loaded=true;this.hooks?.onLoaded(index,false);this.start();
        },undefined,()=>this.fail(item));
    }

    fail(item) {
        if(this.destroyed)return;
        const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.35,0),new THREE.MeshStandardMaterial({color:0x888888,wireframe:true}));
        item.orientation.add(mesh);item.loaded=true;item.failed=true;
        this.hooks?.onLoaded(this.models.indexOf(item),true);this.start();
    }

    attach(host,hooks) {
        this.detach();this.host=host;this.hooks=hooks;this.snap=true;this.ready=false;
        host.prepend(this.renderer.domElement);
        this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
        document.addEventListener('visibilitychange',this.onVisibility);
        this.resize();
        this.models.forEach((item,i)=>{if(item.loaded)hooks.onLoaded(i,item.failed);});
        this.start();
    }
    resize() {
        if(!this.host)return;
        const {width,height}=this.host.getBoundingClientRect();
        if(width<1||height<1)return;
        this.width=width;this.height=height;
        this.renderer.setSize(width,height,false);this.camera.aspect=width/height;
        const tan=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));
        const halfW=this.mobile.matches?2.6:3.65,halfH=this.mobile.matches?2.95:3.1;
        this.camera.position.set(0,0,Math.max(halfH/tan,halfW/(tan*this.camera.aspect))+(this.mobile.matches?.35:1.1));
        this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();
        this.start();
    }
    setSelected() { this.start(); }
    start() {
        if(this.frame||!this.host?.isConnected||document.hidden||this.destroyed)return;
        this.last=performance.now();this.frame=requestAnimationFrame(this.tick);
    }
    stop() { cancelAnimationFrame(this.frame);this.frame=0; }
    tick(now) {
        this.frame=0;
        if(!this.host?.isConnected||document.hidden||this.destroyed)return;
        const dt=Math.min((now-this.last)/1000,.05);this.last=now;
        const selected=this.hooks.getSelected(),mobile=this.mobile.matches,reduced=this.hooks.isReduced();
        if(!reduced)this.elapsed+=dt;
        const blend=reduced||this.snap?1:1-Math.exp(-dt*5);
        this.models.forEach((item,i)=>{
            const {config,group,orientation}=item;
            let delta=(i-selected+this.models.length)%this.models.length;if(delta>4)delta-=8;
            // Different phases, delays and speeds give each object its own rhythm.
            if(!reduced&&this.elapsed>item.spinDelay)item.spin+=dt*item.spinSpeed*config.idleRotationDirection;
            group.visible=!mobile||Math.abs(delta)<=2;
            item.glow.visible=group.visible;
            if(!group.visible){this.hooks.onLabel(i,null);return;}
            {
                const desktopNeighbours={
                    '-3':[-2.75,-.85,-.55], '-2':[-2.65,1.3,-.4], '-1':[0,2.3,-.5],
                    1:[2.65,1.35,-.4], 2:[2.7,-.8,-.55], 3:[1.35,-2.2,-.5], 4:[-1.25,-2.2,-.55]
                };
                const placement=delta===0?[0,0,.55]:!mobile?desktopNeighbours[delta]:delta===-1?[-2,1.65,-.35]:delta===1?[2,1.65,-.35]:delta===-2?[-2,-1.65,-.55]:[2,-1.65,-.55];
                this.target.fromArray(placement);
                // Spread the archive across wide viewports instead of retaining a square cluster.
                if(!mobile)this.target.x*=Math.max(1,this.camera.aspect*.95);
            }
            const active=i===selected;
            if(active&&!reduced)this.target.add(new THREE.Vector3(...config.focusOffset));
            // The selected artefact breathes gently without rotating away from its viewing angle.
            if(!reduced){
                const floatSpeed=active?Math.PI*2/5.5:config.floatSpeed;
                const floatAmplitude=active?.2:config.floatAmplitude;
                this.target.y+=Math.sin(this.elapsed*floatSpeed+config.floatPhase)*floatAmplitude;
            }
            group.position.lerp(this.target,blend);
            const scale=active?(mobile?1.42:1.65):(mobile?.48:.65);
            const extra=this.hooks.isOpening()&&active&&!reduced?1.05:1;
            group.scale.lerp(this.target.setScalar(scale*extra),blend);
            const idle=reduced?config.startRotation:item.spin;
            const angle=(active?0:idle)-item.yaw;
            // Resolve by the shortest arc: selecting never causes a rapid unwind.
            item.yaw+=Math.atan2(Math.sin(angle),Math.cos(angle))*blend;
            group.rotation.y=item.yaw;
            const highlighted=this.hooks.getHovered?.()===i;
            item.glow.position.copy(group.position);item.glow.position.z-=config.scale*group.scale.x*.6;
            item.glow.scale.setScalar(config.scale*group.scale.x*1.85);
            const glowStrength=highlighted?.48:0;
            item.glow.material.opacity=THREE.MathUtils.lerp(item.glow.material.opacity,glowStrength,reduced?1:1-Math.exp(-dt*10));
            for(const {material,base} of item.materials)material.color.copy(base).multiplyScalar(active?1:.78);
        });
        this.snap=false;
        this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);
        this.renderer.render(this.scene,this.camera);this.renderCount++;
        this.models.forEach((item,i)=>{
            if(!item.group.visible)return;
            item.label.getWorldPosition(this.anchor).project(this.camera);
            const onScreen=Math.abs(this.anchor.x)<1.05&&Math.abs(this.anchor.y)<1.05&&Math.abs(this.anchor.z)<1;
            // DOM labels sit above the canvas, so explicitly respect the selected mesh's depth.
            // Test the visible number centre (the label is positioned below its anchor).
            let occluded=false;
            if(onScreen){
                this.pointer.set(this.anchor.x,this.anchor.y-14/this.height);
                this.raycaster.setFromCamera(this.pointer,this.camera);
                const hit=this.raycaster.intersectObject(this.models[selected].orientation,true)[0];
                if(hit){
                    const labelDepth=this.anchor.z;
                    occluded=hit.point.clone().project(this.camera).z<labelDepth;
                }
            }
            this.hooks.onLabel(i,onScreen&&!occluded?{x:(this.anchor.x*.5+.5)*this.width,y:(-.5*this.anchor.y+.5)*this.height}:null);
        });
        if(!this.ready&&this.models.every(item=>item.loaded)){
            this.ready=true;this.hooks.onReady?.();
        }
        this.frame=requestAnimationFrame(this.tick);
    }
    pick(clientX,clientY) {
        if(!this.host)return null;
        const r=this.host.getBoundingClientRect();
        this.pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);
        this.raycaster.setFromCamera(this.pointer,this.camera);
        const hits=this.raycaster.intersectObjects(this.models.filter(m=>m.group.visible).map(m=>m.group),true);
        for(const hit of hits){
            let node=hit.object;
            while(node){if(Number.isInteger(node.userData.journeyIndex))return node.userData.journeyIndex;node=node.parent;}
        }
        return null;
    }
    detach() {
        this.stop();this.observer?.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);
        this.renderer.domElement.remove();this.host=null;this.hooks=null;
    }
    release(root) {
        const geometries=new Set(),materials=new Set(),textures=new Set();
        root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const m of [].concat(node.material||[]))materials.add(m);});
        materials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});m.dispose();});
        geometries.forEach(g=>g.dispose());textures.forEach(t=>{t.source?.data?.close?.();t.dispose();});
    }
    dispose() {this.detach();this.destroyed=true;this.release(this.scene);this.renderer.dispose();}
}
