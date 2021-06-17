"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _classPrivateMethodGet(receiver, privateSet, fn) { if (!privateSet.has(receiver)) { throw new TypeError("attempted to get private field on non-instance"); } return fn; }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

var _VALID_DIRECTIONS = /*#__PURE__*/new WeakMap();

var _DEFAULT_DIRECTION = /*#__PURE__*/new WeakMap();

var _DEFAULT_ACCURACY = /*#__PURE__*/new WeakMap();

var _DEFAULT_FPS = /*#__PURE__*/new WeakMap();

var _DEFAULT_RUNOFF = /*#__PURE__*/new WeakMap();

var _VALID_RANDOM_METHODS = /*#__PURE__*/new WeakMap();

var _DEFAULT_SCATTER_METHOD = /*#__PURE__*/new WeakMap();

var _DEFAULT_JITTER_METHOD = /*#__PURE__*/new WeakMap();

var _DEFAULT_MODE = /*#__PURE__*/new WeakMap();

var _VALID_EFFECTS = /*#__PURE__*/new WeakMap();

var _globalParams = /*#__PURE__*/new WeakMap();

var _pointer = /*#__PURE__*/new WeakMap();

var _effects = /*#__PURE__*/new WeakMap();

var _nodes = /*#__PURE__*/new WeakMap();

var _nodeData = /*#__PURE__*/new WeakMap();

var _init = /*#__PURE__*/new WeakSet();

var _setNodeIndexData = /*#__PURE__*/new WeakSet();

var _calculateJitters = /*#__PURE__*/new WeakSet();

/*
 * ProximityEffect class by Adasha
 * Licensed under MPL-2.0
 * Repository: https://github.com/Adasha/proximity-effect
 * Demos: http://lab.adasha.com/proximity-effect
 */

/**
 * Class representing a ProximityEffect.
 * @version 3.0.0-alpha2
 * @author Adam Shailer <adasha76@outlook.com>
 * @class
 * @extends EventTarget
 * @fires ProximityEffect#ready
 * @fires ProximityEffect#redraw
 * @fires ProximityEffect#reflow
 */
