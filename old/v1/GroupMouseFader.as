class GroupMouseFader extends MovieClip {
	private var __target:MovieClip;
	
	private var __threshold:Number;
	private var __runoff:Number;
	private var __invRunoff:Number;
	private var __minFade:Number;
	private var __maxFade:Number;
	private var __aspect:String;
	private var __xScale:Number;
	private var __yScale:Number;
	private var __invert:Boolean;

	private var __numClips:Number;
	private var __objectList:Array;
	private var __colorList:Array;
	private var __soundList:Array;
	private var __frameCount:Array;
	
	public function GroupMouseFader(target:MovieClip, aspect:String,
								threshold:Number, runoff:Number, invert:Boolean,
								minFade:Number, maxFade:Number, xScale:Number, yScale:Number) {
		this.__target = target;
		this.__aspect = aspect;
		this.__threshold = threshold;
		this.__runoff = runoff;
		this.__invert = invert;
		this.__minFade = minFade;
		this.__maxFade = maxFade;
		this.__xScale = xScale;
		this.__yScale = yScale;
		
		this.build();
		}
		
	public function refresh():Void {
		var distance:Number;
		var absVal:Number;
		var fadeVal:Number;
		var obj;
		
		for (obj in this.objectList) {
			switch (this.__aspect) {
				case 'horizontal' :
					distance = Math.abs(this.target_mc._xmouse-this.objectList_array[obj]._x);
					break;
				case 'vertical' :
					distance = Math.abs(this.target_mc._ymouse-this.objectList_array[obj]._y);
					break;
				default :
					distance = Math.pythagoras(this.target_mc._xmouse-this.objectList_array[obj]._x, this.target_mc._ymouse-this.objectList_array[obj]._y);
				}
			var temp = !this.__invert ? this.__boundary-distance : distance-this.__threshold;
			absVal = (temp*this.__invRunoff).constrain(1, 0);
			fadeVal = absVal*this.__fadeOffset+this.__minFade;
			var col = new ColorTransformObject();
			col.aa = this.doAlphaFade ? fadeVal : 100;
			if (col.aa>0) {
				if (!this.objectList_array[obj]._visible) this.objectList_array[obj]._visible = true;
				temp = 1-absVal;
				col.ra = this.doColorFade ? fadeVal : 100;
				if (col.ra<100) {
					col.ga = col.ra;
					col.ba = col.ga;
					col.rb = this.__colorObj.rb*temp;
					col.gb = this.__colorObj.gb*temp;
					col.bb = this.__colorObj.bb*temp;
					}
				this.colorList_array[obj].setTransform(col);
				if (this.doScale) {
					this.objectList_array[obj]._xscale = 100+(this.__xscale-100)*temp;
					this.objectList_array[obj]._yscale = 100+(this.__yscale-100)*temp;
					}
				if(this.doFadeSounds) this.soundList_array[obj].setVolume(fadeVal);
				if(this.doAnimateMCs && this.mcFrameCount_array[obj]>1) {
					temp = Math.ceil(absVal*(this.mcFrameCount_array[obj]-1));
					this.objectList_array[obj].gotoAndStop(!this.__reverseAnim ? ++temp : this.mcFrameCount_array[obj] - temp);
					}
				}
			else if(this.objectList_array[obj]._visible) this.objectList_array[obj]._visible = false;
			}
		}
		
	private function build():Void {
		var obj_ref;
		this.objectList_array = [];
		this.colorList_array = [];
		this.soundList_array = [];
		this.mcFrameCount_array = [];
		for (var obj in this.target_mc) {
			obj_ref = this.target_mc[obj];
			if (typeof(obj_ref) == 'movieclip' && obj_ref != this) {
				this.objectList_array.push(obj_ref);
				this.colorList_array.push(new Color(obj_ref));
				this.soundList_array.push(new Sound(obj_ref));
				this.mcFrameCount_array.push(obj_ref._totalframes);
				if (this.doAnimateMCs) obj_ref.gotoAndStop(!this.__reverseAnim ? 1 : obj_ref._totalframes);
				}
			}
		}
	
	/***** GETTER METHODS *****/
	public function get aspect():String {
		return this.__aspect;
		}
	public function get boundary():Number {
		return this.__boundary;
		}
	public function get enabled():Boolean {
		return this.enable;
		}
	public function get fade():Object {
		return {max:this.__maxFade, min:this.__minFade};
		}
	public function get invert():Boolean {
		return this.__invert;
		}
	public function get maxFade():Number {
		return this.__maxFade;
		}
	public function get minFade():Number {
		return this.__minFade;
		}
	public function get mode():Object {
		var obj:Object = {};
		obj.doAlphaFade = this.doAlphaFade;
		obj.doColorFade = this.doColorFade;
		obj.doScaling = this.doScale;
		obj.doAnimateMCs = this.doAnimateMCs;
		obj.doFadeSounds = this.doFadeSounds;
		return obj;
		}
	public function get reverseAnim():Boolean {
		return this.__reverseAnim;
		}
	public function get runoff():Number {
		return this.__runoff;
		}
	public function get scale():Object {
		return {x:this.__xscale, y:this.__yscale};
		}
	public function get selected():MovieClip {
		return this.__selection;
		}
	public function get target():MovieClip {
		return this.target_mc;
		}
	public function get threshold():Number {
		return this.__threshold;
		}
	public function get tint():Color {
		return this.__colorObj.getTint();
		}
	public function get totalMovies():Number {
		return this.objectList.length;
		}
	public function get xScale():Number {
		return this.__xscale;
		}
	public function get yScale():Number {
		return this.__yscale;
		}
	
	/***** SETTER METHODS *****/
	public function set aspect(aspectString:String):Void {
		this.__aspect = arguments.length>0 ? aspectString.toLowerCase() : 'circular';
		}
	public function set enabled(enabledFlag:Boolean):Void {
		this.enable = arguments.length>0 ? enabledFlag : true;
		}
	public function set invert(invertFlag:Boolean):Void {
		this.__invert = arguments.length>0 ? invertFlag : true;
		}
	public function set maxFade(fade:Number):Void {
		this.__maxFade = arguments.length>0 ? fade : 100;
		this.__fadeOffset = this.__maxFade - this.__minFade;
		}
	public function set minFade(fade:Number):Void {
		this.__minFade = arguments.length>0 ? fade : 100;
		this.__fadeOffset = this.__maxFade - this.__minFade;
		}
/*	public function set mode(alphaFlag:Boolean, colorFlag:Boolean, scaleFlag:Boolean, animateFlag:Boolean, soundFlag:Boolean):Void {
		
		this.doAlphaFade = (alphaFlag!=null) ? alphaFlag : this.doAlphaFade;
		this.doColorFade = (colorFlag!=null) ? colorFlag : this.doColorFade;
		this.doScale = (scaleFlag!=null) ? scaleFlag : this.doScale;
		this.doAnimateMCs = (animateFlag!=null) ? animateFlag : this.doAnimateMCs;
		this.doFadeSounds = (soundFlag!=null) ? soundFlag : this.doFadeSounds;
		}*/
	public function set reverseAnim(flag:Boolean):Void {
		(this.__reverseAnim == arguments.length > 0) ? flag : true;
		}
	public function set runoff(run:Number):Void {
		this.__runoff = run;
		this.__invRunoff = 1 / this.__runoff;
		this.__boundary = this.__threshold + this.__runoff;
	}
	public function set target(targ):Void {
		this.target_mc = (typeof(targ) == 'string') ? this._parent[targ] : targ;
		this.build();
		}
	public function set threshold(thresh:Number):Void {
		this.__threshold = thresh;
		this.__boundary = this.__threshold + this.__runoff;
		}
	public function set tint(tint):Void {
		this.__colorObj.setTint(tint);
		}
	public function set xScale(x:Number):Void {
		this.setScale(arguments.length>0 ? x : 100, this.__yscale);
		}
	public function set yScale(y:Number):Void {
		this.setScale(this.__xscale, arguments.length>0 ? y : 100);
		}
	
	private function executeCallBack():Void {
		this.handlerObj[this.clickHandler](this);
		}
	// END OF CLASS
	}


