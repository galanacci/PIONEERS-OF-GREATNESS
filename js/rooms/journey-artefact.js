// The renderer is loaded only when a visitor reaches The Journey.
let renderer;
function loadRenderer() {
    if (!renderer) renderer = import('../vendor/model-viewer.min.js').catch(error => {
        renderer = null;
        throw error;
    });
    return renderer;
}

export function createJourneyArtefact(memory, { interactive = true, idle = true } = {}) {
    const shell = document.createElement('div');
    shell.className = 'journey-artefact';
    const status = document.createElement('p');
    status.className = 'journey-artefact-status';
    status.setAttribute('role', 'status');
    status.textContent = 'LOADING ARTEFACT…';
    shell.append(status);
    const viewer = document.createElement('model-viewer');
    viewer.alt = memory.media.alt || memory.title;
    viewer.setAttribute('camera-orbit', memory.media.orbit || '0deg 75deg auto');
    viewer.setAttribute('interaction-prompt', 'none');
    viewer.setAttribute('exposure', '1.25');
    viewer.setAttribute('shadow-intensity', '0');
    if (interactive) {
        viewer.setAttribute('camera-controls', '');
        viewer.setAttribute('touch-action', 'pan-y');
        // Arrow keys rotate the object without advancing the chapter beneath it.
        viewer.addEventListener('keydown', event => {
            if (event.key.startsWith('Arrow')) event.stopPropagation();
        });
    }
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const rotate = () => viewer.toggleAttribute('auto-rotate', idle && !motion.matches && !document.hidden && shell.isConnected);
    shell.viewer = viewer;
    if (!interactive) {
        viewer.setAttribute('inert', '');
        viewer.setAttribute('aria-hidden', 'true');
    }
    const failed = () => {
        status.textContent = 'ARTEFACT UNAVAILABLE — YOU CAN STILL EXPLORE THIS CHAPTER';
        shell.classList.add('has-error');
    };
    viewer.addEventListener('load', () => {
        shell.classList.add('is-ready');
        status.textContent = '';
        rotate();
    });
    viewer.addEventListener('error', failed);
    let disposed = false;
    loadRenderer().then(() => {
        if (disposed) return;
        viewer.src = memory.media.src;
        shell.prepend(viewer);
    }).catch(() => { if (!disposed) failed(); });
    document.addEventListener('visibilitychange', rotate);
    motion.addEventListener('change', rotate);
    shell.dispose = () => {
        disposed = true;
        viewer.removeAttribute('auto-rotate');
        viewer.remove();
        document.removeEventListener('visibilitychange', rotate);
        motion.removeEventListener('change', rotate);
    };
    return shell;
}
