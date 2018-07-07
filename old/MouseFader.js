// v1 obsolete



function MouseFader(t, params = {})
{

    var c;

    if(t instanceof HTMLElement)
    {
        c = t.childNodes;
    }
    else if(t instanceof NodeList)
    {
        c = t;
    }
    else return;

    if(c.length<1) return;


    function constrain(num, max, min)
    {
        if(typeof num!=='number') {return NaN;}
        min = min || 0;
        return Math.max(Math.min(num, max), min);
    }

	function delta(v, a, b)
	{
		return (b-a)*v+a;
	}



    params.mode      = params.mode      || 'enterframe';
    params.FPS       = params.FPS       || 30;
    params.threshold = params.hasOwnProperty('threshold') ? params.threshold :   0;
    params.distance  = params.hasOwnProperty('distance')  ? params.distance  : 100;
    params.attack    = params.hasOwnProperty('attack')    ? params.attack    :   1;
    params.decay     = params.hasOwnProperty('decay')     ? params.decay     :   1;

	params.affectOpacity    = params.hasOwnProperty('affectOpacity')    ? params.affectOpacity    : true;
	params.affectScale      = params.hasOwnProperty('affectScale')      ? params.affectScale      : false;
	params.affectTranslateZ = params.hasOwnProperty('affectTranslateZ') ? params.affectTranslateZ : false;
	params.affectRotation   = params.hasOwnProperty('affectRotation')   ? params.affectRotation   : false;
	params.affectBlur       = params.hasOwnProperty('affectBlur')       ? params.affectBlur       : false;

    params.opacityNear    = params.hasOwnProperty('opacityNear')    ? constrain(params.opacityNear,   1, 0) : 1;
    params.opacityFar     = params.hasOwnProperty('opacityFar')     ? constrain(params.opacityFar,    1, 0) : 0;

    params.scaleNear      = params.hasOwnProperty('scaleNear')      ? constrain(params.scaleNear,   100, 0) : 1;
    params.scaleFar       = params.hasOwnProperty('scaleFar')       ? constrain(params.scaleFar,    100, 0) : 0;

    params.translateZNear = params.hasOwnProperty('translateZNear') ? params.translateZNear : 0;
    params.translateZFar  = params.hasOwnProperty('translateZFar')  ? params.translateZFar : 0;

    params.rotationNear   = params.hasOwnProperty('rotationNear')   ? params.rotationNear : 0;
    params.rotationFar    = params.hasOwnProperty('rotationFar')    ? params.rotationFar : 0;

    params.blurNear       = params.hasOwnProperty('blurNear')       ? params.blurNear : 0;
	params.blurFar        = params.hasOwnProperty('blurFar')        ? params.blurFar : 0;


    var    pointer = {},
        lastDeltas = new Array(c.length);

    var frameLoop;





	// set up event listeners and frame timer if required
    function init()
    {
		let b = document.body;
        b.addEventListener('mousemove',  updatePointer);
        b.addEventListener('touchmove', touchMove);
        b.addEventListener('touchstart', touchDown);
        b.addEventListener('touchend', touchUp);

        if(params.mode==='mousemove')
        {
            b.addEventListener('mousemove',  update);
        }
        else if(params.mode==='enterframe')
        {
            b.addEventListener('enterframe', enterFrame);

            frameLoop = window.setInterval(function(){
                b.dispatchEvent(new Event('enterframe'));
            }, 1000/params.FPS);
        }
		else
		{
			console.log('MouseFader: '+params.mode+' is not a valid trigger type.');
		}
    }

	// poll mouse position
    function updatePointer(e)
    {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
    }

    function touchMove(e)
    {
        console.log('move');
    }

    function touchDown(e)
    {
        console.log('touch');
    }

    function touchUp(e)
    {
        console.log('release');
    }

	function enterFrame()
	{
		window.requestAnimationFrame(update);
	}

	// update target and all children
    function update()
    {
        let e, l, b, dx, dy, dd, td, d;
		let v = document.documentElement;
		let transforms, filters;

        for(let i=0; i<c.length; i++)
        {
            e = c[i];
            l = lastDeltas[i];
            b = e.getBoundingClientRect();

			if((b.right>=0 && b.left<=v.clientWidth && b.bottom>=0 && b.top<=v.clientHeight) || l<1)
			{
				dx = pointer.x - (b.left+b.right )*0.5;
				dy = pointer.y - (b.top +b.bottom)*0.5;
				dd = Math.sqrt(dx*dx+dy*dy);
				td = constrain((dd-params.threshold)/params.distance, 1, 0);

                if(l)
                {
                    d = l+(td-l)*((td>l) ? params.decay : params.attack);
                }
                else
                {
                    d = td;
                }

				if(d<=1)
				{
					transforms = [];
					filters = [];

					if(params.affectOpacity)
					{
						e.style.opacity   = delta(d, params.opacityNear, params.opacityFar);
					}
					if(params.affectScale)
					{
						transforms.push('scale('+delta(d, params.scaleNear, params.scaleFar)+')');
					}
					if(params.affectTranslateZ)
					{
						transforms.push('translateZ('+delta(d, params.translateZNear, params.translateZFar)+'px)');
					}
					if(params.affectBlur)
					{
						filters.push('blur('+delta(d, params.blurNear, params.blurFar)+'px)');
					}
					e.style.transform = transforms.join(', ') || 'none';
					e.style.filter    = filters.join(', ') || 'none';
				}

                lastDeltas[i] = d;
			}
        }
    }

	function stop()
	{
		var b = document.body;
		b.removeEventListener('mousemove',  updatePointer);
		b.removeEventListener('mousemove',  update);
		b.removeEventListener('enterframe', update);
	}



    init();


    return {
         target: t,
            FPS: params.FPS,
		pointer: pointer
    };
}
