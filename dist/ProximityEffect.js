"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var AdashaUtils = _interopRequireWildcard(require("./AdashaUtils.mjs"));
var _StyleClass = _interopRequireDefault(require("./StyleClass.mjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function _interopRequireWildcard(e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, "default": e }; if (null === e || "object" != _typeof(e) && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t in e) "default" !== _t && {}.hasOwnProperty.call(e, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e[_t]); return f; })(e, t); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function _wrapNativeSuper(t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _classPrivateMethodInitSpec(e, a) { _checkPrivateRedeclaration(e, a), a.add(e); }
function _classPrivateFieldInitSpec(e, t, a) { _checkPrivateRedeclaration(e, t), t.set(e, a); }
function _checkPrivateRedeclaration(e, t) { if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object"); }
function _classPrivateFieldGet(s, a) { return s.get(_assertClassBrand(s, a)); }
function _classPrivateFieldSet(s, a, r) { return s.set(_assertClassBrand(s, a), r), r; }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }
/*
 * ProximityEffect class by Adasha
 * Licensed under MPL-2.0
 * Repository: https://github.com/Adasha/proximity-effect
 * Demos: http://lab.adasha.com/proximity-effect
 */
/**
 * Class representing a ProximityEffect.
 * @version 4.0.0-alpha1
 * @author Adam Shailer <adasha76@outlook.com>
 * @class
 * @extends EventTarget
 * @fires ProximityEffect#ready
 * @fires ProximityEffect#redraw
 * @fires ProximityEffect#reflow
 */
var _VALID_DIRECTIONS = /*#__PURE__*/new WeakMap();
var _DEFAULT_DIRECTION = /*#__PURE__*/new WeakMap();
var _DEFAULT_ACCURACY = /*#__PURE__*/new WeakMap();
var _DEFAULT_RUNOFF = /*#__PURE__*/new WeakMap();
var _VALID_RANDOM_METHODS = /*#__PURE__*/new WeakMap();
var _DEFAULT_SCATTER_METHOD = /*#__PURE__*/new WeakMap();
var _DEFAULT_JITTER_METHOD = /*#__PURE__*/new WeakMap();
var _DEFINED_STYLES = /*#__PURE__*/new WeakMap();
var _globalParams = /*#__PURE__*/new WeakMap();
var _pointer = /*#__PURE__*/new WeakMap();
var _coords = /*#__PURE__*/new WeakMap();
var _stylesStack = /*#__PURE__*/new WeakMap();
var _properties = /*#__PURE__*/new WeakMap();
var _nodes = /*#__PURE__*/new WeakMap();
var _nodeData = /*#__PURE__*/new WeakMap();
var _fpsTimerRef = /*#__PURE__*/new WeakMap();
var _ProximityEffect_brand = /*#__PURE__*/new WeakSet();
var ProximityEffect = exports["default"] = /*#__PURE__*/function (_EventTarget) {
  /**
   * Create a ProximityEffect instance.
   * @constructor
   * @param {NodeList} nodes - A list of nodes to control.
   * @param {Object}  [params={}] - An object containing effect parameters.
   * @param {number}  [params.threshold=0] - The global effect threshold, in pixels.
   * @param {number}  [params.runoff] - The global effect runoff, in pixels.
   * @param {boolean} [params.invert=false] - Invert distances globally.
   * @param {string}  [params.direction="both"] - The effect direction, one of "both", "horizontal" or "vertical".
   * @param {number}  [params.attack=1] - The global effect attack.
   * @param {number}  [params.decay=1] - The global effect decay.
   * @param {number}  [params.offsetX=0] - The global horizontal offset, in pixels.
   * @param {number}  [params.offsetY=0] - The global vertical offset, in pixels.
   * @param {number}  [params.jitter=0] - The effect jitter, in pixels. Affects X and Y.
   * @param {number}  [params.jitterX=0] - The effect jitter for the X axis only, in pixels.
   * @param {number}  [params.jitterY=0] - The effect jitter for the Y axis only, in pixels.
   * @param {string}  [params.jitterMethod] - The random method for generating jitter values. 
   * @param {number}  [params.accuracy] - The effect accuracy.
   * @param {number|Falsy} [params.FPS] - The frame rate of the effect, either the number specified or with the screen refresh.
   * @param {Element} [params.target] - The effect tracker target.
   * @param {boolean} [params.primeDistances=false] - Prime the initial distances to create a transition on load. Only available through params argument in constructor.
   */
  function ProximityEffect(nodes) {
    var _this;
    var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, ProximityEffect);
    _this = _callSuper(this, ProximityEffect);
    ///////////////////////////////
    //                           //
    //      PRIVATE METHODS      //
    //                           //
    ///////////////////////////////
    _classPrivateMethodInitSpec(_this, _ProximityEffect_brand);
    _classPrivateFieldInitSpec(_this, _VALID_DIRECTIONS, new Set(["both", "horizontal", "vertical"]));
    _classPrivateFieldInitSpec(_this, _DEFAULT_DIRECTION, "both");
    _classPrivateFieldInitSpec(_this, _DEFAULT_ACCURACY, 5);
    _classPrivateFieldInitSpec(_this, _DEFAULT_RUNOFF, 100);
    _classPrivateFieldInitSpec(_this, _VALID_RANDOM_METHODS, new Set(["normal", "uniform"]));
    _classPrivateFieldInitSpec(_this, _DEFAULT_SCATTER_METHOD, "uniform");
    _classPrivateFieldInitSpec(_this, _DEFAULT_JITTER_METHOD, "uniform");
    _classPrivateFieldInitSpec(_this, _DEFINED_STYLES, {
      translateX: {
        "default": 0,
        rule: "transform",
        func: "translateX",
        unit: "px"
      },
      translateY: {
        "default": 0,
        rule: "transform",
        func: "translateY",
        unit: "px"
      },
      translateZ: {
        "default": 0,
        rule: "transform",
        func: "translateZ",
        unit: "px"
      },
      rotate: {
        "default": 0,
        rule: "transform",
        func: "rotate",
        unit: "deg"
      },
      rotateX: {
        "default": 0,
        rule: "transform",
        func: "rotateX",
        unit: "deg"
      },
      rotateY: {
        "default": 0,
        rule: "transform",
        func: "rotateY",
        unit: "deg"
      },
      rotateZ: {
        "default": 0,
        rule: "transform",
        func: "rotateZ",
        unit: "deg"
      },
      scale: {
        "default": 1,
        rule: "transform",
        func: "scale"
      },
      scaleX: {
        "default": 1,
        rule: "transform",
        func: "scaleX"
      },
      scaleY: {
        "default": 1,
        rule: "transform",
        func: "scaleY"
      },
      scaleZ: {
        "default": 1,
        rule: "transform",
        func: "scaleZ"
      },
      skewX: {
        "default": 0,
        rule: "transform",
        func: "skewX",
        unit: "deg"
      },
      skewY: {
        "default": 0,
        rule: "transform",
        func: "skewY",
        unit: "deg"
      },
      blur: {
        min: 0,
        "default": 0,
        rule: "filter",
        func: "blur",
        unit: "px"
      },
      brightness: {
        min: 0,
        "default": 100,
        rule: "filter",
        func: "brightness",
        unit: "%"
      },
      contrast: {
        min: 0,
        "default": 100,
        rule: "filter",
        func: "contrast",
        unit: "%"
      },
      grayscale: {
        min: 0,
        max: 100,
        "default": 0,
        rule: "filter",
        func: "grayscale",
        unit: "%"
      },
      hueRotate: {
        "default": 0,
        rule: "filter",
        func: "hue-rotate",
        unit: "deg"
      },
      invert: {
        min: 0,
        max: 100,
        "default": 0,
        rule: "filter",
        func: "invert",
        unit: "%"
      },
      opacity: {
        min: 0,
        max: 100,
        "default": 100,
        rule: "filter",
        func: "opacity",
        unit: "%"
      },
      saturate: {
        min: 0,
        max: 100,
        "default": 100,
        rule: "filter",
        func: "saturate",
        unit: "%"
      },
      sepia: {
        min: 0,
        max: 100,
        "default": 0,
        rule: "filter",
        func: "sepia",
        unit: "%"
      },
      color: {
        min: 0,
        max: 255,
        "default": [0, 0, 0],
        rule: "color",
        func: "rgb",
        args: 3
      },
      backgroundColor: {
        min: 0,
        max: 255,
        "default": [0, 0, 0],
        rule: "backgroundColor",
        func: "rgb",
        args: 3
      },
      scale3D: {
        "default": [1, 1, 1],
        rule: "transform",
        func: "scale3D",
        args: 3
      }
    });
    _classPrivateFieldInitSpec(_this, _globalParams, void 0);
    _classPrivateFieldInitSpec(_this, _pointer, {});
    _classPrivateFieldInitSpec(_this, _coords, void 0);
    _classPrivateFieldInitSpec(_this, _stylesStack, void 0);
    _classPrivateFieldInitSpec(_this, _properties, void 0);
    _classPrivateFieldInitSpec(_this, _nodes, void 0);
    _classPrivateFieldInitSpec(_this, _nodeData, void 0);
    _classPrivateFieldInitSpec(_this, _fpsTimerRef, void 0);
    if (!nodes) {
      throw new Error("ProximityEffect: nodes argument is required.");
    }

    // turn off centre calculations during setup to avoid calling repeatedly
    _this.preventCenterCalculations = true;
    _classPrivateFieldSet(_globalParams, _this, params);
    _this.nodes = nodes;

    // set global parameter values
    _this.threshold = _classPrivateFieldGet(_globalParams, _this).hasOwnProperty("threshold") ? _classPrivateFieldGet(_globalParams, _this).threshold : 0;
    _this.runoff = _classPrivateFieldGet(_globalParams, _this).hasOwnProperty("runoff") ? _classPrivateFieldGet(_globalParams, _this).runoff : _classPrivateFieldGet(_DEFAULT_RUNOFF, _this);
    _this.attack = _classPrivateFieldGet(_globalParams, _this).hasOwnProperty("attack") ? _classPrivateFieldGet(_globalParams, _this).attack : 1;
    _this.decay = _classPrivateFieldGet(_globalParams, _this).hasOwnProperty("decay") ? _classPrivateFieldGet(_globalParams, _this).decay : 1;
    _this.accuracy = _classPrivateFieldGet(_globalParams, _this).hasOwnProperty("accuracy") ? _classPrivateFieldGet(_globalParams, _this).accuracy : _classPrivateFieldGet(_DEFAULT_ACCURACY, _this);
    //this.reverse   = this.#globalParams.reverse   || false;
    _this.invert = _classPrivateFieldGet(_globalParams, _this).invert || false;
    _this.offsetX = _classPrivateFieldGet(_globalParams, _this).offsetX || 0;
    _this.offsetY = _classPrivateFieldGet(_globalParams, _this).offsetY || 0;
    _this.jitter = _classPrivateFieldGet(_globalParams, _this).jitter || 0;
    _this.jitterX = _classPrivateFieldGet(_globalParams, _this).jitterX || 0;
    _this.jitterY = _classPrivateFieldGet(_globalParams, _this).jitterY || 0;
    _this.direction = _classPrivateFieldGet(_globalParams, _this).direction || _classPrivateFieldGet(_DEFAULT_DIRECTION, _this);
    //this.FPS       = this.#globalParams.FPS;
    _this.target = _classPrivateFieldGet(_globalParams, _this).target;

    // finish setup once the document is ready
    if (document.readyState === "completed") {
      _assertClassBrand(_ProximityEffect_brand, _this, _init).call(_this);
    } else {
      window.addEventListener("load", function () {
        return _assertClassBrand(_ProximityEffect_brand, _this, _init).call(_this);
      });
    }
    return _this;
  }

  /////////////////////////////////
  //                             //
  //     GETTER/SETTER PROPS     //
  //                             //
  /////////////////////////////////

  /**
   * Get the currently tracked target.
   * @return {Element|Falsy} The current target.
   */
  _inherits(ProximityEffect, _EventTarget);
  return _createClass(ProximityEffect, [{
    key: "target",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).target;
    }

    /**
     * Set the target to track.
     * @param {Element|Falsy} target - A reference to a DOM Element, or falsy to target mouse.
     */,
    set: function set(target) {
      if (!target || target.getBoundingClientRect()) {
        _classPrivateFieldGet(_globalParams, this).target = target;
      } else {
        throw new Error("ProximityEffect: ".concat(target, " is not a valid target."));
      }
    }

    /**
     * Get the list of nodes.
     * @return {Array<Element>} The node array.
     */
  }, {
    key: "nodes",
    get: function get() {
      return _classPrivateFieldGet(_nodes, this);
    }

    /**
     * Set the list of nodes to animate.
     * @param {NodeList<Element>} list - The list of nodes.
     */,
    set: function set(list) {
      var _this2 = this;
      if (!(list instanceof NodeList)) {
        throw new Error("ProximityEffect: ".concat(list, " is not a node list."));
      }
      if (list.length < 1) {
        throw new Error("ProximityEffect: No nodes found in ".concat(list, "."));
      }
      _classPrivateFieldSet(_nodes, this, [].slice.call(list)); // convert to array boilerplate
      _classPrivateFieldSet(_nodeData, this, _classPrivateFieldGet(_nodes, this).map(function (i) {
        return {
          node: i,
          style: i.style.cssText,
          lastDelta: _classPrivateFieldGet(_globalParams, _this2).primeDistances ? 1 : null
        };
      }));
      if (_classPrivateFieldGet(_globalParams, this) && !this.preventCenterCalculations) {
        this.setCenterPoints();
      }
    }

    /**
     * 
     */
  }, {
    key: "totalNodes",
    get: function get() {
      return this.nodes.length;
    }

    /**
     * Get the list of styles.
     * @return {Array<Object>} The styles array.
     */
  }, {
    key: "styles",
    get: function get() {
      return _classPrivateFieldGet(_stylesStack, this);
    }

    /**
     * Get the effect threshold.
     * @return {number} The threshold radius, in pixels.
     */
  }, {
    key: "threshold",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).threshold;
    }

    /**
     * Set the effect threshold.
     * @param {number} value - The new threshold radius, in pixels.
     */,
    set: function set(value) {
      _classPrivateFieldGet(_globalParams, this).threshold = AdashaUtils.constrain(value, 0);
    }

    /**
     * Get the effect runoff.
     * @return {number} The runoff radius, in pixels.
     */
  }, {
    key: "runoff",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).runoff;
    }

    /**
     * Set the effect runoff.
     * @param {number} value - The new runoff radius, in pixels.
     */,
    set: function set(value) {
      _classPrivateFieldGet(_globalParams, this).runoff = AdashaUtils.constrain(value, 0);
      _classPrivateFieldGet(_globalParams, this).invRunoff = 1 / _classPrivateFieldGet(_globalParams, this).runoff;
    }

    /**
     * Get the effect boundary.
     * @return {number} The boundary radius, in pixels.
     */
  }, {
    key: "boundary",
    get: function get() {
      return this.threshold + this.runoff;
    }

    /**
     * Get the invert state.
     * @return {boolean} The invert value.
     */
  }, {
    key: "invert",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).invert;
    }

    /**
     * Set the invert state.
     * @param {boolean} flag - The new invert value.
     */,
    set: function set(flag) {
      _classPrivateFieldGet(_globalParams, this).invert = !!flag;
    }

    /**
     * Get the effect attack.
     * @return {number} The attack value.
     */
  }, {
    key: "attack",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).attack;
    }

    /**
     * Set the effect attack.
     * @param {number} value - The new attack value.
     */,
    set: function set(value) {
      _classPrivateFieldGet(_globalParams, this).attack = AdashaUtils.constrain(value, 0, 1);
    }

    /**
     * Get the effect decay.
     * @return {number} The decay value.
     */
  }, {
    key: "decay",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).decay;
    }

    /**
     * Set the effect decay.
     * @param {number} value - The new decay value.
     */,
    set: function set(value) {
      _classPrivateFieldGet(_globalParams, this).decay = AdashaUtils.constrain(value, 0, 1);
    }

    /**
     * Get the global horizontal offset.
     * @return {number} The offset value, in pixels.
     */
  }, {
    key: "offsetX",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).offsetX;
    }

    /**
     * Get the global vertical offset.
     * @return {number} The offset value, in pixels.
     */,
    set:
    /**
     * Set the global horizontal offset.
     * @param {number} value - The new offset value, in pixels.
     */
    function set(value) {
      _classPrivateFieldGet(_globalParams, this).offsetX = value;
      if (!this.preventCenterCalculations) {
        this.setCenterPoints();
      }
    }

    /**
     * Set the global vertical offset, in pixels.
     * @param {number} value - The new offset value.
     */
  }, {
    key: "offsetY",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).offsetY;
    },
    set: function set(value) {
      _classPrivateFieldGet(_globalParams, this).offsetY = value;
      if (!this.preventCenterCalculations) {
        this.setCenterPoints();
      }
    }

    /**
     * Get the jitter value.
     * @return {number} The jitter value, in pixels.
     */
  }, {
    key: "jitter",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).jitter;
    }

    /**
     * Get the jitterX value.
     * @return {number} The jitterX value, in pixels.
     */,
    set:
    /**
     * Set the jitter value.
     * @param {number} num - The new jitter value, in pixels.
     */
    function set(num) {
      _classPrivateFieldGet(_globalParams, this).jitter = AdashaUtils.constrain(num, 0);
      _assertClassBrand(_ProximityEffect_brand, this, _calculateJitters).call(this);
    }

    /**
     * Set the jitterX value.
     * @param {number} num - The new jitterX value, in pixels.
     */
  }, {
    key: "jitterX",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).jitterX;
    }

    /**
     * Get the jitterY value.
     * @return {number} The jitterY value, in pixels.
     */,
    set: function set(num) {
      _classPrivateFieldGet(_globalParams, this).jitterX = AdashaUtils.constrain(num, 0);
      _assertClassBrand(_ProximityEffect_brand, this, _calculateJitters).call(this);
    }

    /**
     * Set the jitterY value.
     * @param {number} num - The new jitterY value, in pixels.
     */
  }, {
    key: "jitterY",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).jitterY;
    },
    set: function set(num) {
      _classPrivateFieldGet(_globalParams, this).jitterY = AdashaUtils.constrain(num, 0);
      _assertClassBrand(_ProximityEffect_brand, this, _calculateJitters).call(this);
    }

    /**
     * Get the jitter method.
     * @returns {string} The random jitter method.
     */
  }, {
    key: "jitterMethod",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).jitterMethod;
    }

    /**
     * Set the jitter method.
     * @param {string} method - The random string method to use.
     */,
    set: function set(method) {
      _classPrivateFieldGet(_globalParams, this).jitterMethod = method;
      _assertClassBrand(_ProximityEffect_brand, this, _calculateJitters).call(this);
    }

    /**
     * Get the effect direction.
     * @return {string} The direction value.
     */
  }, {
    key: "direction",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).direction;
    }

    /**
     * Set the effect direction.
     * @param {string} str - The new direction value, both|horizontal|vertical.
     */,
    set: function set(str) {
      if (_classPrivateFieldGet(_VALID_DIRECTIONS, this).has(str)) {
        _classPrivateFieldGet(_globalParams, this).direction = str;
      } else {
        return void console.log("ProximityEffect: '".concat(str, "' is not a valid direction."));
      }
    }

    // FPS [Number>0]
  }, {
    key: "FPS",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).FPS;
    },
    set: function set(num) {
      if (_classPrivateFieldGet(_fpsTimerRef, this)) {
        window.clearInterval(_classPrivateFieldGet(_fpsTimerRef, this));
        _classPrivateFieldSet(_fpsTimerRef, this, null);
      }
      if (typeof num === 'number' && num > 0) {
        _classPrivateFieldGet(_globalParams, this).FPS = AdashaUtils.constrain(num, 0);
        _assertClassBrand(_ProximityEffect_brand, this, _runFrames).call(this);
      } else {
        _classPrivateFieldGet(_globalParams, this).FPS = null;
      }
    }

    /**
     * Get the effect accuracy.
     * @return {number} The accuracy value.
     */
  }, {
    key: "accuracy",
    get: function get() {
      return _classPrivateFieldGet(_globalParams, this).accuracy;
    }

    /**
     * Set the effect accuracy.
     * @param {number} num - The new accuracy value.
     */,
    set: function set(num) {
      _classPrivateFieldGet(_globalParams, this).accuracy = Math.floor(AdashaUtils.constrain(num, 0));
    }

    /**
     * Get the last known mouse pointer coordinates, relative to the viewport, in pixels.
     * @return {Object} An object containing x and y properties.
     */
  }, {
    key: "pointer",
    get: function get() {
      return {
        x: _classPrivateFieldGet(_pointer, this).x,
        y: _classPrivateFieldGet(_pointer, this).y
      };
    }

    ////////////////////////////
    //                        //
    //     PUBLIC METHODS     //
    //                        //
    ////////////////////////////

    /**
     * Add a new style rule to the styles animation stack.
     * @param {string|Object} property - The predefined style rule as a string, or an object containing a CSS style configuration.
     * @param {string} [property.rule] - The custom CSS style rule to use.
     * @param {string} [property.func] - The CSS function of the given style rule.
     * @param {number} [property.min] - The minimum style value.
     * @param {number} [property.max] - The maximum style value.
     * @param {number} [property.default] - The default style value.
     * @param {string} [property.unit] - The style rule's CSS unit.
     * @param {number|Object} near - The style value at the closest distance, either a single number or an object containing more properties.
     * @param {number} near.value - The style value at closest distance, as an object property.
     * @param {number} [near.scatter] - The random distribution of the value at the closest distance.
     * @param {string} [near.scatterMethod] - The random scatter method.
     * @param {number|Object} far - The style value at the furthest distance, either a single number or an object containing more properties.
     * @param {number} far.value - The style value at furthest distance, as an object property.
     * @param {number} [far.scatter] - The random distribution of the value at the furthest distance.
     * @param {string} [far.scatterMethod] - The random scatter method.
     * @param {Object} [params] - An object containing additional effect parameters.
     * @param {string} [params.id] - A unique string to identify the style rule.
     * @param {number} [params.threshold] - The animation distance threshold for this style, overriding the global value.
     * @param {number} [params.runoff] - The animation runoff distance for this style, overriding the global value.
     * @param {Boolean} [params.invert] - XXXXX, overriding the global value.
     * @param {number} [params.attack] - , overriding the global value.
     * @param {number} [params.decay] - , overriding the global value.
     */
  }, {
    key: "addStyle",
    value: function addStyle(property, keyframes, params) {
      _classPrivateFieldSet(_stylesStack, this, _classPrivateFieldGet(_stylesStack, this) || []);
      var style = new _StyleClass["default"](property, keyframes, params);
      var near = style.near;
      var far = style.far;
      _classPrivateFieldGet(_stylesStack, this).push(style);
      for (var i = 0; i < _classPrivateFieldGet(_nodeData, this).length; i++) {
        var styles = this.getNodeIndexData(i, "styles") || _assertClassBrand(_ProximityEffect_brand, this, _setNodeIndexData).call(this, i, "styles", [])["styles"];
        var nearMethod = near.scatterMethod ? near.scatterMethod : _classPrivateFieldGet(_DEFAULT_SCATTER_METHOD, this),
          farMethod = far.scatterMethod ? far.scatterMethod : _classPrivateFieldGet(_DEFAULT_SCATTER_METHOD, this);
        styles.push({
          near: near.scatter ? near.value + AdashaUtils.random(near.scatter, nearMethod) : near.value,
          far: far.scatter ? far.value + AdashaUtils.random(far.scatter, farMethod) : far.value
        });
      }
    }

    /**
     * Check if a named style is already on the stack.
     * @param {string} name - The name of the style to check for.
     * @return {boolean} True if the style exists at least once.
     */
  }, {
    key: "hasStyleProp",
    value: function hasStyleProp(prop) {
      return this.styles.find(function (s) {
        return s["func"] === prop;
      }) !== undefined;
    }

    /**
     * Remove all instances of a style from the stack.
     * @param {string} name - The name of the style to remove.
     */
  }, {
    key: "removeStyleProp",
    value: function removeStyleProp(rule) {
      if (this.hasStyleProp(rule)) {
        for (var i = 0; i < _classPrivateFieldGet(_stylesStack, this).length; i++) {
          var eff = _classPrivateFieldGet(_stylesStack, this)[i];
          if (eff["type"] === rule) {
            _classPrivateFieldGet(_stylesStack, this).splice(i, 1);
          }
        }
      }
    }

    /**
     * 
     * @param {String} prop - The property name - should return a number.
     * @param {Object} params - 
     * @param {number} params.min - 
     * @param {number} params.max - 
     * @param {Function} params.callback - 
     * @returns 
     */
  }, {
    key: "addProperty",
    value: function addProperty(name, params) {
      _classPrivateFieldSet(_properties, this, _classPrivateFieldGet(_properties, this) || []);
      var propertyObj = {
        name: name,
        params: params
      };
      _classPrivateFieldGet(_properties, this).push(propertyObj);
    }

    /**
     * 
     * @param {*} n 
     * @returns 
     */
  }, {
    key: "hasProperty",
    value: function hasProperty() {}

    /**
     * 
     * @param {*} n 
     * @returns 
     */
  }, {
    key: "removeProperty",
    value: function removeProperty() {}

    /**
     * Get the distance to the current target from the given node, in pixels.
     * @param {Element} n - The node to check.
     */
  }, {
    key: "distanceFrom",
    value: function distanceFrom(n) {
      return this.getNodeData(n, "distance");
    }

    /**
     * Get the distance to the current target from the given node index, in pixels.
     * @param {number} i - The node index to check.
     */
  }, {
    key: "distanceFromIndex",
    value: function distanceFromIndex(i) {
      return this.getNodeIndexData(i, "distance");
    }

    /**
     * Clear the target, reverting to tracking the pointer.
     */
  }, {
    key: "clearTarget",
    value: function clearTarget() {
      this.target = null;
    }

    /**
     * Return an object containing manual coordinates, if specified.
     */
  }, {
    key: "getCoords",
    value: function getCoords() {
      return _classPrivateFieldGet(_coords, this);
    }

    /**
     * Manually specify coordinates
     * @param {Number} x - 
     * @param {Number} y - 
     */
  }, {
    key: "setCoords",
    value: function setCoords(x, y) {
      if (!(typeof x === 'Number') || !(typeof y === 'Number')) {
        _classPrivateFieldSet(_coords, this, {
          x: x,
          y: y
        });
        //this.update();
      }
    }

    /**
     * Clear manual coordinates if specified, returning to target-based coordinates.
     */
  }, {
    key: "clearCoords",
    value: function clearCoords() {
      if (_classPrivateFieldGet(_coords, this)) {
        _classPrivateFieldSet(_coords, this, null);
      }
    }

    /**
     * Recalculate each node's centre point, including global offset and jitter.
     */
  }, {
    key: "setCenterPoints",
    value: function setCenterPoints() {
      for (var n = 0; n < this.nodes.length; n++) {
        var _node = this.nodes[n],
          cssTxt = _node.style.cssText;
        _node.style.cssText = this.getNodeIndexData(n, 'style');
        var bounds = _node.getBoundingClientRect(),
          x = (bounds.left + bounds.right) * 0.5 - this.offsetX,
          y = (bounds.top + bounds.bottom) * 0.5 - this.offsetY,
          jitter = this.getNodeIndexData(n, 'jitter');
        if (jitter) {
          x += jitter.x;
          y += jitter.y;
        }
        _node.style.cssText = cssTxt;
        _assertClassBrand(_ProximityEffect_brand, this, _setNodeIndexData).call(this, n, 'center', {
          x: x,
          y: y
        });
      }
    }

    /**
     * @typedef {Object} NodeData
     * @property {Element} node - A reference to the node.
     * @property {Array<Object>} styles - An array of applied styles containing near and far values for each.
     * @property {number} styles[].near - Did this work?.
     */
    /**
     * Return an object containing the given node's effect data or a specific property of that data.
     * @param {Element} n - The node to return data for.
     * @param {string} [prop] - The data property to return, leave out to return the entire object.
     * @return {mixed|NodeData} The chosen property value, or an object containing the node's data.
     */
  }, {
    key: "getNodeData",
    value: function getNodeData(n, prop) {
      var data = _classPrivateFieldGet(_nodeData, this)[this.nodes.findIndex(function (n) {
        return n === node;
      })];
      return prop ? data[prop] : data;
    }

    /**
     * Return an object containing the given node index"s effect data.
     * @param {number} i - The node index to return data for.
     * @param {string} prop - The data property to return.
     * @return {Object} An object containing the node's data.
     */
  }, {
    key: "getNodeIndexData",
    value: function getNodeIndexData(i, prop) {
      return _classPrivateFieldGet(_nodeData, this)[i][prop];
    }

    /**
     * Return a boolean determining if the given node has the given data.
     * @param {number} i - The node index to return data for.
     * @param {string} prop - The data property to return.
     * @return {boolean} True if the property exists, false otherwise.
     */
  }, {
    key: "hasNodeIndexData",
    value: function hasNodeIndexData(i, prop) {
      return _classPrivateFieldGet(_nodeData, this)[i].hasOwnProperty(prop);
    }
  }, {
    key: "updatePointer",
    value:
    ////////////////////
    //                //
    //     EVENTS     //
    //                //
    ////////////////////

    function updatePointer(evt) {
      _classPrivateFieldGet(_pointer, this).x = evt.clientX;
      _classPrivateFieldGet(_pointer, this).y = evt.clientY;
    }
  }, {
    key: "reflowEvent",
    value: function reflowEvent(evt) {
      var _this3 = this;
      if (evt.currentTarget !== this) {
        this.dispatchEvent(new Event("reflow"));
      }

      // TODO: is this a hack? or the best way to do it?
      if (!this.preventCenterCalculations) {
        window.setTimeout(function () {
          return _this3.setCenterPoints();
        }, 1);
      }
    }
  }, {
    key: "update",
    value: function update(timestamp) {
      var view = document.documentElement;
      for (var n = 0; n < this.nodes.length; n++) {
        var _node2 = this.nodes[n],
          bounds = _node2.getBoundingClientRect(),
          center = this.getNodeIndexData(n, "center");
        var centerX = center.x - (_node2.dataset["offsetx"] || 0),
          centerY = center.y - (_node2.dataset["offsety"] || 0);
        var tx = void 0,
          ty = void 0,
          last = this.getNodeIndexData(n, "lastDelta");
        if (_classPrivateFieldGet(_coords, this)) {
          var m = this.getCoords();
          tx = m.x;
          ty = m.y;
        } else if (this.target) {
          var b = this.target.getBoundingClientRect();
          tx = (b.left + b.right) * 0.5;
          ty = (b.top + b.bottom) * 0.5;
        } else {
          tx = this.pointer.x;
          ty = this.pointer.y;
        }
        var dx = tx - centerX,
          dy = ty - centerY,
          dd = void 0,
          td = void 0,
          d = void 0;

        // calculate distance
        if (this.direction === "both") {
          dd = AdashaUtils.pythagoras(dx, dy);
        } else {
          dd = Math.abs(this.direction === "horizontal" ? dx : dy);
        }

        // normalise to boundaries
        td = AdashaUtils.constrain((dd - this.threshold) * _classPrivateFieldGet(_globalParams, this).invRunoff, 0, 1);
        if (this.invert) {
          td = 1 - td;
        }
        _assertClassBrand(_ProximityEffect_brand, this, _setNodeIndexData).call(this, n, "distance", td);

        // apply easing
        d = last + (td - last) * (AdashaUtils.XOR(td > last, this.invert) ? this.decay : this.attack);

        // round value to reduce jitter
        d = AdashaUtils.roundTo(d, this.accuracy);
        _assertClassBrand(_ProximityEffect_brand, this, _setNodeIndexData).call(this, n, "lastDelta", d);
        if (this.styles.length > 0) {
          var styles = {};
          for (var f = 0; f < this.styles.length; f++) {
            var style = this.styles[f],
              nodeVals = this.getNodeIndexData(n, "styles")[f];
            var near = nodeVals.near,
              far = nodeVals.far,
              rule = style.rules.rule,
              func = style.rules.func,
              unit = style.rules.unit || "",
              val = AdashaUtils.delta(d, near, far);
            if (!func) {
              _node2.style[rule] = "".concat(val).concat(unit);
            } else {
              if (!styles[rule]) {
                styles[rule] = [];
              }
              styles[rule].push(func + "(" + val + unit + ")");
            }
          }
          for (var _rule in styles) {
            _node2.style[_rule] = styles[_rule].join(" ");
          }
          var ix = Math.floor(d * 1000);
          _node2.style.zIndex = this.invert ? ix : 1000 - ix;
        }
      }
      if (!this.FPS && !_classPrivateFieldGet(_coords, this)) {
        _assertClassBrand(_ProximityEffect_brand, this, _refresh).call(this);
      }
    } // update end
  }]);
}(/*#__PURE__*/_wrapNativeSuper(EventTarget));
function _init() {
  this.preventCenterCalculations = false;
  this.setCenterPoints();
  this.update = this.update.bind(this);
  window.addEventListener('scroll', this.reflowEvent.bind(this));
  window.addEventListener('resize', this.reflowEvent.bind(this));
  document.addEventListener('mousemove', this.updatePointer.bind(this));
  document.dispatchEvent(new MouseEvent('mousemove'));
  this.dispatchEvent(new Event('ready'));
  this.FPS = _classPrivateFieldGet(_globalParams, this).FPS;
  window.requestAnimationFrame(this.update);
}
function _setNodeIndexData(n, prop, val) {
  if (!_classPrivateFieldGet(_nodeData, this)[n]) {
    _classPrivateFieldGet(_nodeData, this)[n] = {};
  }
  _classPrivateFieldGet(_nodeData, this)[n][prop] = val;
  return _classPrivateFieldGet(_nodeData, this)[n];
}
function _calculateJitters() {
  var method = this.jitterMethod ? this.jitterMethod : _classPrivateFieldGet(_DEFAULT_JITTER_METHOD, this);
  for (var i = 0; i < this.nodes.length; i++) {
    _assertClassBrand(_ProximityEffect_brand, this, _setNodeIndexData).call(this, i, 'jitter', {
      x: AdashaUtils.random(this.jitter + this.jitterX, method),
      y: AdashaUtils.random(this.jitter + this.jitterY, method)
    });
  }
  if (!this.preventCenterCalculations) {
    this.setCenterPoints();
  }
}
function _runFrames() {
  var ms = Math.round(1000 / this.FPS);
  _classPrivateFieldSet(_fpsTimerRef, this, window.setInterval(this.update, ms));
}
function _refresh() {
  window.requestAnimationFrame(this.update);
  this.dispatchEvent(new Event("redraw"));
}