var ProximityEffect = /*#__PURE__*/function (_EventTarget) {
  _inherits(ProximityEffect, _EventTarget);

  var _super = _createSuper(ProximityEffect);

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
   * @param {Element} [params.target] - The effect tracker target.
   * @param {boolean} [params.doPresetDistances=false] - Prime the initial distances to create an initial transition. Only available through params argument in constructor.
   */
  function ProximityEffect(nodes) {
    var _this;

    var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, ProximityEffect);

    _this = _super.call(this);

    _calculateJitters.add(_assertThisInitialized(_this));

    _setNodeIndexData.add(_assertThisInitialized(_this));

    _init.add(_assertThisInitialized(_this));

    _VALID_DIRECTIONS.set(_assertThisInitialized(_this), {
      writable: true,
      value: new Set(["both", "horizontal", "vertical"])
    });

    _DEFAULT_DIRECTION.set(_assertThisInitialized(_this), {
      writable: true,
      value: "both"
    });

    _DEFAULT_ACCURACY.set(_assertThisInitialized(_this), {
      writable: true,
      value: 5
    });

    _DEFAULT_FPS.set(_assertThisInitialized(_this), {
      writable: true,
      value: 15
    });

    _DEFAULT_RUNOFF.set(_assertThisInitialized(_this), {
      writable: true,
      value: 100
    });

    _VALID_RANDOM_METHODS.set(_assertThisInitialized(_this), {
      writable: true,
      value: new Set(["normal", "uniform"])
    });

    _DEFAULT_SCATTER_METHOD.set(_assertThisInitialized(_this), {
      writable: true,
      value: "uniform"
    });

    _DEFAULT_JITTER_METHOD.set(_assertThisInitialized(_this), {
      writable: true,
      value: "uniform"
    });

    _DEFAULT_MODE.set(_assertThisInitialized(_this), {
      writable: true,
      value: "redraw"
    });

    _VALID_EFFECTS.set(_assertThisInitialized(_this), {
      writable: true,
      value: {
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
      }
    });

    _globalParams.set(_assertThisInitialized(_this), {
      writable: true,
      value: void 0
    });

    _pointer.set(_assertThisInitialized(_this), {
      writable: true,
      value: {}
    });

    _effects.set(_assertThisInitialized(_this), {
      writable: true,
      value: void 0
    });

    _nodes.set(_assertThisInitialized(_this), {
      writable: true,
      value: void 0
    });

    _nodeData.set(_assertThisInitialized(_this), {
      writable: true,
      value: void 0
    });

    if (!nodes) {
      throw new Error("ProximityEffect: nodes argument is required");
    } // turn off centre calculations during setup to avoid calling repeatedly:


    _this.preventCenterCalculations = true;

    _classPrivateFieldSet(_assertThisInitialized(_this), _globalParams, params);

    _this.nodes = nodes; // default global parameter values:

    _this.threshold = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).hasOwnProperty("threshold") ? _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).threshold : 0;
    _this.runoff = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).hasOwnProperty("runoff") ? _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).runoff : _classPrivateFieldGet(_assertThisInitialized(_this), _DEFAULT_RUNOFF);
    _this.attack = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).hasOwnProperty("attack") ? _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).attack : 1;
    _this.decay = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).hasOwnProperty("decay") ? _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).decay : 1;
    _this.accuracy = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).hasOwnProperty("accuracy") ? _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).accuracy : _classPrivateFieldGet(_assertThisInitialized(_this), _DEFAULT_ACCURACY); //this.reverse   = this.#globalParams.reverse   || false;

    _this.invert = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).invert || false;
    _this.offsetX = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).offsetX || 0;
    _this.offsetY = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).offsetY || 0;
    _this.jitter = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).jitter || 0;
    _this.jitterX = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).jitterX || 0;
    _this.jitterY = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).jitterY || 0;
    _this.direction = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).direction || _classPrivateFieldGet(_assertThisInitialized(_this), _DEFAULT_DIRECTION);
    _this.FPS = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).FPS || _classPrivateFieldGet(_assertThisInitialized(_this), _DEFAULT_FPS);
    _this.mode = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).mode || _classPrivateFieldGet(_assertThisInitialized(_this), _DEFAULT_MODE);
    _this.target = _classPrivateFieldGet(_assertThisInitialized(_this), _globalParams).target;

    if (document.readyState === "completed") {
      _classPrivateMethodGet(_assertThisInitialized(_this), _init, _init2).call(_assertThisInitialized(_this));
    } else {
      window.addEventListener("load", function () {
        return _classPrivateMethodGet(_assertThisInitialized(_this), _init, _init2).call(_assertThisInitialized(_this));
      });
    }

    return _this;
  } /////////////////////////////////
  //                             //
  //     GETTER/SETTER PROPS     //
  //                             //
  /////////////////////////////////

  /**
   * Get the current target
   * @return {Element|Falsy} The current target.
   */


  _createClass(ProximityEffect, [{
    key: "target",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).target;
    }
    /**
     * Set the current target
     * @param {Element|Falsy} target - A reference to a DOM Element, or falsy to target mouse.
     */
    ,
    set: function set(target) {
      if (!target || target.getBoundingClientRect()) {
        _classPrivateFieldGet(this, _globalParams).target = target;
      } else {
        return void console.log("".concat(target, " is not a valid target"));
      }
    }
    /**
     * Get the list of nodes.
     * @return {Array<Element>} The node array.
     */

  }, {
    key: "nodes",
    get: function get() {
      return _classPrivateFieldGet(this, _nodes);
    }
    /**
     * Set the list of nodes.
     * @param {NodeList<Element>} list - The list of nodes.
     */
    ,
    set: function set(list) {
      var _this2 = this;

      if (!(list instanceof NodeList)) {
        throw new Error("".concat(list, " is not a node list"));
      }

      if (list.length < 1) {
        throw new Error("No nodes found in ".concat(list));
      }

      _classPrivateFieldSet(this, _nodes, [].slice.call(list)); //convert to array


      _classPrivateFieldSet(this, _nodeData, _classPrivateFieldGet(this, _nodes).map(function (i) {
        return {
          node: i,
          style: i.style.cssText,
          lastDelta: _classPrivateFieldGet(_this2, _globalParams).doPresetDistances ? 1 : null
        };
      }));

      if (_classPrivateFieldGet(this, _globalParams) && !this.preventCenterCalculations) {
        this.setCenterPoints();
      }
    }
    /**
     * Get the list of effects.
     * @return {Array<Object>} The effects array.
     */

  }, {
    key: "effects",
    get: function get() {
      return _classPrivateFieldGet(this, _effects);
    }
    /**
     * Get the effect threshold.
     * @return {number} The threshold radius, in pixels.
     */

  }, {
    key: "threshold",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).threshold;
    }
    /**
     * Set the effect threshold.
     * @param {number} value - The new threshold radius, in pixels.
     */
    ,
    set: function set(value) {
      _classPrivateFieldGet(this, _globalParams).threshold = Utils.constrain(value, 0);
    }
    /**
     * Get the effect runoff.
     * @return {number} The runoff radius, in pixels.
     */

  }, {
    key: "runoff",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).runoff;
    }
    /**
     * Set the effect runoff.
     * @param {number} value - The new runoff radius, in pixels.
     */
    ,
    set: function set(value) {
      _classPrivateFieldGet(this, _globalParams).runoff = Utils.constrain(value, 0);
      _classPrivateFieldGet(this, _globalParams).invRunoff = 1 / _classPrivateFieldGet(this, _globalParams).runoff;
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
      return _classPrivateFieldGet(this, _globalParams).invert;
    }
    /**
     * Set the invert state.
     * @param {boolean} flag - The new invert value.
     */
    ,
    set: function set(flag) {
      _classPrivateFieldGet(this, _globalParams).invert = !!flag;
    }
    /**
     * Get the effect attack.
     * @return {number} The attack value.
     */

  }, {
    key: "attack",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).attack;
    }
    /**
     * Set the effect attack.
     * @param {number} value - The new attack value.
     */
    ,
    set: function set(value) {
      _classPrivateFieldGet(this, _globalParams).attack = Utils.constrain(value, 0, 1);
    }
    /**
     * Get the effect decay.
     * @return {number} The decay value.
     */

  }, {
    key: "decay",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).decay;
    }
    /**
     * Set the effect decay.
     * @param {number} value - The new decay value.
     */
    ,
    set: function set(value) {
      _classPrivateFieldGet(this, _globalParams).decay = Utils.constrain(value, 0, 1);
    }
    /**
     * Get the global horizontal offset.
     * @return {number} The offset value, in pixels.
     */

  }, {
    key: "offsetX",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).offsetX;
    }
    /**
     * Get the global vertical offset.
     * @return {number} The offset value, in pixels.
     */
    ,
    set:
    /**
     * Set the global horizontal offset.
     * @param {number} value - The new offset value, in pixels.
     */
    function set(value) {
      _classPrivateFieldGet(this, _globalParams).offsetX = value;

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
      return _classPrivateFieldGet(this, _globalParams).offsetY;
    },
    set: function set(value) {
      _classPrivateFieldGet(this, _globalParams).offsetY = value;

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
      return _classPrivateFieldGet(this, _globalParams).jitter;
    }
    /**
     * Get the jitterX value.
     * @return {number} The jitterX value, in pixels.
     */
    ,
    set:
    /**
     * Set the jitter value.
     * @param {number} num - The new jitter value, in pixels.
     */
    function set(num) {
      _classPrivateFieldGet(this, _globalParams).jitter = Utils.constrain(num, 0);

      _classPrivateMethodGet(this, _calculateJitters, _calculateJitters2).call(this);
    }
    /**
     * Set the jitterX value.
     * @param {number} num - The new jitterX value, in pixels.
     */

  }, {
    key: "jitterX",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).jitterX;
    }
    /**
     * Get the jitterY value.
     * @return {number} The jitterY value, in pixels.
     */
    ,
    set: function set(num) {
      _classPrivateFieldGet(this, _globalParams).jitterX = Utils.constrain(num, 0);

      _classPrivateMethodGet(this, _calculateJitters, _calculateJitters2).call(this);
    }
    /**
     * Set the jitterY value.
     * @param {number} num - The new jitterY value, in pixels.
     */

  }, {
    key: "jitterY",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).jitterY;
    },
    set: function set(num) {
      _classPrivateFieldGet(this, _globalParams).jitterY = Utils.constrain(num, 0);

      _classPrivateMethodGet(this, _calculateJitters, _calculateJitters2).call(this);
    }
    /**
     * Get the jitter method.
     * @returns {string} The random jitter method.
     */

  }, {
    key: "jitterMethod",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).jitterMethod;
    }
    /**
     * Set the jitter method.
     * @params {string} method - The random string method to use.
     */
    ,
    set: function set(method) {
      _classPrivateFieldGet(this, _globalParams).jitterMethod = method;

      _classPrivateMethodGet(this, _calculateJitters, _calculateJitters2).call(this);
    }
    /**
     * Get the effect direction.
     * @return {string} The direction value.
     */

  }, {
    key: "direction",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).direction;
    }
    /**
     * Set the effect direction.
     * @param {string} str - The new direction value, both|horizontal|vertical.
     */
    ,
    set: function set(str) {
      if (_classPrivateFieldGet(this, _VALID_DIRECTIONS).has(str)) {
        _classPrivateFieldGet(this, _globalParams).direction = str;
      } else {
        return void console.log("".concat(str, " not a valid direction."));
      }
    } // FPS [Number>0]

  }, {
    key: "FPS",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).FPS;
    },
    set: function set(num) {
      if (num > 0) {
        _classPrivateFieldGet(this, _globalParams).FPS = Utils.constrain(num, 0);
      } else {
        return void console.log("Invalid FPS requested.");
      }
    } // MODE [String]

  }, {
    key: "mode",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).mode;
    },
    set: function set(mode) {
      if (mode) {
        if (mode === _classPrivateFieldGet(this, _globalParams).mode) {
          return void console.log("Already in ".concat(mode, " mode. Mode not changed."));
        }

        var b = document.body; // b.removeEventListener("mousemove",  this.update());
        // b.removeEventListener("enterframe", this.update());
        // window.clearInterval(this._frameLoop);

        switch (mode) {
          case "mousemove":
            b.addEventListener("mousemove", this.update());
            break;

          case "enterframe":
            b.addEventListener("enterframe", this.update());
            this._frameLoop = window.setInterval(function () {
              return b.dispatchEvent(new Event("enterframe"));
            }, 1000 / this.FPS);
            break;

          case "redraw":
            break;

          default:
            return void console.log("".concat(mode, " is not a recognised mode."));
        }

        _classPrivateFieldGet(this, _globalParams).mode = mode;
      }
    }
    /**
     * Get the effect accuracy.
     * @return {number} The accuracy value.
     */

  }, {
    key: "accuracy",
    get: function get() {
      return _classPrivateFieldGet(this, _globalParams).accuracy;
    }
    /**
     * Set the effect accuracy.
     * @param {number} num - The new accuracy value.
     */
    ,
    set: function set(num) {
      _classPrivateFieldGet(this, _globalParams).accuracy = Math.floor(Utils.constrain(num, 0));
    }
    /**
     * Get the last known mouse pointer coordinates, relative to the viewport, in pixels.
     * @return {Object} An object containing x and y properties.
     */

  }, {
    key: "pointer",
    get: function get() {
      return {
        x: _classPrivateFieldGet(this, _pointer).x,
        y: _classPrivateFieldGet(this, _pointer).y
      };
    } ////////////////////////////
    //                        //
    //     PUBLIC METHODS     //
    //                        //
    ////////////////////////////

    /**
     * Add a new effect to the effect stack.
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
     * @param {string} [params.id] - A unique string to identify the effect.
     * @param {number} [params.threshold] - The effect threshold for this effect, overriding the global value.
     * @param {number} [params.runoff] - The effect runoff for this effect, overriding the global value.
     * @param {Boolean} [params.invert] - XXXXX, overriding the global value.
     * @param {number} [params.attack] - , overriding the global value.
     * @param {number} [params.decay] - , overriding the global value.
     */

  }, {
    key: "addEffect",
    value: function addEffect(property, values, effectParams) {
      var cssParams; // if specifying a preset effect

      if (typeof property === "string") {
        if (_classPrivateFieldGet(this, _VALID_EFFECTS).hasOwnProperty(property)) {
          cssParams = _classPrivateFieldGet(this, _VALID_EFFECTS)[property];
        } else {
          throw new Error("ProximityEffect: Couldn't find preset '".concat(property, "'"));
        }
      } else if (Utils.isObject(property) && typeof property.rule === "string") {
        cssParams = property;
      } else return void console.log("'".concat(property, "' is not a valid style rule.")); // // convenience function for adding basic near/far values like the old version


      if (values.length === 2) {
        for (var v = 0; v < values.length; v++) {
          var val = values[v];

          if (typeof val === "number") {
            values[v] = Utils.valToObj(Utils.constrain(val, cssParams.min, cssParams.max));
          }
        }

        var _near = values[0];
        var _far = values[1];
      } else {
        console.log('length must be 2 for now'); // TODO: implement complex transitions
      }

      _classPrivateFieldSet(this, _effects, _classPrivateFieldGet(this, _effects) || []);

      _classPrivateFieldGet(this, _effects).push({
        rules: cssParams,
        near: near,
        far: far,
        params: effectParams
      });

      for (var i = 0; i < _classPrivateFieldGet(this, _nodeData).length; i++) {
        var effects = this.getNodeIndexData(i, "effects") || _classPrivateMethodGet(this, _setNodeIndexData, _setNodeIndexData2).call(this, i, "effects", [])["effects"];

        var nearMethod = near.scatterMethod ? near.scatterMethod : _classPrivateFieldGet(this, _DEFAULT_SCATTER_METHOD),
            farMethod = far.scatterMethod ? far.scatterMethod : _classPrivateFieldGet(this, _DEFAULT_SCATTER_METHOD);
        effects.push({
          near: near.scatter ? near.value + Utils.random(near.scatter, nearMethod) : near.value,
          far: far.scatter ? far.value + Utils.random(far.scatter, farMethod) : far.value
        });
      }
    }
    /**
     * Check if a named effect is already on the stack.
     * @param {string} name - The name of the effect to check for.
     * @return {boolean} True if the effect exists at least once.
     */

  }, {
    key: "hasEffect",
    value: function hasEffect(name) {
      return this.effects.find(function (eff) {
        return eff["type"] === name;
      }) !== undefined;
    }
    /**
     * Remove all instances of an effect from the stack.
     * @param {string} name - The name of the effect to remove.
     */

  }, {
    key: "removeEffect",
    value: function removeEffect(name) {
      if (this.hasEffect(name)) {
        for (var i = 0; i < _classPrivateFieldGet(this, _effects).length; i++) {
          var eff = _classPrivateFieldGet(this, _effects)[i];

          if (eff["type"] === name) {
            _classPrivateFieldGet(this, _effects).splice(i, 1);
          }
        }
      }
    }
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
     * Clear the target
     */

  }, {
    key: "clearTarget",
    value: function clearTarget() {
      _classPrivateFieldGet(this, _globalParams).target = null;
    }
    /**
     * Recalculate each node"s centre point, including global offset and jitter.
     */

  }, {
    key: "setCenterPoints",
    value: function setCenterPoints() {
      for (var n = 0; n < this.nodes.length; n++) {
        var _node = this.nodes[n],
            cssTxt = _node.style.cssText;
        _node.style.cssText = this.getNodeIndexData(n, "style");

        var bounds = _node.getBoundingClientRect(),
            x = (bounds.left + bounds.right) * 0.5 - this.offsetX,
            y = (bounds.top + bounds.bottom) * 0.5 - this.offsetY,
            jitter = this.getNodeIndexData(n, "jitter");

        if (jitter) {
          x += jitter.x;
          y += jitter.y;
        }

        _node.style.cssText = cssTxt;

        _classPrivateMethodGet(this, _setNodeIndexData, _setNodeIndexData2).call(this, n, "center", {
          x: x,
          y: y
        });
      }
    }
    /**
     * @typedef {Object} NodeData
     * @property {Element} node - A reference to the node.
     * @property {Array<Object>} effects - An array of applied effects containing near and far values for each.
     * @property {number} effects[].near - Did this work?.
     */

    /**
     * Return an object containing the given node"s effect data or a specific property of that data.
     * @param {Element} n - The node to return data for.
     * @param {string} [prop] - The data property to return, leave out to return the entire object.
     * @return {mixed|NodeData} The chosen property value, or an object containing the node"s data.
     */

  }, {
    key: "getNodeData",
    value: function getNodeData(n, prop) {
      var data = _classPrivateFieldGet(this, _nodeData)[this.nodes.findIndex(function (n) {
        return n === node;
      })];

      return prop ? data[prop] : data;
    }
    /**
     * Return an object containing the given node index"s effect data.
     * @param {number} i - The node index to return data for.
     * @param {string} prop - The data property to return.
     * @return {Object} True if the property exists, false otherwise.
     */

  }, {
    key: "getNodeIndexData",
    value: function getNodeIndexData(i, prop) {
      return _classPrivateFieldGet(this, _nodeData)[i][prop];
    }
    /**
     * Return a boolean determining if the given node has thegiven data.
     * @param {number} i - The node index to return data for.
     * @param {string} prop - The data property to return.
     * @return {boolean} An object containing the node"s data.
     */

  }, {
    key: "hasNodeIndexData",
    value: function hasNodeIndexData(i, prop) {
      return _classPrivateFieldGet(this, _nodeData)[i].hasOwnProperty(prop);
    } ///////////////////////////////
    //                           //
    //      PRIVATE METHODS      //
    //                           //
    ///////////////////////////////

  }, {
    key: "updatePointer",
    value: ////////////////////
    //                //
    //     EVENTS     //
    //                //
    ////////////////////
    function updatePointer(evt) {
      _classPrivateFieldGet(this, _pointer).x = evt.clientX;
      _classPrivateFieldGet(this, _pointer).y = evt.clientY;
    }
  }, {
    key: "reflowEvent",
    value: function reflowEvent(evt) {
      var _this3 = this;

      if (evt.currentTarget !== this) {
        this.dispatchEvent(new Event("reflow"));
      } // TODO: is this a hack? or the best way to do it?


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

        if (this.target) {
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
            d = void 0; // calculate distance

        if (this.direction === "both") {
          dd = Utils.pythagoras(dx, dy);
        } else {
          dd = Math.abs(this.direction === "horizontal" ? dx : dy);
        } // normalise to boundaries


        td = Utils.constrain((dd - this.threshold) * _classPrivateFieldGet(this, _globalParams).invRunoff, 0, 1);

        if (this.invert) {
          td = 1 - td;
        }

        _classPrivateMethodGet(this, _setNodeIndexData, _setNodeIndexData2).call(this, n, "distance", td); // apply easing


        d = last + (td - last) * (Utils.XOR(td > last, this.invert) ? this.decay : this.attack); // round value to reduce jitter

        d = Utils.roundTo(d, this.accuracy);

        _classPrivateMethodGet(this, _setNodeIndexData, _setNodeIndexData2).call(this, n, "lastDelta", d);

        if (this.effects.length > 0) {
          var styles = {};

          for (var f = 0; f < this.effects.length; f++) {
            var effect = this.effects[f],
                nodeVals = this.getNodeIndexData(n, "effects")[f];
            var _near2 = nodeVals.near,
                _far2 = nodeVals.far,
                rule = effect.rules.rule,
                func = effect.rules.func,
                unit = effect.rules.unit || "",
                val = Utils.delta(d, _near2, _far2);

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

      if (this.mode === "redraw") {
        window.requestAnimationFrame(this.update);
      }

      this.dispatchEvent(new Event("redraw"));
    } // update end

  }]);

  return ProximityEffect;
}( /*#__PURE__*/_wrapNativeSuper(EventTarget));
/**
 * EffectInstance Class
 */


