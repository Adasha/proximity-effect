/*
    ProximityEfect class by Adasha
    Licensed under MPL-2.0
    Repository: https://github.com/Adasha/proximity-effect
    Demos: http://lab.adasha.com/proximity-effect
*/

const VALID_MODES       = new Set(['mousemove', 'enterframe', 'redraw']),
      VALID_DIRECTIONS  = new Set(['both', 'horizontal', 'vertical']),
      DEFAULT_DIRECTION = 'both',
      DEFAULT_MODE      = 'redraw',
      DEFAULT_ACCURACY  =   5,
      DEFAULT_FPS       =  15,
      DEFAULT_RUNOFF    = 100,
      VALID_EFFECTS     = {
        opacity:     {min: 0, max:   1, default:   1, rule: 'opacity'},
        translateX:  {                  default:   0, rule: 'transform', func: 'translateX',  unit: 'px'},
        translateY:  {                  default:   0, rule: 'transform', func: 'translateY',  unit: 'px'},
        translateZ:  {                  default:   0, rule: 'transform', func: 'translateZ',  unit: 'px'},
        rotate:      {                  default:   0, rule: 'transform', func: 'rotate',      unit: 'deg'},
        rotateX:     {                  default:   0, rule: 'transform', func: 'rotateX',     unit: 'deg'},
        rotateY:     {                  default:   0, rule: 'transform', func: 'rotateY',     unit: 'deg'},
        rotateZ:     {                  default:   0, rule: 'transform', func: 'rotateZ',     unit: 'deg'},
        scale:       {                  default:   1, rule: 'transform', func: 'scale'},
        scaleX:      {                  default:   1, rule: 'transform', func: 'scaleX'},
        scaleY:      {                  default:   1, rule: 'transform', func: 'scaleY'},
        scaleZ:      {                  default:   1, rule: 'transform', func: 'scaleZ'},
        skewX:       {                  default:   0, rule: 'transform', func: 'skewX',       unit: 'deg'},
        skewY:       {                  default:   0, rule: 'transform', func: 'skewY',       unit: 'deg'},
        //perspective: {                  default:   0, rule: 'transform', func: 'perspective', unit: 'px'},
        blur:        {min: 0,           default:   0, rule: 'filter',    func: 'blur',        unit: 'px'},
        brightness:  {min: 0,           default: 100, rule: 'filter',    func: 'brightness',  unit: '%'},
        contrast:    {min: 0,           default: 100, rule: 'filter',    func: 'contrast',    unit: '%'},
        grayscale:   {min: 0, max: 100, default:   0, rule: 'filter',    func: 'grayscale',   unit: '%'},
        hueRotate:   {                  default:   0, rule: 'filter',    func: 'hue-rotate',  unit: 'deg'},
        invert:      {min: 0, max: 100, default:   0, rule: 'filter',    func: 'invert',      unit: '%'},
        //opacity:     {min: 0, max: 100, default: 100, rule: 'filter',    func: 'opacity',     unit: '%'},
        saturate:    {min: 0, max: 100, default: 100, rule: 'filter',    func: 'saturate',    unit: '%'},
        sepia:       {min: 0, max: 100, default:   0, rule: 'filter',    func: 'sepia',       unit: '%'}
      };


let _pointer = {};



const constrain = (num, min, max) => {
    if(typeof num!=='number') return NaN;
    if(min!==undefined && min!==null && typeof min==='number') num = Math.max(num, min);
    if(max!==undefined && max!==null && typeof max==='number') num = Math.min(num, max);
    return num;
};

const roundTo = (num, dp = 0) => {
    let mult = Math.pow(dp+1,10);
    return Math.round(num*mult)/mult;
};

const delta = (num, a, b) => (b-a)*constrain(num, 0, 1)+a;

