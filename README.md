# ProximityEffect.js


Bulk modify CSS properties on elements based on mouse pointer or other arbitrary element proximity. Does not override existing style sheets.

<del>Fairly widely compatible but</del> effects are dependent on browser support. ***NOTE: current version requires capability to extend built-in objects - this knocks out Edge and Firefox before v59 until backwards compatibility is given more thought***

[View live demos](http://lab.adasha.com/proximity-effect)

## Installation

Just a .js file - no Bower or npm or repositories (yet). Download your version of choice and embed in your HTML:
```html
<script src="ProximityEffect.min.js"></script>
```

## To use


### Add some content to affect
In your `<body>` content add some elements you want to affect:
```html
<div>
   <div class="foo">...</div>
   <div class="foo">...</div>
   <div class="foo">...</div>
   ...
</div>
```

### Set-up
Remaining set-up should be done after content has loaded. Store a reference to the chosen target:
```javascript
let elements = document.querySelectorAll("*.foo"); // requires NodeList at present
```

Then define parameters in an object:
```javascript
let params = {
   attack: 1, // [0<=n>=1] rate of change when approaching, 1=full speed 0=no movement
   decay: 1, // [0<=n>=1] rate of change when receding, 1=full speed 0=no movement
   threshold: 0, // [n>=0] minimum distance (from element's mathematical centre) before effect starts
   runoff: 100 // [n>=0] distance over which styles are interpolated
   direction: 'both'; // 'both' | 'horizontal' | 'vertical'
   mode: 'redraw'; // redraw=every animation frame; ~~mousemove=have a guess; enterframe=follow FPS~~
   FPS: 30; // [n>0] 'enterframe' mode only, up to refresh rate
}
```
These parameters can also be accessed as properties on the ProximityEffect instance.

Finally add effects as you see fit:

```javascript
let myEffect = new ProximityEffect(elements, params);
myEffect.addEffect('opacity', 1,  0.5); // effect, near val, far val
myEffect.addEffect('scale',   1,  2);   // effect, near val, far val
myEffect.addEffect('blur',    0, 10);   // effect, near val, far val
...
```

(Full details on the API are forthcoming, for now there is only an unfinished [page on the wiki](https://github.com/Adasha/proximity-effect/wiki/API-reference))


## License:

This software is provided under the Mozilla Public License 2.0. You can freely use the code in your own projects, using any license, without limitation, but if you modify the code base those changes must be pushed back under the same MPL2 license. Any copyright/credits must be left intact.
