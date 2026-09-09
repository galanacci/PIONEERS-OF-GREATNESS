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
    let quickMenu=null, anchor=null, closeTimer;
    const dismiss=()=>{
        clearTimeout(closeTimer);
        anchor?.setAttribute('aria-expanded','false');
        quickMenu?.remove();quickMenu=null;anchor=null;
    };
    const menuButton=target=>{
        const button=target.closest?.('.world-room button');
        return button?.textContent.trim()==='MENU'?button:null;
    };
    const show=button=>{
        if(anchor===button){clearTimeout(closeTimer);return;}
        dismiss();anchor=button;
        button.setAttribute('aria-expanded','true');
        button.setAttribute('aria-haspopup','true');
        quickMenu=document.createElement('div');quickMenu.setAttribute('role','navigation');
        quickMenu.setAttribute('popover','manual');
        quickMenu.className='page-quick-menu';quickMenu.setAttribute('aria-label','Quick navigation');
        document.querySelectorAll('#menu-overlay .menu-item').forEach(original=>{
            const option=document.createElement('button');option.type='button';
            option.textContent=original.textContent;
            if(original.getAttribute('aria-disabled')==='true')option.setAttribute('aria-disabled','true');
            option.addEventListener('click',()=>{
                if(option.getAttribute('aria-disabled')==='true')return;
                const returnFocus=anchor;
                dismiss();
                if(original.dataset.menuAction==='waitlist'){
                    window.dispatchEvent(new CustomEvent('pog:page-waitlist',{detail:{returnFocus}}));
                }else{openMenu();original.click();}
            });
            quickMenu.append(option);
        });
        button.closest('.world-room').append(quickMenu);
        const rect=button.getBoundingClientRect();
        quickMenu.style.left=`${Math.max(12,Math.min(innerWidth-252,rect.left+rect.width/2-120))}px`;
        quickMenu.style.bottom=`${innerHeight-rect.top+8}px`;
        quickMenu.showPopover?.();
        quickMenu.addEventListener('pointerenter',()=>clearTimeout(closeTimer));
        quickMenu.addEventListener('pointerleave',()=>{closeTimer=setTimeout(dismiss,220);});
    };
    document.addEventListener('pointerover',event=>{
        const button=menuButton(event.target);
        if(button&&event.pointerType!=='touch')show(button);
    });
    document.addEventListener('pointerout',event=>{
        if(anchor?.contains(event.target)&&!anchor.contains(event.relatedTarget))closeTimer=setTimeout(dismiss,220);
    });
    document.addEventListener('click',event=>{
        const button=menuButton(event.target);
        if(!button)return;
        event.preventDefault();event.stopImmediatePropagation();
        if(anchor===button&&quickMenu)dismiss();else show(button);
    },true);
    document.addEventListener('pointerdown',event=>{
        if(quickMenu&&!quickMenu.contains(event.target)&&!anchor.contains(event.target))dismiss();
    },true);
    document.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&quickMenu){const button=anchor;event.preventDefault();event.stopImmediatePropagation();dismiss();button.focus();}
    },true);
    window.addEventListener('pog:room-closing',dismiss);
    window.addEventListener('resize',dismiss);
    document.querySelectorAll('.world-room > .world-room-content').forEach(content => {
        const back = content.querySelector('.room-return');
        if (back) { back.textContent = '<'; back.setAttribute('aria-label', 'Back'); }
        if (content.matches('.documentary-content,.field-notes-content')) {
            content.classList.add('archive-heading-right');
            const room=content.closest('.world-room');
            if(!room.querySelector('.archive-bottom-menu')){
                const menu=document.createElement('button');menu.type='button';
                menu.className='archive-bottom-menu';menu.textContent='MENU';
                menu.setAttribute('aria-haspopup','true');menu.setAttribute('aria-expanded','false');
                room.append(menu);
            }
            return;
        }
        content.classList.add('page-template');
    });
}
