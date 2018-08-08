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
    ProximityEfect class by Adasha
    Licensed under MPL-2.0
    Repository: https://github.com/Adasha/proximity-effect
    Demos: http://lab.adasha.com/proximity-effect
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
    //perspective: {                  default:   0, rule: 'transform', func: 'perspective', unit: 'px'},
    blur: { min: 0, default: 0, rule: 'filter', func: 'blur', unit: 'px' },
    brightness: { min: 0, default: 100, rule: 'filter', func: 'brightness', unit: '%' },
    contrast: { min: 0, default: 100, rule: 'filter', func: 'contrast', unit: '%' },
    grayscale: { min: 0, max: 100, default: 0, rule: 'filter', func: 'grayscale', unit: '%' },
    hueRotate: { default: 0, rule: 'filter', func: 'hue-rotate', unit: 'deg' },
    invert: { min: 0, max: 100, default: 0, rule: 'filter', func: 'invert', unit: '%' },
    //opacity:     {min: 0, max: 100, default: 100, rule: 'filter',    func: 'opacity',     unit: '%'},
    saturate: { min: 0, max: 100, default: 100, rule: 'filter', func: 'saturate', unit: '%' },
    sepia: { min: 0, max: 100, default: 0, rule: 'filter', func: 'sepia', unit: '%' }
};

var _target = void 0,
    _nodes = void 0,
    _centers = void 0,
    _params = void 0,
    _effects = void 0,
    _pointer = {},
    _lastDeltas = void 0,
    _frameLoop = void 0,
    _invRunoff = void 0;

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


