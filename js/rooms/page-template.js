export const openMenu = () => window.dispatchEvent(new CustomEvent('pog:close-room'));
export function pageControls(previous, next) {
    const bar = document.createElement('div'); bar.className = 'page-controls';
    bar.setAttribute('role', 'navigation'); bar.setAttribute('aria-label', 'Page controls');
    const button = (label, action) => {
        const node = document.createElement('button'); node.type = 'button'; node.textContent = label;
        node.disabled = !action; if (action) node.addEventListener('click', action); return node;
    };
    const prev = button('← PREVIOUS', previous);
    const center = document.createElement('div'); center.className = 'page-controls-center'; center.append(button('MENU', openMenu));
    const forward = button('NEXT →', next); bar.append(prev, center, forward);
    return { bar, center, previous: prev, next: forward };
}
export function initPageTemplate() {
    document.querySelectorAll('.world-room > .world-room-content').forEach(content => {
        const back = content.querySelector('.room-return');
        if (back) { back.textContent = '<'; back.setAttribute('aria-label', 'Back'); }
        if (content.matches('.documentary-content,.field-notes-content')) {
            content.classList.add('archive-heading-right');
            return;
        }
        content.classList.add('page-template');
    });
}