function _init2() {
  this.preventCenterCalculations = false;
  this.setCenterPoints();
  this.update = this.update.bind(this);
  window.addEventListener("scroll", this.reflowEvent.bind(this));
  window.addEventListener("resize", this.reflowEvent.bind(this));
  document.addEventListener("mousemove", this.updatePointer.bind(this)); // TODO: add alternative trigger modes

  document.dispatchEvent(new MouseEvent("mousemove"));
  this.dispatchEvent(new Event("ready"));
  window.requestAnimationFrame(this.update);
}

function _setNodeIndexData2(n, prop, val) {
  if (!_classPrivateFieldGet(this, _nodeData)[n]) {
    _classPrivateFieldGet(this, _nodeData)[n] = {};
  }

  _classPrivateFieldGet(this, _nodeData)[n][prop] = val;
  return _classPrivateFieldGet(this, _nodeData)[n];
}

function _calculateJitters2() {
  var method = this.jitterMethod ? this.jitterMethod : _classPrivateFieldGet(this, _DEFAULT_JITTER_METHOD);

  for (var i = 0; i < this.nodes.length; i++) {
    _classPrivateMethodGet(this, _setNodeIndexData, _setNodeIndexData2).call(this, i, "jitter", {
      x: Utils.random(this.jitter + this.jitterX, method),
      y: Utils.random(this.jitter + this.jitterY, method)
    });
  }

  if (!this.preventCenterCalculations) {
    this.setCenterPoints();
  }
}