/*


public function set clickHandler(clck, obj):Void {
	this.handlerObj = (obj == undefined) ? this._parent : obj;
	this.clickHandler = clck;
	}

	

/***** 'PRIVATE' METHODS *****/
/*
p.init = function()
{
	this.enable = true;
	
	this.deadPreview._visible = false;
	this.deadPreview.unloadMovie();
	this.deadPreview.removeMovieClip();
	
	this.setTarget(this._targetInstanceName);
	this.setRunoff(this.__runoff);
	this.setFade(this.__maxFade, this.__minFade);
	this.setScale(this.__scale);
	
	this.__colorObj = new ColorTransformObject();
	this.setTint(this.__tint);
	
	this.setClickHandler(this.clickHandler);
	this.refresh();
}


/***** CLIP EVENTS *****/
/*
p.onMouseMove = function()
{
	if(this.enable)
	{
		updateAfterEvent(mouseMove);
		this.refresh();
	}
}
p.onMouseDown = function()
{
	if(this.enable)
	{
		for(var e in this.objectList_array)
		{
			if(this.objectList_array[e].hitTest(_root._xmouse, _root._ymouse, true))
			{
				this.__lastPressed = this.objectList_array[e];
				break;
			}
		}
	}
}
p.onMouseUp = function()
{
	if(this.enable)
	{
		if(this.__lastPressed.hitTest(_root._xmouse, _root._ymouse, true))
		{
			this.__selection = this.__lastPressed;
			if(this.clickHandler.length > 0)
			{
				this.executeCallBack();
			}
		}
		delete this.__lastPressed;
	}
}


/***** OBJECT EXTENSIONS *****/
/*
Math.pythagoras = function(x, y)
{
	return Math.sqrt(x*x+y*y);
}
Number.prototype.constrain = function(c, f)
{
	if(c==undefined) c = Number.POSITIVE_INFINITY;
	if(f==undefined) f = Number.NEGATIVE_INFINITY
	return Math.max(Math.min(this,c),f);
}
*/
