'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _extendableBuiltin(cls) {
    function ExtendableBuiltin() {
        var instance = Reflect.construct(cls, Array.from(arguments));
        Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
        return instance;
    }

    ExtendableBuiltin.prototype = Object.create(cls.prototype, {
        constructor: {
            value: cls,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });

    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(ExtendableBuiltin, cls);
    } else {
        ExtendableBuiltin.__proto__ = cls;
    }

    return ExtendableBuiltin;
}

/*
 * ProximityEffect class by Adasha
 * Licensed under MPL-2.0
 * Repository: https://github.com/Adasha/proximity-effect
 * Demos: http://lab.adasha.com/proximity-effect
 */

var VALID_MODES = new Set(['mousemove', 'enterframe', 'redraw']),
    VALID_DIRECTIONS = new Set(['both', 'horizontal', 'vertical']),
    DEFAULT_DIRECTION = 'both',
    DEFAULT_MODE = 'redraw',
    DEFAULT_ACCURACY = 5,
    DEFAULT_FPS = 15,
    DEFAULT_RUNOFF = 100,
    VALID_EFFECTS = {
    opacity: { min: 0, max: 1, default: 1, rule: 'opacity' },
    translateX: { default: 0, rule: 'transform', func: 'translateX', unit: 'px' },
    translateY: { default: 0, rule: 'transform', func: 'translateY', unit: 'px' },
    translateZ: { default: 0, rule: 'transform', func: 'translateZ', unit: 'px' },
    rotate: { default: 0, rule: 'transform', func: 'rotate', unit: 'deg' },
    rotateX: { default: 0, rule: 'transform', func: 'rotateX', unit: 'deg' },
    rotateY: { default: 0, rule: 'transform', func: 'rotateY', unit: 'deg' },
    rotateZ: { default: 0, rule: 'transform', func: 'rotateZ', unit: 'deg' },
    scale: { default: 1, rule: 'transform', func: 'scale' },
    scaleX: { default: 1, rule: 'transform', func: 'scaleX' },
    scaleY: { default: 1, rule: 'transform', func: 'scaleY' },
    scaleZ: { default: 1, rule: 'transform', func: 'scaleZ' },
    skewX: { default: 0, rule: 'transform', func: 'skewX', unit: 'deg' },
    skewY: { default: 0, rule: 'transform', func: 'skewY', unit: 'deg' },
    //perspective:     {                  default:       0, rule: 'transform',       func: 'perspective', unit: 'px'},
    blur: { min: 0, default: 0, rule: 'filter', func: 'blur', unit: 'px' },
    brightness: { min: 0, default: 100, rule: 'filter', func: 'brightness', unit: '%' },
    contrast: { min: 0, default: 100, rule: 'filter', func: 'contrast', unit: '%' },
    grayscale: { min: 0, max: 100, default: 0, rule: 'filter', func: 'grayscale', unit: '%' },
    hueRotate: { default: 0, rule: 'filter', func: 'hue-rotate', unit: 'deg' },
    invert: { min: 0, max: 100, default: 0, rule: 'filter', func: 'invert', unit: '%' },
    //opacity:         {min: 0, max: 100, default:     100, rule: 'filter',          func: 'opacity',     unit: '%'},
    saturate: { min: 0, max: 100, default: 100, rule: 'filter', func: 'saturate', unit: '%' },
    sepia: { min: 0, max: 100, default: 0, rule: 'filter', func: 'sepia', unit: '%' },

    backgroundColor: { min: 0, max: 255, default: [0, 0, 0], rule: 'backgroundColor', func: 'rgb', args: 3 },
    scale3D: { default: [1, 1, 1], rule: 'transform', func: 'scale3D', args: 3 }
};

var constrain = function constrain(num, min, max) {
    if (typeof num !== 'number') return NaN;
    if (min !== undefined && min !== null && typeof min === 'number') num = Math.max(num, min);
    if (max !== undefined && max !== null && typeof max === 'number') num = Math.min(num, max);
    return num;
};

