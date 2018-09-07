package adasha.transitions {
	
	import flash.display.DisplayObject;
	import flash.display.Sprite;
	import flash.display.Stage;
	
	import flash.events.Event;
	import flash.events.MouseEvent;
	
	import fl.motion.Color;
	
	public class MouseEffector extends Sprite {
		
		public static const value:String = 'result';
		
		private var _enabled:Boolean;
		
		private var _items:Array;
		private var _props:Array;
		private var _colors:Color;
		
		private var _startRadius:Number = 0;
		private var _endRadius:Number = 100;
		private var _invertEffect:Boolean = false;
		private var _mouseAspect:String = 'CIRCULAR';
		
		public function MouseEffector() {
			_items = [];
			_props = [];
			enabled = true;
			addEventListener(Event.ADDED_TO_STAGE, addedToStageHandler);
			}
		
		
		private function refresh():void {
			var ref:DisplayObject;
			var prop:Object;
			var xm, ym:Number; // x mouse, y mouse
			var d, nd:Number; // distance, normalised distance
			var t:Number; // theta
			
			for(var i:String in _items) {
				ref = _items[i];
				xm = ref.mouseX; ym = ref.mouseY;
				d = Math.sqrt(xm*xm+ym*ym);
				nd = Math.max(Math.min(Math.abs(d-startRadius)/endRadius, 1), 0);
				t = Math.atan2(ym, xm);
				
				for(var p:String in _props) {
					prop = _props[p];
					ref[prop.name] = prop.start*(1-nd)+(prop.start+prop.diff)*nd;
					}
				}
			}
		
		
		// event handlers
		
		private function addedToStageHandler(evt:Event):void {
			stage.addEventListener(MouseEvent.MOUSE_MOVE, mouseMoveHandler);			
			}
		
		private function mouseMoveHandler(evt:MouseEvent):void {
			if(enabled) refresh();
			}
		
		
		// targets
		
		public function addTarget(ref:DisplayObject):uint {
			return _items.push(ref);
			}
		
		
		// properties to affect
		
		public function addProperty(propName:String, startVal:Number, endVal:Number):void {
			var obj:Object = {name: propName, start: startVal, end: endVal, diff: endVal-startVal};
			_props.push(obj);
			}
		
		public function get properties():Array {
			return _props;
			}
		
		
		// effect boundaries
		
		public function get startRadius():Number {
			return _startRadius;
			}
		public function set startRadius(r:Number):void {
			_startRadius = Math.max(r, 0);
			if(endRadius<startRadius) endRadius = startRadius;
			}
		
		public function get endRadius():Number {
			return _endRadius;
			}
		public function set endRadius(r:Number):void {
			_endRadius = Math.max(r, 0);
			if(startRadius>endRadius) startRadius = endRadius;
			}
		
		public function swapRadii():void {
			var tmp:Number = startRadius;
			startRadius = endRadius;
			endRadius = tmp;
			}
		
		public function get invertEffect():Boolean {
			return _invertEffect;
			}
		
		public function set invertEffect(flag:Boolean):void {
			_invertEffect = flag;
			}
		
		
		// effects
		
		
		
		public function get enabled():Boolean {
			return _enabled;
			}
		
		public function set enabled(flag:Boolean):void {
			_enabled = flag;
			}
		
		}
	
	}
