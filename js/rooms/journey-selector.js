import { roomNavigationCredit } from './page-template.js';

export function createJourneySelector(memories, { selected = 0, onSelect, onOpen, onReturn }) {
    const shell=document.createElement('section');shell.className='journey-collection is-loading';
    shell.innerHTML=`<h2 id="founder-journey-menu-title" class="journey-section-label">THE JOURNEY</h2>
      <header class="founder-journey-entry-header journey-selector-header" aria-live="polite" aria-atomic="true"><p class="founder-journey-count journey-selection-count"></p><h2 class="journey-selection-title"></h2><p class="journey-selection-status"></p></header>
      <div class="journey-space" role="group" aria-label="Journey artefacts" aria-busy="true" inert style="visibility:hidden"></div>
      <p class="journey-scene-message" role="status">OPENING ARCHIVE…</p>
      <div class="founder-journey-controls journey-selector-controls" role="navigation" aria-label="Journey selection"><button type="button" class="founder-journey-control is-previous">PREVIOUS</button><button type="button" class="founder-journey-control journey-menu-return">BACK</button><button type="button" class="founder-journey-control is-next">NEXT</button></div>`;
    shell.querySelector('.journey-selector-controls').append(roomNavigationCredit());
    const space=shell.querySelector('.journey-space'),message=shell.querySelector('.journey-scene-message');
    const mobile=matchMedia('(max-width:700px)');
    const buttons=[],timers=[];let scene=null,disposed=false,opening=false,swipe=null,suppressClick=false,hovered=null;
    let soundHover=null, hoverExitTimer;
    const sound=name=>window.dispatchEvent(new CustomEvent('pog:menu-sound',{detail:{name}}));
    shell.classList.add('has-motion');
    const reveal=()=>{
        if(disposed)return;
        space.style.visibility='';space.inert=false;space.setAttribute('aria-busy','false');
        shell.classList.remove('is-loading');
        // Explicit keyframes also run when a cached desktop scene is ready before first paint.
        const duration=650;
        shell.querySelectorAll('.journey-selector-header,.journey-space').forEach(node=>{
            node.animate([{opacity:0},{opacity:1}],{duration,easing:'ease',fill:'backwards'});
        });
    };
    const fallback=()=>{space.classList.remove('is-scene');space.classList.add('is-static');buttons.forEach(b=>{b.hidden=false;b.style.transform='';});message.textContent='3D UNAVAILABLE — SELECT A CHAPTER BELOW';reveal();};
    const select=(index,focus=false)=>{
        if(disposed||opening)return;
        selected=Math.max(0,Math.min(index,memories.length-1));onSelect(selected);
        shell.querySelector('.is-previous').disabled=selected===0;
        shell.querySelector('.is-next').disabled=selected===memories.length-1;
        buttons.forEach((b,i)=>{b.classList.toggle('is-selected',i===selected);b.setAttribute('aria-pressed',String(i===selected));b.tabIndex=i===selected?0:-1;});
        const memory=memories[selected];
        shell.querySelector('.journey-selection-count').textContent=`${memory.number} / ${String(memories.length).padStart(2,'0')}`;
        shell.querySelector('.journey-selection-title').textContent=memory.title;
        shell.querySelector('.journey-selection-status').textContent=memory.scene.status;
        buttons.forEach((button,i)=>button.setAttribute('aria-label',`${memories[i].number} ${memories[i].title}${i===selected?' — activate again to open':''}`));
        scene?.setSelected();
        if(focus){buttons[selected].hidden=false;buttons[selected].focus({preventScroll:true});}
    };
    const open=()=>{
        if(opening||disposed)return;opening=true;shell.classList.add('is-opening');
        timers.push(setTimeout(()=>shell.classList.add('is-fading'),180));
        timers.push(setTimeout(()=>{if(!disposed)onOpen(selected);},420));
    };
    memories.forEach((memory,i)=>{
        const button=document.createElement('button');button.type='button';button.className='journey-object';button.dataset.journeyEntry=memory.id;
        button.setAttribute('aria-label',`${memory.number} ${memory.title}`);
        const number=document.createElement('span');number.className='journey-object-number';number.textContent=memory.number;
        const name=document.createElement('span');name.className='journey-object-name';name.textContent=memory.title;
        const status=document.createElement('span');status.className='journey-object-state';
        button.append(number,name,status);button.addEventListener('click',()=>{sound('confirm');if(i===selected)open();else select(i);});
        button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))sound('select');});
        buttons.push(button);space.append(button);
    });
    shell.querySelector('.journey-menu-return').textContent = 'MENU';
    const menuButton=shell.querySelector('.journey-menu-return');
    menuButton.addEventListener('click',onReturn);
    shell.querySelector('.is-previous').addEventListener('click',()=>select(selected-1));
    shell.querySelector('.is-next').addEventListener('click',()=>select(selected+1));
    shell.addEventListener('keydown',event=>{
        if(event.target===menuButton)return;
        if(event.key==='Enter'&&space.contains(event.target)){event.preventDefault();event.stopPropagation();open();return;}
        const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[event.key];
        if(!direction)return;event.preventDefault();event.stopPropagation();
        // Both devices now use the same centred, previous/next composition.
        select(selected+(direction[0]||-direction[1]),true);
    });
    space.addEventListener('pointermove',event=>{
        if(event.pointerType!=='mouse'||!scene)return;
        const label=event.target.closest('.journey-object');
        const hit=label?buttons.indexOf(label):scene.pick(event.clientX,event.clientY);
        // Model and number share one artefact identity, including their hover sound.
        clearTimeout(hoverExitTimer);
        if(hit!==null){
            if(hit!==soundHover)sound('select');
            soundHover=hit;
        }else{
            // Bridge the small empty gap between a model and its number.
            hoverExitTimer=setTimeout(()=>{soundHover=null;},350);
        }
        hovered=hit;space.style.cursor=hit===null?'default':'pointer';
        buttons.forEach((b,i)=>b.classList.toggle('is-hovered',i===hit));
    });
    space.addEventListener('pointerleave',()=>{clearTimeout(hoverExitTimer);soundHover=null;hovered=null;buttons.forEach(b=>b.classList.remove('is-hovered'));});
    space.addEventListener('pointerdown',e=>{swipe={x:e.clientX,y:e.clientY,id:e.pointerId};});
    space.addEventListener('pointerup',e=>{
        if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;
        if(mobile.matches&&Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){
            suppressClick=true;select(selected+(dx<0?1:-1));timers.push(setTimeout(()=>{suppressClick=false;},350));
        }
    });
    space.addEventListener('pointercancel',()=>{swipe=null;});
    space.addEventListener('click',e=>{
        if(suppressClick){e.preventDefault();e.stopImmediatePropagation();return;}
        if(e.target.closest('.journey-object'))return;
        const hit=scene?.pick(e.clientX,e.clientY);if(Number.isInteger(hit)){sound('confirm');if(hit===selected)open();else select(hit);}
    },true);
    select(selected);
    import('./journey-scene.js').then(({mountJourneyScene})=>{
        if(disposed)return;
        scene=mountJourneyScene(space,memories,{
            getSelected:()=>selected,getHovered:()=>hovered,isOpening:()=>opening,onFailure:fallback,
            onReady:()=>{message.textContent='';reveal();},
            onLoaded:(i,failed)=>{buttons[i].classList.toggle('has-error',failed);buttons[i].querySelector('.journey-object-state').textContent=failed?'UNAVAILABLE':'';},
            onLabel:(i,p)=>{if(!space.classList.contains('is-scene'))return;buttons[i].hidden=!p;if(p)buttons[i].style.transform=`translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,0)`;}
        });
        // Expose the owned scene on this component for lifecycle diagnostics, not global state.
        shell.journeyScene=scene;space.classList.add('is-scene');
    }).catch(fallback);
    shell.focusSelected=()=>buttons[selected].focus({preventScroll:true});
    shell.dispose=()=>{disposed=true;clearTimeout(hoverExitTimer);timers.forEach(clearTimeout);scene?.detach();};
    return shell;
}