var _VALID_EFFECTS2 = /*#__PURE__*/new WeakMap();

var _VALID_RANDOM_METHODS2 = /*#__PURE__*/new WeakMap();

var _DEFAULT_SCATTER_METHOD2 = /*#__PURE__*/new WeakMap();

var _name = /*#__PURE__*/new WeakMap();

var EffectInstance =
/**
 * 
 * @constructor
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
 * @param {string} [params.id] - A unique string to identify the effect.
 * @param {number} [params.threshold] - The effect threshold for this effect, overriding the global value.
 * @param {number} [params.runoff] - The effect runoff for this effect, overriding the global value.
 * @param {Boolean} [params.invert] - XXXXX, overriding the global value.
 * @param {number} [params.attack] - , overriding the global value.
 * @param {number} [params.decay] - , overriding the global value.
 */
function EffectInstance(property, values) {
  var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  _classCallCheck(this, EffectInstance);

  _VALID_EFFECTS2.set(this, {
    writable: true,
    value: {
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
    }
  });

  _VALID_RANDOM_METHODS2.set(this, {
    writable: true,
    value: new Set(["normal", "uniform"])
  });

  _DEFAULT_SCATTER_METHOD2.set(this, {
    writable: true,
    value: "uniform"
  });

  _name.set(this, {
    writable: true,
    value: void 0
  });

  var cssParams; // if specifying a preset effect

  if (typeof property === "string") {
    if (_classPrivateFieldGet(this, _VALID_EFFECTS2).hasOwnProperty(property)) {
      cssParams = _classPrivateFieldGet(this, _VALID_EFFECTS2)[property];
    } else {
      throw new Error("ProximityEffect: Couldn't find preset '".concat(property, "'"));
    }
  } else if (Utils.isObject(property) && typeof property.rule === "string") {
    cssParams = property;
  } else return void console.log("'".concat(property, "' is not a valid style rule."));
};
/*
 * Utilities Class
 */


