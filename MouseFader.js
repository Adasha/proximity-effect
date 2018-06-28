// MOUSEFADER CLASS


const VALID_MODES    = new Set(['mousemove', 'enterframe', 'redraw']);
const DEFAULT_MODE   = 'redraw';
const DEFAULT_FPS    = 30;
const DEFAULT_RUNOFF = 100;
const DEFAULT_ATTACK = 1;
const DEFAULT_DECAY  = 1;
const VALID_EFFECTS  = {
    opacity:    {min: 0, max: 1, style: 'opacity',   unit: ''},
    scale:      {                style: 'transform'},
    translateX: {},
    translateY: {},
    translateZ: {},
    rotate:     {},
    blur:       {min: 0}
};

let _params,
	_effects = {},
    _pointer = {},
    _frameLoop,
    _lastDeltas;



const constrain = (num, min, max) => {
    if(typeof num!=='number') return NaN;
    if(min!==undefined && min!==null && typeof min==='number') num = Math.max(num, min);
    if(max!==undefined && max!==null && typeof max==='number') num = Math.min(num, max);
    return num;
};


const delta = (num, a, b) => (b-a)*num+a;

//const startTimer = (delay) => 





class MouseFader
{
	
    constructor(target, params = {})
    {
        let nodes;
        
        if(target instanceof HTMLElement)
        {
            nodes = target.childNodes;
        }
        else if(target instanceof NodeList)
		{
			nodes = target;
		}
        else
		{
			console.log(`${target} is not a suitable target`);
			return;
		}
		
        if(nodes.length<1)
		{
			console.log(`No children found on ${target}`);
			return;
		}
        
		_params = params;
        this.nodes = nodes;
        _lastDeltas = new Array(nodes.length);
        
		this.init();
    }
    
	
	
	
	
    /////////////////////////
	// GETTER/SETTER PROPS //
	/////////////////////////
	
	
	// MODE [String]
	
    get mode()
    {
        return _params.mode || DEFAULT_MODE;
    }
    
    set mode(str)
    {
        if(!_params.mode || str!==_params.mode)
        {
            _params.mode = VALID_MODES.has(str) ? str : DEFAULT_MODE;
        }
		//this.init(_params.mode);
    }
	
	
	// FPS [Number>0]
	
	get FPS()
	{
		return _params.FPS || DEFAULT_FPS;
	}
	
	set FPS(num)
	{
		_params.FPS = constrain(num, 0);
	}
	
	
	// THRESHOLD [Number>=0]
	
	get threshold()
	{
		return _params.hasOwnProperty('threshold') ? _params.threshold : 0;
	}
	
	set threshold(num)
	{
		_params.threshold = constrain(num, 0);
	}
	
	
	// DISTANCE [Number>=0]
	
	get runoff()
	{
		return _params.hasOwnProperty('runoff') ? _params.runoff : DEFAULT_RUNOFF;
	}
	
	set runoff(num)
	{
		_params.runoff = constrain(num, 0);
	}
	
	
	// BOUNDARY [READ-ONLY Number]
	
	get boundary()
	{
		return this.threshold + this.runoff;
	}
	
	
	// ATTACK [0>Number>=1]
	
	get attack()
	{
		return _params.hasOwnProperty('attack') ? _params.attack : 1;
	}
	
	set attack(num)
	{
		_params.attack = constrain(num, 0, 1);
	}
	
	
	// DECAY [0>Number>=1]
	
	get decay()
	{
		return _params.hasOwnProperty('decay') ? _params.decay : 1;
	}
	
	set decay(num)
	{
		_params.decay = constrain(num, 0, 1);
	}
	
	
	
	
	
	////////////////////
	// EFFECT METHODS //
	////////////////////
	
	
	addEffect(str, near, far)
	{
        if(VALID_EFFECTS.hasOwnProperty(str))
        {
            let effect = VALID_EFFECTS[str];
            
            _effects[str] = {
                near: constrain(near, effect.min, effect.max),
                far: far!==undefined ? constrain(far, effect.min, effect.max) : near
            };
        }
        else console.log(`${str} is not a supported effect type`);
	}
    
    
    hasEffect(str)
    {
        return _effects.hasOwnProperty(str);
    }
	
    
    effect(str)
    {
        return _effects[str];
    }
    
    
    removeEffect(str)
    {
        if(this.hasEffect(str))
        {
            delete _effects[str];
        }
    }
    
    
    
    
    
    //////////////////////
    // EVENT MANAGEMENT //
    //////////////////////
	
	
	init()
	{
        document.addEventListener('mousemove', this.updatePointer);
        
/*		let b = document.body;
		b.removeEventListener('mousemove',  update());
		b.removeEventListener('enterframe', update());
		window.clearInterval(_frameLoop);
		
		switch(mode)
		{
			case 'mousemove' :
				b.addEventListener('mousemove', update());
				break;
			case 'enterframe' :
				b.addEventListener('enterframe', update());
				_frameLoop = window.setInterval(() =>
					b.dispatchEvent(new Event('enterframe'));
				, 1000/params.FPS);
				break;
			case 'redraw' :
				break;
		}
*/
		this.update = this.update.bind(this);
        window.requestAnimationFrame(this.update);
	}
    
    
    updatePointer(evt)
    {
        _pointer.x = evt.clientX;
        _pointer.y = evt.clientY;
    }
    
    
    
    update(timestamp)
    {
        let node, last, bounds, dx, dy, dd, td, d;
		let view = document.documentElement;
		
        for(let i=0; i<this.nodes.length; i++)
        {
            node = this.nodes[i];
            last = _lastDeltas[i];
            
            bounds = node.getBoundingClientRect();
			
			if((bounds.right>=0 && bounds.left<=view.clientWidth && bounds.bottom>=0 && bounds.top<=view.clientHeight) || last<1)
			{
				dx = _pointer.x - (bounds.left+bounds.right )*0.5;
				dy = _pointer.y - (bounds.top +bounds.bottom)*0.5;
				dd = Math.sqrt(dx*dx+dy*dy);
				td = constrain((dd-this.threshold)/this.runoff, 0, 1);
                
                if(last)
                {
                    d = last+(td-last)*((td>last) ? this.decay : this.attack);
                }
                else
                {
                    d = td;
                }
                
				if(d<=1)
				{
					let transforms = [],
                        filters = [];
					
					for(let e of _effects)
					{
						let near = this.effect(e).near,
							far  = this.effect(e).far;
						
						if(_effects[e].hasOwnProperty('style'))
						{
							
						}
					}
					
					if(this.hasEffect('opacity'))
					{
						node.style.opacity = delta(d, this.effect('opacity').near, this.effect('opacity').far);
					}
					if(this.hasEffect('scale'))
					{
						transforms.push('scale('+delta(d, this.effect('scale').near, this.effect('scale').far)+')');
					}
					if(this.hasEffect('translateZ'))
					{
						transforms.push('translateZ('+delta(d, this.effect('translateZ').near, this.effect('translateZ').far)+'px)');
					}
					if(this.hasEffect('blur'))
					{
						filters.push('blur('+delta(d, this.effect('blur').near, this.effect('blur').far)+'px)');
					}
					node.style.transform = transforms.join(', ') || 'none';
					node.style.filter    = filters.join(', ') || 'none';
				}
                
                _lastDeltas[i] = d;
			}
        }
        
        if(this.mode==='redraw') window.requestAnimationFrame(this.update);
    }
    
}