var roundTo = function roundTo(num) {
    var dp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

    var mult = Math.pow(dp + 1, 10);
    return Math.round(num * mult) / mult;
};

var delta = function delta(num, a, b) {
    return (b - a) * constrain(num, 0, 1) + a;
};

var map = function map(num, inMin, inMax, outMin, outMax) {
    return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
};

var XOR = function XOR(a, b) {
    return (a || b) && !(a && b);
};

var isVisibleInViewport = function isVisibleInViewport(el) {
    var bounds = el.getBoundingClientRect(),
        view = document.documentElement;
    return bounds.right >= 0 && bounds.left <= view.clientWidth && bounds.bottom >= 0 && bounds.top <= view.clientHeight;
};

//const startTimer = (delay) =>

var valToObj = function valToObj(val) {
    var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'value';

    var obj = {};
    obj[key] = val;
    return obj;
};

var isObject = function isObject(obj) {
    return obj == Object(obj);
};

/**
 * Class representing a ProximityEffect.
 * @extends EventTarget
 */

var ProximityEffect = function (_extendableBuiltin2) {
    _inherits(ProximityEffect, _extendableBuiltin2);

    // TODO: Private variables once possible.

    /**
     * Create a ProximityEffect instance.
     * @param {NodeList} nodes - A list of nodes to control.
     * @param {Object} [params={}] - An object containing effect parameters.
     * @param {number} [params.threshold=0] - The effect threshold, in pixels.
     * @param {number} [params.runoff] - The effect runoff, in pixels.
     * @param {number} [params.attack=1] - The effect attack.
     * @param {number} [params.decay=1] - The effect decay.
     * @param {number} [params.accuracy] - The effect accuracy.
     * @param {boolean} [params.invert=false] - Invert distance.
     * @param {number} [params.offsetX=0] - The global horizontal offset, in pixels.
     * @param {number} [params.offsetY=0] - The global vertical offset, in pixels.
     * @param {number} [params.jitter=0] - The effect jitter, in pixels.
     * @param {string} [params.direction] - The effect direction.
     * @param {Element} [params.target] - The effect tracker target.
     */
    function ProximityEffect(nodes) {
        var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, ProximityEffect);

        var _this = _possibleConstructorReturn(this, (ProximityEffect.__proto__ || Object.getPrototypeOf(ProximityEffect)).call(this));

        if (!nodes) throw new Error('ProximityEffect: nodes argument is required');

        _this.preventCenterCalculations = true;

        _this.nodes = nodes;
        _this._params = params;
        _this._pointer = {};

        _this.threshold = _this._params.hasOwnProperty('threshold') ? _this._params.threshold : 0;
        _this.runoff = _this._params.hasOwnProperty('runoff') ? _this._params.runoff : DEFAULT_RUNOFF;
        _this.attack = _this._params.hasOwnProperty('attack') ? _this._params.attack : 1;
        _this.decay = _this._params.hasOwnProperty('decay') ? _this._params.decay : 1;
        _this.accuracy = _this._params.hasOwnProperty('accuracy') ? _this._params.accuracy : DEFAULT_ACCURACY;
        //this.reverse   = this._params.reverse   || false;
        _this.invert = _this._params.invert || false;
        _this.offsetX = _this._params.offsetX || 0;
        _this.offsetY = _this._params.offsetY || 0;
        _this.jitter = _this._params.jitter || 0;
        _this.direction = _this._params.direction || DEFAULT_DIRECTION;
        _this.FPS = _this._params.FPS || DEFAULT_FPS;
        _this.mode = _this._params.mode || DEFAULT_MODE;
        _this.target = _this._params.target;

        if (document.readyState === 'completed') _this.init();else window.addEventListener('load', function () {
            return _this.init();
        });
        return _this;
    }

    _createClass(ProximityEffect, [{
        key: 'init',
        value: function init() {
            this.preventCenterCalculations = false;
            this.setCenterPoints();

            this.update = this.update.bind(this);

            window.addEventListener('scroll', this.reflowEvent.bind(this));
            window.addEventListener('resize', this.reflowEvent.bind(this));

            document.addEventListener('mousemove', this.updatePointer.bind(this));

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

            document.dispatchEvent(new MouseEvent('mousemove'));
            this.dispatchEvent(new Event('ready'));
            window.requestAnimationFrame(this.update);
        }

        /////////////////////////////////
        //                             //
        //     GETTER/SETTER PROPS     //
        //                             //
        /////////////////////////////////


        /**
         * Get the current target
         * @return {Element|Falsy} The current target.
         */

    }, {
        key: 'addEffect',


        ////////////////////////////
        //                        //
        //     PUBLIC METHODS     //
        //                        //
        ////////////////////////////


        /**
         * Add a new effect to the effect stack.
         * @param {string} name - The effect name.
         * @param {number|Object} near - The effect value at the closest distance.
         * @param {number} near.value - The effect value at closest distance, as a property of near.
         * @param {number} [near.scatter] - The random distribution of the value at the closest distance.
         * @param {number|Object} far - The effect value at the furthest distance.
         * @param {number} far.value - The effect value at furthest distance, as a property of far.
         * @param {number} [far.scatter] - The random distribution of the value at the furthest distance.
         * @param {Object} [params] - An object containing additional effect parameters.
         * @param {string} params.rule - The CSS style rule to use.
         * @param {string} [params.func] - The CSS function of the given style rule.
         * @param {number} [params.min] - The minimum effect value.
         * @param {number} [params.max] - The maximum effect value.
         * @param {number} [params.default] - The default effect value.
         * @param {string} [params.unit] - The effect CSS unit.
         */
        value: function addEffect(name, near, far, params) {
            if (VALID_EFFECTS.hasOwnProperty(name)) {
                /** Effect already exists **/
                params = VALID_EFFECTS[name];
            } else if (params && isObject(params) && typeof params.rule === 'string') // TODO: do we need any deeper validation checks?
                {
                    /** Register custom effect **/
                    VALID_EFFECTS[name] = params;
                } else return void console.log(name + ' is not a valid effect type');

            if (typeof near === 'number') near = valToObj(constrain(near, params.min, params.max));
            if (typeof far === 'number') far = valToObj(constrain(far, params.min, params.max));

            this._effects = this._effects || [];
            this._effects.push({
                type: name,
                near: near,
                far: far,
                params: params
            });

            for (var i = 0; i < this._nodeData.length; i++) {
                var effects = this.getNodeIndexData(i, 'effects') || this._setNodeIndexData(i, 'effects', [])['effects'];
                effects.push({
                    near: near.scatter ? near.value + (Math.random() - 0.5) * near.scatter : near.value,
                    far: far.scatter ? far.value + (Math.random() - 0.5) * far.scatter : far.value
                });
            }
        }

        /**
         * Check if a named effect is already on the stack.
         * @param {string} name - The name of the effect to check for.
         * @return {boolean} True if the effect exists at least once.
         */

    }, {
        key: 'hasEffect',
        value: function hasEffect(name) {
            return this.effects.find(function (eff) {
                return eff['type'] === name;
            }) !== undefined;
        }

        /**
         * Remove all instances of an effect from the stack.
         * @param {string} name - The name of the effect to remove.
         */

    }, {
        key: 'removeEffect',
        value: function removeEffect(name) {
            if (this.hasEffect(name)) {
                for (var i = 0; i < this.effects.length; i++) {
                    var eff = this.effects[i];
                    if (eff['type'] === name) {
                        this.effects.splice(i, 1);
                    }
                }
            }
        }

        /**
         * Get the distance to the current target from the given node.
         * @param {Element} n - The node to check.
         */

    }, {
        key: 'distanceFrom',
        value: function distanceFrom(n) {
            return this.getNodeData(n, 'distance');
        }

        /**
         * Get the distance to the current target from the given node index.
         * @param {number} i - The node index to check.
         */

    }, {
        key: 'distanceFromIndex',
        value: function distanceFromIndex(i) {
            return this.getNodeIndexData(i, 'distance');
        }

        /**
         * Recalculate each node's centre point, including global offset and jitter.
         */

    }, {
        key: 'setCenterPoints',
        value: function setCenterPoints() {
            for (var n = 0; n < this.nodes.length; n++) {
                var _node = this.nodes[n],
                    cssTxt = _node.style.cssText;

                _node.style.cssText = this.getNodeIndexData(n, 'style');

                var bounds = _node.getBoundingClientRect(),
                    x = (bounds.left + bounds.right) * 0.5 - this.offsetX,
                    y = (bounds.top + bounds.bottom) * 0.5 - this.offsetY,
                    jitter = this.getNodeIndexData(n, 'jitter');

                if (jitter && this.jitter > 0) {
                    x += jitter.x;
                    y += jitter.y;
                }

                _node.style.cssText = cssTxt;
                this._setNodeIndexData(n, 'center', { x: x, y: y });
            }
        }

        /**
         * Return an object containing the given node's effect data.
         * @param {Element} n - The node to return data for.
         * @param {string} prop - The data property to return.
         * @return {Object} An object containing the node's data.
         */

    }, {
        key: 'getNodeData',
        value: function getNodeData(n, prop) {
            return this._nodeData[this.nodes.findIndex(function (n) {
                return n === node;
            })][prop];
        }

        /**
         * Return an object containing the given node index's effect data.
         * @param {number} i - The node index to return data for.
         * @param {string} prop - The data property to return.
         * @return {Object} An object containing the node's data.
         */

    }, {
        key: 'getNodeIndexData',
        value: function getNodeIndexData(i, prop) {
            return this._nodeData[i][prop];
        }

        ///////////////////////////////
        //                           //
        //     'PRIVATE' METHODS     //
        //                           //
        ///////////////////////////////


    }, {
        key: '_setNodeIndexData',
        value: function _setNodeIndexData(n, prop, val) {
            if (!this._nodeData[n]) this._nodeData[n] = {};
            this._nodeData[n][prop] = val;
            return this._nodeData[n];
        }

        ////////////////////
        //                //
        //     EVENTS     //
        //                //
        ////////////////////


    }, {
        key: 'updatePointer',
        value: function updatePointer(evt) {
            this._pointer.x = evt.clientX;
            this._pointer.y = evt.clientY;
        }
    }, {
        key: 'reflowEvent',
        value: function reflowEvent(evt) {
            var _this2 = this;

            if (evt.currentTarget !== this) this.dispatchEvent(new Event('reflow'));

            // TODO: is this a hack? or the best way to do it?
            if (!this.preventCenterCalculations) window.setTimeout(function () {
                return _this2.setCenterPoints();
            }, 1);
        }
    }, {
        key: 'update',
        value: function update(timestamp) {
            var view = document.documentElement;

            for (var n = 0; n < this.nodes.length; n++) {
                var _node2 = this.nodes[n],
                    last = this.getNodeIndexData(n, 'lastDelta'),
                    bounds = _node2.getBoundingClientRect(),
                    center = this.getNodeIndexData(n, 'center');

                var centerX = center.x - (_node2.dataset['offsetx'] || 0),
                    centerY = center.y - (_node2.dataset['offsety'] || 0);

                var tx = void 0,
                    ty = void 0;

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
                    d = void 0;

                if (this.direction === 'both') dd = Math.sqrt(dx * dx + dy * dy);else dd = Math.abs(this.direction === 'horizontal' ? dx : dy);

                td = constrain((dd - this.threshold) * this._invRunoff, 0, 1);
                if (this.invert) td = 1 - td;

                this._setNodeIndexData(n, 'distance', td);

                if (last) d = last + (td - last) * (XOR(td > last, this.invert) ? this.decay : this.attack);else d = td;

                d = roundTo(d, this.accuracy);
                this._setNodeIndexData(n, 'lastDelta', d);

                if (this.effects.length > 0) {
                    var styles = {};

                    for (var f = 0; f < this._effects.length; f++) {
                        var effect = this._effects[f],
                            nodeVals = this.getNodeIndexData(n, 'effects')[f];

                        var near = nodeVals.near,
                            far = nodeVals.far,
                            rule = effect.params.rule,
                            func = effect.params.func,
                            unit = effect.params.unit || '',
                            val = delta(d, near, far);

                        if (!func) {
                            _node2.style[rule] = '' + val + unit;
                        } else {
                            if (!styles[rule]) styles[rule] = [];
                            styles[rule].push(func + '(' + val + unit + ')');
                        }
                    }
                    for (var _rule in styles) {
                        _node2.style[_rule] = styles[_rule].join(' ');
                    }
                    var ix = Math.floor(d * 1000);
                    _node2.style.zIndex = this.invert ? ix : 1000 - ix;
                }
            }

            if (this.mode === 'redraw') window.requestAnimationFrame(this.update);

            this.dispatchEvent(new Event('redraw'));
        } // update end

    }, {
        key: 'target',
        get: function get() {
            return this._params.target;
        }

        /**
         * Set the current target
         * @param {Element|Falsy} target - A reference to a DOM Element, or falsy to target mouse.
         */
        ,
        set: function set(target) {
            if (!target || target.getBoundingClientRect()) this._params.target = target;else return void console.log(target + ' is not a valid target');
        }

        /**
         * Get the list of nodes.
         * @return {Array<Element>} The node array.
         */

    }, {
        key: 'nodes',
        get: function get() {
            return this._nodes;
        }

        /**
         * Set the list of nodes.
         * @param {NodeList<Element>} list - The list of nodes.
         */
        ,
        set: function set(list) {
            if (!(list instanceof NodeList)) throw new Error(list + ' is not a node list');
            if (list.length < 1) throw new Error('No nodes found in ' + list);

            this._nodes = [].slice.call(list);
            this._nodeData = this._nodes.map(function (i) {
                return { node: i, style: i.style.cssText };
            });

            if (this._params && !this.preventCenterCalculations) this.setCenterPoints();
        }

        /**
         * Get the list of effects.
         * @return {Array<Object>} The effects array.
         */

    }, {
        key: 'effects',
        get: function get() {
            return this._effects;
        }

        /**
         * Get the effect threshold.
         * @return {number} The threshold radius, in pixels.
         */

    }, {
        key: 'threshold',
        get: function get() {
            return this._params.threshold;
        }

        /**
         * Set the effect threshold.
         * @param {number} value - The new threshold radius, in pixels.
         */
        ,
        set: function set(value) {
            this._params.threshold = constrain(value, 0);
        }

        /**
         * Get the effect runoff.
         * @return {number} The runoff radius, in pixels.
         */

    }, {
        key: 'runoff',
        get: function get() {
            return this._params.runoff;
        }

        /**
         * Set the effect runoff.
         * @param {number} value - The new runoff radius, in pixels.
         */
        ,
        set: function set(value) {
            this._params.runoff = constrain(value, 0);
            this._invRunoff = 1 / this._params.runoff;
        }

        /**
         * Get the effect boundary.
         * @return {number} The boundary radius, in pixels.
         */

    }, {
        key: 'boundary',
        get: function get() {
            return this.threshold + this.runoff;
        }

        /**
         * Get the invert state.
         * @return {boolean} The invert value.
         */

    }, {
        key: 'invert',
        get: function get() {
            return this._params.invert;
        }

        /**
         * Set the invert state.
         * @param {boolean} flag - The new invert value.
         */
        ,
        set: function set(flag) {
            this._params.invert = !!flag;
        }

        /**
         * Get the effect attack.
         * @return {number} The attack value.
         */

    }, {
        key: 'attack',
        get: function get() {
            return this._params.attack;
        }

        /**
         * Set the effect attack.
         * @param {number} value - The new attack value.
         */
        ,
        set: function set(value) {
            this._params.attack = constrain(value, 0, 1);
        }

        /**
         * Get the effect decay.
         * @return {number} The decay value.
         */

    }, {
        key: 'decay',
        get: function get() {
            return this._params.decay;
        }

        /**
         * Set the effect decay.
         * @param {number} value - The new decay value.
         */
        ,
        set: function set(value) {
            this._params.decay = constrain(value, 0, 1);
        }

        /**
         * Get the global horizontal offset.
         * @return {number} The offset value, in pixels.
         */

    }, {
        key: 'offsetX',
        get: function get() {
            return this._params.offsetX;
        }

        /**
         * Get the global vertical offset.
         * @return {number} The offset value, in pixels.
         */
        ,


        /**
         * Set the global horizontal offset.
         * @param {number} value - The new offset value, in pixels.
         */
        set: function set(value) {
            this._params.offsetX = value;
            if (!this.preventCenterCalculations) this.setCenterPoints();
        }

        /**
         * Set the global vertical offset, in pixels.
         * @param {number} value - The new offset value.
         */

    }, {
        key: 'offsetY',
        get: function get() {
            return this._params.offsetY;
        },
        set: function set(value) {
            this._params.offsetY = value;
            if (!this.preventCenterCalculations) this.setCenterPoints();
        }

        /**
         * Get the jitter value.
         * @return {number} The jitter value, in pixels.
         */

    }, {
        key: 'jitter',
        get: function get() {
            return this._params.jitter;
        }

        /**
         * Set the jitter value.
         * @param {number} num - The new jitter value, in pixels.
         */
        ,
        set: function set(num) {
            this._params.jitter = constrain(num, 0);
            for (var i = 0; i < this.nodes.length; i++) {
                this._setNodeIndexData(i, 'jitter', {
                    x: (Math.random() - 0.5) * this.jitter,
                    y: (Math.random() - 0.5) * this.jitter
                });
            }
            if (!this.preventCenterCalculations) this.setCenterPoints();
        }

        /**
         * Get the effect direction.
         * @return {string} The direction value.
         */

    }, {
        key: 'direction',
        get: function get() {
            return this._params.direction;
        }

        /**
         * Set the effect direction.
         * @param {string} str - The new direction value, both|horizontal|vertical.
         */
        ,
        set: function set(str) {
            if (VALID_DIRECTIONS.has(str)) {
                this._params.direction = str;
            } else return void console.log(str + ' not a valid direction.');
        }

        // FPS [Number>0]

    }, {
        key: 'FPS',
        get: function get() {
            return this._params.FPS;
        },
        set: function set(num) {
            if (num > 0) {
                this._params.FPS = constrain(num, 0);
            } else return void console.log('Invalid FPS requested');
        }

        // MODE [String]

    }, {
        key: 'mode',
        get: function get() {
            return this._params.mode;
        },
        set: function set(str) {
            if (str !== this._params.mode) {
                if (VALID_MODES.has(str)) {
                    this._params.mode = str;
                } else return void console.log(str + ' not a recognised mode.');
            } else return void console.log('Already in ' + str + ' mode. Mode not changed.');
        }

        /**
         * Get the effect accuracy.
         * @return {number} The accuracy value.
         */

    }, {
        key: 'accuracy',
        get: function get() {
            return this._params.accuracy;
        }

        /**
         * Set the effect accuracy.
         * @param {number} num - The new accuracy value.
         */
        ,
        set: function set(num) {
            this._params.accuracy = Math.floor(constrain(num, 0));
        }

        /**
         * Get the last known mouse pointer coordinates, relative to the viewport, in pixels.
         * @return {Object} An object containing x and y properties.
         */

    }, {
        key: 'pointer',
        get: function get() {
            return {
                x: this._pointer.x,
                y: this._pointer.y
            };
        }
    }]);

    return ProximityEffect;
}(_extendableBuiltin(EventTarget));