var Utils = function Utils() {
  _classCallCheck(this, Utils);
};

_defineProperty(Utils, "constrain", function (num, min, max) {
  if (typeof num !== "number") {
    return NaN;
  }

  if (min !== undefined && min !== null && typeof min === "number") {
    num = Math.max(num, min);
  }

  if (max !== undefined && max !== null && typeof max === "number") {
    num = Math.min(num, max);
  }

  return num;
});

_defineProperty(Utils, "roundTo", function (num) {
  var dp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var mult = Math.pow(dp + 1, 10);
  return Math.round(num * mult) / mult;
});

_defineProperty(Utils, "delta", function (num, a, b) {
  return (b - a) * Utils.constrain(num, 0, 1) + a;
});

_defineProperty(Utils, "map", function (num, inMin, inMax, outMin, outMax) {
  return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
});

_defineProperty(Utils, "random", function () {
  var v = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 2;
  var m = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "uniform";

  switch (m) {
    // intentional fall-throughs
    case "gaussian":
    case "normal":
      var t = 0,
          c = 6;

      for (var i = 0; i < c; i++) {
        t += (Math.random() - 0.5) * v;
      }

      return t / c;
      break;

    case "uniform":
    default:
      return (Math.random() - 0.5) * v;
  }
});

_defineProperty(Utils, "XOR", function (a, b) {
  return (a || b) && !(a && b);
});

_defineProperty(Utils, "pythagoras", function (a, b) {
  return Math.sqrt(a * a + b * b);
});

_defineProperty(Utils, "isVisibleInViewport", function (el) {
  var bounds = el.getBoundingClientRect(),
      view = document.documentElement;
  return bounds.right >= 0 && bounds.left <= view.clientWidth && bounds.bottom >= 0 && bounds.top <= view.clientHeight;
});

_defineProperty(Utils, "valToObj", function (val) {
  var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "value";
  var obj = {};
  obj[key] = val;
  return obj;
});

_defineProperty(Utils, "isObject", function (obj) {
  return obj == Object(obj);
});