const map = (num, inMin, inMax, outMin, outMax) => (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;

const XOR = (a, b) => (a || b) && !(a && b);

const isVisibleInViewport = (el) => {
    let bounds = el.getBoundingClientRect(),
        view   = document.documentElement;
    return bounds.right>=0 && bounds.left<=view.clientWidth && bounds.bottom>=0 && bounds.top<=view.clientHeight;
};


//const startTimer = (delay) =>





class ProximityEffect extends EventTarget
{
    // TODO: private vars

    constructor(nodes, params = {})
    {
        super();

        if(!nodes)
        {
            console.log('ProximityEffect: nodes argument is required');
            return null;
        }

        this.preventCenterCalculations = true;

        this.nodes = nodes;
        this._params = params;


        this.threshold = this._params.hasOwnProperty('threshold') ? this._params.threshold : 0;
        this.runoff    = this._params.hasOwnProperty('runoff')    ? this._params.runoff    : DEFAULT_RUNOFF;
        this.attack    = this._params.hasOwnProperty('attack')    ? this._params.attack    : 1;
        this.decay     = this._params.hasOwnProperty('decay')     ? this._params.decay     : 1;
        this.accuracy  = this._params.hasOwnProperty('accuracy')  ? this._params.accuracy  : DEFAULT_ACCURACY;
        this.reverse   = this._params.reverse   || false;
        this.invert    = this._params.invert    || false;
        this.offsetX   = this._params.offsetX   || 0;
        this.offsetY   = this._params.offsetY   || 0;
        this.jitter    = this._params.jitter    || 0;
        this.direction = this._params.direction || DEFAULT_DIRECTION;
        this.FPS       = this._params.FPS       || DEFAULT_FPS;
        this.mode      = this._params.mode      || DEFAULT_MODE;

        this.preventCenterCalculations = false;
        this.setCenterPoints();

        this.update = this.update.bind(this);
      	this.init();
    }





    /////////////////////////
    // GETTER/SETTER PROPS //
    /////////////////////////



    // TARGET

    get target()
    {
        return this._target;
    }

    set target(t)
    {
        if(t.getBoundingClientRect()) this._target = t;
        else console.log(`${t} is not a valid target`);
    }



    // NODES

    get nodes()
    {
        return this._nodes;
    }

    set nodes(n)
    {
        let nodes;


        if(n instanceof NodeList)
        {
            console.log(`NodeList with ${n.length} childNodes found`);
            nodes = n;
        }
        // else if(n instanceof HTMLElement)
        // {
        //     console.log(`HTMLElement with ${n.children.length} children found`);
        //     if(n.children.length<1)
        //     {
        //         let h = document.createElement('span');
        //         n.parentNode.insertBefore(h, n);
        //         h.appendChild(n);
        //         n = h;
        //     }
        //     nodes = n.children;
        // }
        else
      	{
    		console.log(`${n} is not a node list`);
    		return;
      	}

        if(nodes.length<1)
      	{
    		console.log(`No nodes found in ${n}`);
    		return;
      	}

        this._nodes = nodes;
        this._nodeData = new Array(nodes.length);

		if(this._params && !this.preventCenterCalculations) this.setCenterPoints();
    }



    // THRESHOLD [Number>=0]

    get threshold()
    {
    	return this._params.threshold;
    }

    set threshold(num)
    {
    	this._params.threshold = constrain(num, 0);
    }


    // RUNOFF [Number>=0]

    get runoff()
    {
    	return this._params.runoff;
    }

    set runoff(num)
    {
    	this._params.runoff = constrain(num, 0);
        this._invRunoff = 1/this._params.runoff;
    }


    // BOUNDARY [READ-ONLY Number]

    get boundary()
    {
    	return this.threshold + this.runoff;
    }



    // REVERSE [Boolean]

    get reverse()
    {
        return this._params.reverse;
    }

    set reverse(bool)
    {
        this._params.reverse = !!bool;
    }



    // INVERT [Boolean]

    get invert()
    {
        return this._params.invert;
    }

    set invert(bool)
    {
        this._params.invert = !!bool;
    }



    // ATTACK [0>=Number>=1]

    get attack()
    {
    	return this._params.attack;
    }

    set attack(num)
    {
    	this._params.attack = constrain(num, 0, 1);
    }


    // DECAY [0>=Number>=1]

    get decay()
    {
    	return this._params.decay;
    }

    set decay(num)
    {
    	this._params.decay = constrain(num, 0, 1);
    }



  	// OFFSET [Number]

  	get offsetX()
  	{
        return this._params.offsetX;
  	}

  	get offsetY()
  	{
        return this._params.offsetY;
  	}


  	set offsetX(num)
  	{
        this._params.offsetX = num;
        if(!this.preventCenterCalculations) this.setCenterPoints();
  	}

  	set offsetY(num)
  	{
        this._params.offsetY = num;
        if(!this.preventCenterCalculations) this.setCenterPoints();
  	}



  	// JITTER [Number>=0]

  	get jitter()
  	{
        return this._params.jitter;
  	}

  	set jitter(num)
  	{
        this._params.jitter = constrain(num, 0);
        if(!this.preventCenterCalculations) this.setCenterPoints();
  	}



    // DIRECTION [String]

    get direction()
    {
        return this._params.direction;
    }

    set direction(str)
    {
        if(VALID_DIRECTIONS.has(str))
        {
        	this._params.direction = str;
        }
        else console.log(`${str} not a valid direction.`);
    }



    // FPS [Number>0]

    get FPS()
    {
    	return this._params.FPS;
    }

    set FPS(num)
    {
        if(num>0)
        {
            this._params.FPS = constrain(num, 0);
        }
        else console.log('Invalid FPS requested');
    }



    // MODE [String]

    get mode()
    {
        return this._params.mode;
    }

    set mode(str)
    {
        if(str!==this._params.mode)
        {
            if(VALID_MODES.has(str))
            {
                this._params.mode = str;
            }
            else console.log(`${str} not a recognised mode.`);
        }
    	else console.log(`Already in ${str} mode. Mode not changed.`);
    }


    // ACCURACY [Number>=0]

    get accuracy()
    {
        return this._params.accuracy;
    }

    set accuracy(num)
    {
        this._params.accuracy = Math.floor(constrain(num, 0));
    }



    // POINTER
    // Convenience property, provides mouse coordinates without requiring MouseEvent

    get pointer()
    {
        return {
            x: _pointer.x,
            y: _pointer.y
        }
    }






    /////////////////
    // API METHODS //
    /////////////////


    addEffect(str, near, far, ...rest)
    {
        let template;

        if(rest.length>0)
        {
            template = {rule: rest[0], func: rest[1], unit: rest[2]};
        }
        else if(VALID_EFFECTS.hasOwnProperty(str))
        {
            template = VALID_EFFECTS[str];
        }
        else
        {
            console.log(`${str} is not a supported effect type`);
            return;
        }

        this._effects = this._effects || [];
        this._effects.push({
            type: str,
            near: constrain(near, template.min, template.max),
            far:  (far!==undefined && far!==null) ? constrain(far, template.min, template.max) : near,
            rule: template.rule,
            func: template.func,
            unit: template.unit
        });
    }

    // TODO: implement full API

    hasEffect(str)
    {
        //return this._effects.find(str)!==undefined;
    }


    effect(str)
    {
        //return this._effects[str];
    }


    removeEffect(str)
    {
        // if(this.hasEffect(str))
        // {
        //     delete this._effects[str];
        // }
    }


    distanceFrom(node)
    {
        // TODO: move into this._nodeData
        return this.nodes[node].dataset['distance'];
    }






	////////////
	// SET-UP //
	////////////


    init()
    {
        document.addEventListener('mousemove', this.updatePointer);
        document.dispatchEvent(new MouseEvent('mousemove'));

        window.addEventListener('scroll', this.windowEvent.bind(this));
        window.addEventListener('resize', this.windowEvent.bind(this));

        // TODO: add alternative trigger modes

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

        window.requestAnimationFrame(this.update);
    }



    setCenterPoints()
    {
    	for(let i=0; i<this.nodes.length; i++)
    	{
    		let node   = this.nodes[i],
    			bounds = node.getBoundingClientRect(),
                x      = (bounds.left+bounds.right )*0.5 - this.offsetX,
                y      = (bounds.top +bounds.bottom)*0.5 - this.offsetY;

            // TODO: modifying global offsets shouldn't automatically recalculate jitter
            if(this.jitter>0)
            {
                x += (Math.random()-0.5) * this.jitter;
                y += (Math.random()-0.5) * this.jitter;
            }

            if(!this._nodeData[i]) this._nodeData[i] = {};
    		this._nodeData[i].center = {x: x, y: y};
        }
    }







    ////////////
    // EVENTS //
    ////////////


    updatePointer(evt)
    {
        _pointer.x = evt.clientX;
        _pointer.y = evt.clientY;
    }



    windowEvent(evt)
    {
        // TODO: is this a hack? or the best way to do it?
        if(!this.preventCenterCalculations) window.setTimeout(() => this.setCenterPoints(), 1);
    }



    update(timestamp)
    {
        let view = document.documentElement;

        for(let i=0; i<this.nodes.length; i++)
        {
            let node   = this.nodes[i],
                last   = this._nodeData[i].lastDelta,
                bounds = node.getBoundingClientRect();

            // TODO: optimise to update only visible elements
            // WORKAROUND FOR ISSUE #10
            //if(isVisibleInViewport(node) || last<1)
            if(true)
    		{
				let centerX = this._nodeData[i].center.x - (node.dataset['offsetx']||0),
                    centerY = this._nodeData[i].center.y - (node.dataset['offsety']||0);

                let tx, ty;

                if(this.target)
                {
                    let b = this.target.getBoundingClientRect();
                    tx = (b.left + b.right)*0.5;
                    ty = (b.top + b.bottom)*0.5;
                }
                else
                {
                    tx = this.pointer.x;
                    ty = this.pointer.y;
                }

                let dx = tx - centerX,
                    dy = ty - centerY,
                    dd, td, d;

                if(this.direction==='both') dd = Math.sqrt(dx*dx+dy*dy);
                else dd = Math.abs(this.direction==='horizontal' ? dx : dy);

        		td = constrain((dd-this.threshold)*this._invRunoff, 0, 1);
                if(this.invert) td = 1 - td;

                // TODO: move into this._nodeData
                node.dataset['distance'] = td;

                if(last)
                {
                    d = last+(td-last)*(XOR(td>last, this.invert) ? this.decay : this.attack);
                }
                else d = td;

                d = roundTo(d, this.accuracy);
                this._nodeData[i].lastDelta = d;

    			if(d<=1 && this._effects)
    			{
        			let styles = {};

        			for(let i=0; i<this._effects.length; i++)
        			{
        				let effect = this._effects[i],
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
                    for(let rule in styles)
                    {
                      node.style[rule] = styles[rule].join(' ');
                    }
                    node.style.zIndex = 1000-Math.floor(d*1000);
                }
            }
        }

        if(this.mode==='redraw') window.requestAnimationFrame(this.update);

        this.dispatchEvent(new Event('redraw'));

    } // update end

}
