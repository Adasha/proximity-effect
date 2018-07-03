// MOUSEFADER CLASS
// adasha.com


const VALID_MODES       = new Set(['mousemove', 'enterframe', 'redraw']),
      VALID_DIRECTIONS  = new Set(['both', 'horizontal', 'vertical']),
      DEFAULT_MODE      = 'redraw',
      DEFAULT_DIRECTION = 'both',
      DEFAULT_FPS       =  30,
      DEFAULT_RUNOFF    = 100,
      DEFAULT_ATTACK    =   1,
      DEFAULT_DECAY     =   1,
      VALID_EFFECTS     = {
        opacity:     {min: 0, max:   1, rule: 'opacity'},
        translateX:  {                  rule: 'transform', func: 'translateX',  unit: 'px'},
        translateY:  {                  rule: 'transform', func: 'translateY',  unit: 'px'},
        translateZ:  {                  rule: 'transform', func: 'translateZ',  unit: 'px'},
        rotate:      {                  rule: 'transform', func: 'rotate',      unit: 'deg'},
        rotateX:     {                  rule: 'transform', func: 'rotateX',     unit: 'deg'},
        rotateY:     {                  rule: 'transform', func: 'rotateY',     unit: 'deg'},
        rotateZ:     {                  rule: 'transform', func: 'rotateZ',     unit: 'deg'},
        scale:       {                  rule: 'transform', func: 'scale'},
        scaleX:      {                  rule: 'transform', func: 'scaleX'},
        scaleY:      {                  rule: 'transform', func: 'scaleY'},
        scaleY:      {                  rule: 'transform', func: 'scaleY'},
        skewX:       {                  rule: 'transform', func: 'skewX',       unit: 'deg'},
        skewY:       {                  rule: 'transform', func: 'skewY',       unit: 'deg'},
        perspective: {                  rule: 'transform', func: 'perspective', unit: 'px'},
        blur:        {min: 0,           rule: 'filter',    func: 'blur',        unit: 'px'},
        brightness:  {min: 0,           rule: 'filter',    func: 'brightness',  unit: '%'},
        contrast:    {min: 0,           rule: 'filter',    func: 'contrast',    unit: '%'},
        grayscale:   {min: 0, max: 100, rule: 'filter',    func: 'grayscale',   unit: '%'},
        hueRotate:   {                  rule: 'filter',    func: 'hue-rotate',  unit: 'deg'},
        invert:      {min: 0, max: 100, rule: 'filter',    func: 'invert',      unit: '%'},
        //opacity:     {min: 0, max: 100, rule: 'filter',    func: 'opacity',     unit: '%'},
        saturate:    {min: 0, max: 100, rule: 'filter',    func: 'saturate',    unit: '%'},
        sepia:       {min: 0, max: 100, rule: 'filter',    func: 'sepia',       unit: '%'}
      };


let _target,
    _nodes,
    _params,
    _effects,
    _pointer = {},
    _lastDeltas,
    _frameLoop;



const constrain = (num, min, max) => {
    if(typeof num!=='number') return NaN;
    if(min!==undefined && min!==null && typeof min==='number') num = Math.max(num, min);
    if(max!==undefined && max!==null && typeof max==='number') num = Math.min(num, max);
    return num;
};

const delta = (num, a, b) => (b-a)*num+a;

