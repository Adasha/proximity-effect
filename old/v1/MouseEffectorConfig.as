package adasha.transitions {
	
	class MouseEffectorConfig {
		
		public static const INVERT_TRUE:Boolean = true;
		public static const INVERT_FALSE:Boolean = false;
		public static const ALPHA_TRUE:Boolean = true;
		public static const ALPHA_FALSE:Boolean = false;
		public static const COLOR_TRUE:Boolean = true;
		public static const COLOR_FALSE:Boolean = false;
		public static const COLOUR_TRUE:Boolean = true;
		public static const COLOUR_FALSE:Boolean = false;
		public static const SCALE_TRUE:Boolean = true;
		public static const SCALE_FALSE:Boolean = false;
		public static const ANIMATE_TRUE:Boolean = true;
		public static const ANIMATE_FALSE:Boolean = false;
		public static const SOUND_TRUE:Boolean = true;
		public static const SOUND_FALSE:Boolean = false;
		
		private var _innerRadius:Number = 0;
		private var _outerRadius:Number = 100;
		private var _invert:Boolean = false;
		private var _innerAlpha:Number = 100;
		private var _outerAlpha:Number = 0;
		
		function MouseEffectorConfig() {
			}
		
		public function get invert():Boolean {
			return _invert;
			}
		public function set invert(flag:Boolean):void {
			_invert = flag;
			}
		
		}
	
	}