var ProximityEffect = function (_extendableBuiltin2) {
    _inherits(ProximityEffect, _extendableBuiltin2);

    function ProximityEffect(nodes) {
        var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, ProximityEffect);

        var _this = _possibleConstructorReturn(this, (ProximityEffect.__proto__ || Object.getPrototypeOf(ProximityEffect)).call(this));

        if (!nodes) {
            var _ret;

            console.log('ProximityEffect: nodes argument is required');
            return _ret = null, _possibleConstructorReturn(_this, _ret);
        }

        _this.preventCenterCalculations = true;

        _this.nodes = nodes;
        _params = params;

        _this.threshold = _params.hasOwnProperty('threshold') ? _params.threshold : 0;
        _this.runoff = _params.hasOwnProperty('runoff') ? _params.runoff : DEFAULT_RUNOFF;
        _this.attack = _params.hasOwnProperty('attack') ? _params.attack : 1;
        _this.decay = _params.hasOwnProperty('decay') ? _params.decay : 1;
        _this.accuracy = _params.hasOwnProperty('accuracy') ? _params.accuracy : DEFAULT_ACCURACY;
        _this.reverse = _params.reverse || false;
        _this.invert = _params.invert || false;
        _this.offsetX = _params.offsetX || 0;
        _this.offsetY = _params.offsetY || 0;
        _this.jitter = _params.jitter || 0;
        _this.direction = _params.direction || DEFAULT_DIRECTION;
        _this.FPS = _params.FPS || DEFAULT_FPS;
        _this.mode = _params.mode || DEFAULT_MODE;

        _this.preventCenterCalculations = false;
        _this.setCenterPoints();

        _this.update = _this.update.bind(_this);
        _this.init();
        return _this;
    }

    /////////////////////////
    // GETTER/SETTER PROPS //
    /////////////////////////


    // TARGET

    _createClass(ProximityEffect, [{
        key: 'addEffect',


        /////////////////
        // API METHODS //
        /////////////////


        value: function addEffect(str, near, far) {
            var template = void 0;

            if ((arguments.length <= 3 ? 0 : arguments.length - 3) > 0) {
                template = { rule: arguments.length <= 3 ? undefined : arguments[3], func: arguments.length <= 4 ? undefined : arguments[4], unit: arguments.length <= 5 ? undefined : arguments[5] };
            } else if (VALID_EFFECTS.hasOwnProperty(str)) {
                template = VALID_EFFECTS[str];
            } else {
                console.log(str + ' is not a supported effect type');
                return;
            }

            _effects = _effects || [];
            _effects.push({
                type: str,
                near: constrain(near, template.min, template.max),
                far: far !== undefined && far !== null ? constrain(far, template.min, template.max) : near,
                rule: template.rule,
                func: template.func,
                unit: template.unit
            });
        }

        // TODO: implement full API

    }, {
        key: 'hasEffect',
        value: function hasEffect(str) {
            //return _effects.find(str)!==undefined;
        }
    }, {
        key: 'effect',
        value: function effect(str) {
            //return _effects[str];
        }
    }, {
        key: 'removeEffect',
        value: function removeEffect(str) {
            // if(this.hasEffect(str))
            // {
            //     delete _effects[str];
            // }
        }
    }, {
        key: 'distanceFrom',
        value: function distanceFrom(node) {
            return this.nodes[node].dataset['distance'];
        }

        ////////////
        // SET-UP //
        ////////////


    }, {
        key: 'init',
        value: function init() {
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
    }, {
        key: 'setCenterPoints',
        value: function setCenterPoints() {
            _centers = [];
            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i],
                    bounds = node.getBoundingClientRect(),
                    x = (bounds.left + bounds.right) * 0.5 - this.offsetX - (node.dataset['jitterx'] || 0),
                    y = (bounds.top + bounds.bottom) * 0.5 - this.offsetY - (node.dataset['jittery'] || 0);

                if (this.jitter > 0) {
                    x += (Math.random() - 0.5) * this.jitter;
                    y += (Math.random() - 0.5) * this.jitter;
                }

                _centers.push({ x: x, y: y });
            }
        }

        ////////////
        // EVENTS //
        ////////////


    }, {
        key: 'updatePointer',
        value: function updatePointer(evt) {
            _pointer.x = evt.clientX;
            _pointer.y = evt.clientY;
        }
    }, {
        key: 'windowEvent',
        value: function windowEvent(evt) {
            var _this2 = this;

            // TODO: is this a hack? or the best way to do it?
            if (!this.preventCenterCalculations) window.setTimeout(function () {
                return _this2.setCenterPoints();
            }, 1);
        }
    }, {
        key: 'update',
        value: function update(timestamp) {
            var view = document.documentElement;

            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i],
                    last = _lastDeltas[i],
                    bounds = node.getBoundingClientRect();

                // TODO: optimise to update only visible elements
                // WORKAROUND FOR ISSUE #10
                //if(isVisibleInViewport(node) || last<1)
                if (true) {
                    var centerX = _centers[i].x - (node.dataset['offsetx'] || 0),
                        centerY = _centers[i].y - (node.dataset['offsety'] || 0);

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

                    td = constrain((dd - this.threshold) * _invRunoff, 0, 1);
                    if (this.invert) td = 1 - td;

                    if (last) {
                        d = last + (td - last) * (XOR(td > last, this.invert) ? this.decay : this.attack);
                    } else d = td;

                    node.dataset['distance'] = d;

                    d = roundTo(d, this.accuracy);

                    if (d <= 1 && _effects) {
                        var styles = {};

                        for (var _i = 0; _i < _effects.length; _i++) {
                            var effect = _effects[_i],
                                type = effect.type,
                                near = effect.near,
                                far = effect.far,
                                rule = effect.rule,
                                func = effect.func,
                                unit = effect.unit || '',
                                val = delta(d, near, far);

                            if (!func) {
                                node.style[rule] = '' + val + unit;
                            } else {
                                if (!styles[rule]) styles[rule] = [];
                                styles[rule].push(func + '(' + val + unit + ')');
                            }
                        }
                        for (var _rule in styles) {
                            node.style[_rule] = styles[_rule].join(' ');
                        }
                        node.style.zIndex = 1000 - Math.floor(d * 1000);
                    }

                    _lastDeltas[i] = d;
                }
            }

            if (this.mode === 'redraw') window.requestAnimationFrame(this.update);

            this.dispatchEvent(new Event('redraw'));
        } // update end

    }, {
        key: 'target',
        get: function get() {
            return _target;
        },
        set: function set(t) {
            if (typeof t === 'Element') _target = t;else console.log(t + ' is not a valid target');
        }

        // NODES

    }, {
        key: 'nodes',
        get: function get() {
            return _nodes;
        },
        set: function set(n) {
            var nodes = void 0;

            if (n instanceof NodeList) {
                console.log('NodeList with ' + n.length + ' childNodes found');
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
            else {
                    console.log(n + ' is not a node list');
                    return;
                }

            if (nodes.length < 1) {
                console.log('No nodes found in ' + n);
                return;
            }

            _nodes = nodes;
            if (_params && !this.preventCenterCalculations) this.setCenterPoints();
            _lastDeltas = new Array(this.nodes.length);
        }

        // THRESHOLD [Number>=0]

    }, {
        key: 'threshold',
        get: function get() {
            return _params.threshold;
        },
        set: function set(num) {
            _params.threshold = constrain(num, 0);
        }

        // RUNOFF [Number>=0]

    }, {
        key: 'runoff',
        get: function get() {
            return _params.runoff;
        },
        set: function set(num) {
            _params.runoff = constrain(num, 0);
            _invRunoff = 1 / _params.runoff;
        }

        // BOUNDARY [READ-ONLY Number]

    }, {
        key: 'boundary',
        get: function get() {
            return this.threshold + this.runoff;
        }

        // REVERSE [Boolean]

    }, {
        key: 'reverse',
        get: function get() {
            return _params.reverse;
        },
        set: function set(bool) {
            _params.reverse = !!bool;
        }

        // INVERT [Boolean]

    }, {
        key: 'invert',
        get: function get() {
            return _params.invert;
        },
        set: function set(bool) {
            _params.invert = !!bool;
        }

        // ATTACK [0>=Number>=1]

    }, {
        key: 'attack',
        get: function get() {
            return _params.attack;
        },
        set: function set(num) {
            _params.attack = constrain(num, 0, 1);
        }

        // DECAY [0>=Number>=1]

    }, {
        key: 'decay',
        get: function get() {
            return _params.decay;
        },
        set: function set(num) {
            _params.decay = constrain(num, 0, 1);
        }

        // OFFSET [Number]

    }, {
        key: 'offsetX',
        get: function get() {
            return _params.offsetX;
        },
        set: function set(num) {
            _params.offsetX = num;
            if (!this.preventCenterCalculations) this.setCenterPoints();
        }
    }, {
        key: 'offsetY',
        get: function get() {
            return _params.offsetY;
        },
        set: function set(num) {
            _params.offsetY = num;
            if (!this.preventCenterCalculations) this.setCenterPoints();
        }

        // JITTER [Number>=0]

    }, {
        key: 'jitter',
        get: function get() {
            return _params.jitter;
        },
        set: function set(num) {
            _params.jitter = constrain(num, 0);
            if (!this.preventCenterCalculations) this.setCenterPoints();
        }

        // DIRECTION [String]

    }, {
        key: 'direction',
        get: function get() {
            return _params.direction;
        },
        set: function set(str) {
            if (VALID_DIRECTIONS.has(str)) {
                _params.direction = str;
            } else console.log(str + ' not a valid direction.');
        }

        // FPS [Number>0]

    }, {
        key: 'FPS',
        get: function get() {
            return _params.FPS;
        },
        set: function set(num) {
            if (num > 0) {
                _params.FPS = constrain(num, 0);
            } else console.log('Invalid FPS requested');
        }

        // MODE [String]

    }, {
        key: 'mode',
        get: function get() {
            return _params.mode;
        },
        set: function set(str) {
            if (str !== _params.mode) {
                if (VALID_MODES.has(str)) {
                    _params.mode = str;
                } else console.log(str + ' not a recognised mode.');
            } else console.log('Already in ' + str + ' mode. Mode not changed.');
        }

        // ACCURACY [Number>=0]

    }, {
        key: 'accuracy',
        get: function get() {
            return _params.accuracy;
        },
        set: function set(num) {
            _params.accuracy = Math.floor(constrain(num, 0));
        }

        // POINTER
        // Convenience property, provides mouse coordinates without requiring MouseEvent

    }, {
        key: 'pointer',
        get: function get() {
            return {
                x: _pointer.x,
                y: _pointer.y
            };
        }
    }]);

    return ProximityEffect;
}(_extendableBuiltin(EventTarget));