const map = (num, inMin, inMax, outMin, outMax) => (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;

const XOR = (a, b) => (a || b) && !(a && b);

//const startTimer = (delay) =>





class MouseFader
{

    constructor(target, params = {})
    {
        this.target = target;
        _params = params;


        this.threshold = _params.hasOwnProperty('threshold') ? _params.threshold : 0;
        this.runoff    = _params.hasOwnProperty('runoff')    ? _params.runoff    : DEFAULT_RUNOFF;
        this.attack    = _params.hasOwnProperty('attack')    ? _params.attack    : 1;
        this.decay     = _params.hasOwnProperty('decay')     ? _params.decay     : 1;
        this.invert    = _params.invert    || false;
		this.offsetX   = _params.offsetX   || 0;
		this.offsetY   = _params.offsetY   || 0;
		this.jitter    = _params.jitter    || 0;
        this.direction = _params.direction || DEFAULT_DIRECTION;
        this.FPS       = _params.FPS       || DEFAULT_FPS;
        this.mode      = _params.mode      || DEFAULT_MODE;


    	this.init();
    }





    /////////////////////////
    // GETTER/SETTER PROPS //
    /////////////////////////


    // TARGET

    get target()
    {
        return _target;
    }

    set target(t)
    {
        let nodes;

        if(t instanceof HTMLElement)
        {
            console.log(`HTMLElement with ${t.children.length} children found`);
            if(t.children.length<1)
            {
                let h = document.createElement('span');
                t.parentNode.insertBefore(h, t);
                h.appendChild(t);
                t = h;
            }
            nodes = t.children;
        }
        else if(t instanceof NodeList)
        {
            console.log(`NodeList with ${t.length} childNodes found`);
            nodes = t;
        }
        else
    	{
    		console.log(`${t} is not a suitable target`);
    		return;
    	}

        if(nodes.length<1)
    	{
    		console.log(`No children found on ${t}`);
    		return;
    	}

        this.nodes = nodes;
        _lastDeltas = new Array(this.nodes.length);
    }



    // THRESHOLD [Number>=0]

    get threshold()
    {
    	return _params.threshold;
    }

    set threshold(num)
    {
    	_params.threshold = constrain(num, 0);
    }


    // RUNOFF [Number>=0]

    get runoff()
    {
    	return _params.runoff;
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



    // INVERT [Boolean]

    get invert()
    {
        return _params.invert;
    }

    set invert(bool)
    {
        _params.invert = !!bool;
    }



    // ATTACK [0>=Number>=1]

    get attack()
    {
    	return _params.attack;
    }

    set attack(num)
    {
    	_params.attack = constrain(num, 0, 1);
    }


    // DECAY [0>=Number>=1]

    get decay()
    {
    	return _params.decay;
    }

    set decay(num)
    {
    	_params.decay = constrain(num, 0, 1);
    }



	// OFFSET [Number]

	get offsetX()
	{
		return _params.offsetX;
	}

	get offsetY()
	{
		return _params.offsetY;
	}


	set offsetX(num)
	{
		_params.offsetX = num;
	}

	set offsetY(num)
	{
		_params.offsetY = num;
	}



	// JITTER [Number>=0]

	get jitter()
	{
		return _params.jitter;
	}

	set jitter(num)
	{
		_params.jitter = constrain(num, 0);
		this.setJitterValues();
	}



    // DIRECTION [String]

    get direction()
    {
        return _params.direction;
    }

    set direction(str)
    {
        if(VALID_DIRECTIONS.has(str))
        {
        	_params.direction = str;
        }
        else console.log(`${str} not a valid direction.`);
    }



    // FPS [Number>0]

    get FPS()
    {
    	return _params.FPS;
    }

    set FPS(num)
    {
        if(num>0 && typeof num==='number')
        {
            _params.FPS = constrain(num, 0);
        }
        else console.log('Invalid FPS requested');
    }



    // MODE [String]

    get mode()
    {
        return _params.mode;
    }

    set mode(str)
    {
        if(str!==_params.mode)
        {
            if(VALID_MODES.has(str))
            {
                _params.mode = str;
            }
            else console.log(`${str} not a recognised mode.`);
        }
    	else console.log(`Already in ${str} mode. Mode not changed.`);
    }





    ////////////////////
    // EFFECT METHODS //
    ////////////////////


    addEffect(str, near, far)
    {
        if(VALID_EFFECTS.hasOwnProperty(str))
        {
            let template = VALID_EFFECTS[str];
            _effects = _effects || [];

            _effects.push({
                type: str,
                near: constrain(near, template.min, template.max),
                far:  far!==undefined ? constrain(far, template.min, template.max) : near,
				rule: template.rule,
				func: template.func,
				unit: template.unit
            });
        }
        else console.log(`${str} is not a supported effect type`);
    }


    hasEffect(str)
    {
        //return _effects.find(str)!==undefined;
    }


    effect(str)
    {
        //return _effects[str];
    }


    removeEffect(str)
    {
        // if(this.hasEffect(str))
        // {
        //     delete _effects[str];
        // }
    }



	setJitterValues()
	{
		for(let i=0; i<this.nodes.length; i++)
		{
			if(this.jitter>0)
			{
				this.nodes[i].dataset.jitterx = (Math.random()-0.5) * this.jitter;
				this.nodes[i].dataset.jittery = (Math.random()-0.5) * this.jitter;
			}
			else if(this.nodes[i].dataset.jitterx)
			{
				delete this.nodes[i].dataset.jitterx;
				delete this.nodes[i].dataset.jittery;
			}
		}
	}




    //////////////////////
    // EVENT MANAGEMENT //
    //////////////////////


    init()
    {
        document.addEventListener('mousemove', this.updatePointer);

    	/*let b = document.body;
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
    	}*/

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
        let view = document.documentElement;

        for(let i=0; i<this.nodes.length; i++)
        {
            let node = this.nodes[i],
                last = _lastDeltas[i],
                bounds = node.getBoundingClientRect();

    		if((bounds.right>=0 && bounds.left<=view.clientWidth && bounds.bottom>=0 && bounds.top<=view.clientHeight) || last<1)
    		{
				let centerX = (bounds.left+bounds.right )*0.5 - this.offsetX - (node.dataset.jitterx||0),
					centerY = (bounds.top +bounds.bottom)*0.5 - this.offsetY - (node.dataset.jittery||0);

                let dx = _pointer.x - centerX,
                    dy = _pointer.y - centerY,
                    dd, td, d;

                if(this.direction==='both') dd = Math.sqrt(dx*dx+dy*dy);
                else dd = Math.abs(this.direction==='horizontal' ? dx : dy);

        		td = constrain((dd-this.threshold)/this.runoff, 0, 1);
                if(this.invert) td = 1 - td;

                if(last)
                {
                    d = last+(td-last)*(XOR(td>last, this.invert) ? this.decay : this.attack);
                }
                else d = td;

    			if(d<=1)
    			{
        			let styles = {};

        			for(let i=0; i<_effects.length; i++)
        			{
        				let effect = _effects[i],
							type   = effect.type,
                            near   = effect.near,
        					far    = effect.far,
                            rule   = effect.rule,
                            func   = effect.func,
                            unit   = effect.unit || '',
                            val    = delta(d, near, far);

                        if(!func)
                        {
                            node.style[rule] = `${val}${unit}`;
                        }
                        else
                        {
                            if(!styles[rule]) styles[rule] = [];
                            styles[rule].push(func+'('+val+unit+')');
                        }
        			}
                    for(let r in styles)
                    {
                        node.style[r] = styles[r].join(' ');
                    }
                    //node.style.zIndex = 1000-Math.floor(d*1000);
        		}

                _lastDeltas[i] = d;
            }
        }

        if(this.mode==='redraw') window.requestAnimationFrame(this.update);
    } // update end

}
=======
﻿// MOUSEFADER CLASS
// adasha.com


const VALID_MODES       = new Set(['mousemove', 'enterframe', 'redraw']),
      VALID_DIRECTIONS  = new Set(['both', 'horizontal', 'vertical']),
      DEFAULT_MODE      = 'redraw',
      DEFAULT_DIRECTION = 'both',
      DEFAULT_FPS       =  30,
      DEFAULT_RUNOFF    = 100,
      DEFAULT_ATTACK    =   1,
      DEFAULT_DECAY     =   1,
      VALID_EFFECTS     = {
        opacity:     {min: 0, max:   1, rule: 'opacity'},
        translateX:  {                  rule: 'transform', func: 'translateX',  unit: 'px'},
        translateY:  {                  rule: 'transform', func: 'translateY',  unit: 'px'},
        translateZ:  {                  rule: 'transform', func: 'translateZ',  unit: 'px'},
        rotate:      {                  rule: 'transform', func: 'rotate',      unit: 'deg'},
        rotateX:     {                  rule: 'transform', func: 'rotateX',     unit: 'deg'},
        rotateY:     {                  rule: 'transform', func: 'rotateY',     unit: 'deg'},
        rotateZ:     {                  rule: 'transform', func: 'rotateZ',     unit: 'deg'},
        scale:       {                  rule: 'transform', func: 'scale'},
        scaleX:      {                  rule: 'transform', func: 'scaleX'},
        scaleY:      {                  rule: 'transform', func: 'scaleY'},
        scaleY:      {                  rule: 'transform', func: 'scaleY'},
        skewX:       {                  rule: 'transform', func: 'skewX',       unit: 'deg'},
        skewY:       {                  rule: 'transform', func: 'skewY',       unit: 'deg'},
        perspective: {                  rule: 'transform', func: 'perspective', unit: 'px'},
        blur:        {min: 0,           rule: 'filter',    func: 'blur',        unit: 'px'},
        brightness:  {min: 0,           rule: 'filter',    func: 'brightness',  unit: '%'},
        contrast:    {min: 0,           rule: 'filter',    func: 'contrast',    unit: '%'},
        grayscale:   {min: 0, max: 100, rule: 'filter',    func: 'grayscale',   unit: '%'},
        hueRotate:   {                  rule: 'filter',    func: 'hue-rotate',  unit: 'deg'},
        invert:      {min: 0, max: 100, rule: 'filter',    func: 'invert',      unit: '%'},
        //opacity:     {min: 0, max: 100, rule: 'filter',    func: 'opacity',     unit: '%'},
        saturate:    {min: 0, max: 100, rule: 'filter',    func: 'saturate',    unit: '%'},
        sepia:       {min: 0, max: 100, rule: 'filter',    func: 'sepia',       unit: '%'}
      };


let _target,
    _nodes,
    _params,
    _effects,
    _pointer = {},
    _lastDeltas,
    _frameLoop;



const constrain = (num, min, max) => {
    if(typeof num!=='number') return NaN;
    if(min!==undefined && min!==null && typeof min==='number') num = Math.max(num, min);
    if(max!==undefined && max!==null && typeof max==='number') num = Math.min(num, max);
    return num;
};

const delta = (num, a, b) => (b-a)*num+a;

const map = (num, inMin, inMax, outMin, outMax) => (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;

const XOR = (a, b) => (a || b) && !(a && b);

//const startTimer = (delay) =>





class MouseFader
{

    constructor(target, params = {})
    {
        this.target = target;
        _params = params;


        this.threshold = _params.hasOwnProperty('threshold') ? _params.threshold : 0;
        this.runoff    = _params.hasOwnProperty('runoff')    ? _params.runoff    : DEFAULT_RUNOFF;
        this.attack    = _params.hasOwnProperty('attack')    ? _params.attack    : 1;
        this.decay     = _params.hasOwnProperty('decay')     ? _params.decay     : 1;
        this.invert    = _params.invert    || false;
		this.offsetX   = _params.offsetX   || 0;
		this.offsetY   = _params.offsetY   || 0;
		this.jitter    = _params.jitter    || 0;
        this.direction = _params.direction || DEFAULT_DIRECTION;
        this.FPS       = _params.FPS       || DEFAULT_FPS;
        this.mode      = _params.mode      || DEFAULT_MODE;


    	this.init();
    }





    /////////////////////////
    // GETTER/SETTER PROPS //
    /////////////////////////


    // TARGET

    get target()
    {
        return _target;
    }

    set target(t)
    {
        let nodes;

        if(t instanceof HTMLElement)
        {
            console.log(`HTMLElement with ${t.children.length} children found`);
            if(t.children.length<1)
            {
                let h = document.createElement('span');
                t.parentNode.insertBefore(h, t);
                h.appendChild(t);
                t = h;
            }
            nodes = t.children;
        }
        else if(t instanceof NodeList)
        {
            console.log(`NodeList with ${t.length} childNodes found`);
            nodes = t;
        }
        else
    	{
    		console.log(`${t} is not a suitable target`);
    		return;
    	}

        if(nodes.length<1)
    	{
    		console.log(`No children found on ${t}`);
    		return;
    	}

        this.nodes = nodes;
        _lastDeltas = new Array(this.nodes.length);
    }



    // THRESHOLD [Number>=0]

    get threshold()
    {
    	return _params.threshold;
    }

    set threshold(num)
    {
    	_params.threshold = constrain(num, 0);
    }


    // RUNOFF [Number>=0]

    get runoff()
    {
    	return _params.runoff;
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



    // INVERT [Boolean]

    get invert()
    {
        return _params.invert;
    }

    set invert(bool)
    {
        _params.invert = !!bool;
    }



    // ATTACK [0>=Number>=1]

    get attack()
    {
    	return _params.attack;
    }

    set attack(num)
    {
    	_params.attack = constrain(num, 0, 1);
    }


    // DECAY [0>=Number>=1]

    get decay()
    {
    	return _params.decay;
    }

    set decay(num)
    {
    	_params.decay = constrain(num, 0, 1);
    }



	// OFFSET [Number]

	get offsetX()
	{
		return _params.offsetX;
	}

	get offsetY()
	{
		return _params.offsetY;
	}


	set offsetX(num)
	{
		_params.offsetX = num;
	}

	set offsetY(num)
	{
		_params.offsetY = num;
	}



	// JITTER [Number>=0]

	get jitter()
	{
		return _params.jitter;
	}

	set jitter(num)
	{
		_params.jitter = constrain(num, 0);
		this.setJitterValues();
	}



    // DIRECTION [String]

    get direction()
    {
        return _params.direction;
    }

    set direction(str)
    {
        if(VALID_DIRECTIONS.has(str))
        {
        	_params.direction = str;
        }
        else console.log(`${str} not a valid direction.`);
    }



    // FPS [Number>0]

    get FPS()
    {
    	return _params.FPS;
    }

    set FPS(num)
    {
        if(num>0 && typeof num==='number')
        {
            _params.FPS = constrain(num, 0);
        }
        else console.log('Invalid FPS requested');
    }



    // MODE [String]

    get mode()
    {
        return _params.mode;
    }

    set mode(str)
    {
        if(str!==_params.mode)
        {
            if(VALID_MODES.has(str))
            {
                _params.mode = str;
            }
            else console.log(`${str} not a recognised mode.`);
        }
    	else console.log(`Already in ${str} mode. Mode not changed.`);
    }





    ////////////////////
    // EFFECT METHODS //
    ////////////////////


    addEffect(str, near, far)
    {
        if(VALID_EFFECTS.hasOwnProperty(str))
        {
            let template = VALID_EFFECTS[str];
            _effects = _effects || [];

            _effects.push({
                type: str,
                near: constrain(near, template.min, template.max),
                far:  far!==undefined ? constrain(far, template.min, template.max) : near,
				rule: template.rule,
				func: template.func,
				unit: template.unit
            });
        }
        else console.log(`${str} is not a supported effect type`);
    }


    hasEffect(str)
    {
        //return _effects.find(str)!==undefined;
    }


    effect(str)
    {
        //return _effects[str];
    }


    removeEffect(str)
    {
        // if(this.hasEffect(str))
        // {
        //     delete _effects[str];
        // }
    }



	setJitterValues()
	{
		for(let i=0; i<this.nodes.length; i++)
		{
			if(this.jitter>0)
			{
				this.nodes[i].dataset.jitterx = (Math.random()-0.5) * this.jitter;
				this.nodes[i].dataset.jittery = (Math.random()-0.5) * this.jitter;
			}
			else if(this.nodes[i].dataset.jitterx)
			{
				delete this.nodes[i].dataset.jitterx;
				delete this.nodes[i].dataset.jittery;
			}
		}
	}




    //////////////////////
    // EVENT MANAGEMENT //
    //////////////////////


    init()
    {
        document.addEventListener('mousemove', this.updatePointer);

    	/*let b = document.body;
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
    	}*/

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
        let view = document.documentElement;

        for(let i=0; i<this.nodes.length; i++)
        {
            let node = this.nodes[i],
                last = _lastDeltas[i],
                bounds = node.getBoundingClientRect();

    		if((bounds.right>=0 && bounds.left<=view.clientWidth && bounds.bottom>=0 && bounds.top<=view.clientHeight) || last<1)
    		{
				let centerX = (bounds.left+bounds.right )*0.5 - this.offsetX - (node.dataset.jitterx||0),
					centerY = (bounds.top +bounds.bottom)*0.5 - this.offsetY - (node.dataset.jittery||0);

                let dx = _pointer.x - centerX,
                    dy = _pointer.y - centerY,
                    dd, td, d;

                if(this.direction==='both') dd = Math.sqrt(dx*dx+dy*dy);
                else dd = Math.abs(this.direction==='horizontal' ? dx : dy);

        		td = constrain((dd-this.threshold)/this.runoff, 0, 1);
                if(this.invert) td = 1 - td;

                if(last)
                {
                    d = last+(td-last)*(XOR(td>last, this.invert) ? this.decay : this.attack);
                }
                else d = td;

    			if(d<=1)
    			{
        			let styles = {};

        			for(let i=0; i<_effects.length; i++)
        			{
        				let effect = _effects[i],
							type   = effect.type,
                            near   = effect.near,
        					far    = effect.far,
                            rule   = effect.rule,
                            func   = effect.func,
                            unit   = effect.unit || '',
                            val    = delta(d, near, far);

                        if(!func)
                        {
                            node.style[rule] = `${val}${unit}`;
                        }
                        else
                        {
                            if(!styles[rule]) styles[rule] = [];
                            styles[rule].push(func+'('+val+unit+')');
                        }
        			}
                    for(let r in styles)
                    {
                        node.style[r] = styles[r].join(' ');
                    }
                    //node.style.zIndex = 1000-Math.floor(d*1000);
        		}

                _lastDeltas[i] = d;
            }
        }

        if(this.mode==='redraw') window.requestAnimationFrame(this.update);
    } // update end

}
