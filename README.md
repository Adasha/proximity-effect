# MouseFader.js


Modify CSS properties on children of target element based on mouse pointer proximity.
Port of an old Flash component, missing some features but gained others. 6Kb minified, no dependencies.

Note: ES6 browser needed for now - compatibility is currently an afterthought.


[View demos on adasha.com](http://www.adasha.com/lab/mousefader)

## To use

### Add MouseFader.js to page
Include the JS file in your HTML (either in `<head>` or at end of `<body>`:

```html
<script src="mousefader.min.js"></script>
```

### Add some content to affect
In your `<body>` content add some elements you want to affect:
```html
<div class="targetName">
   ... child elements ...
</div>
```

### Set-up
Store a reference to the chosen target:
```javascript
let target = document.querySelectorAll("*.targetName"); // requires NodeList at present
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
(Details on the API are forthcoming)

Finally add effects as you see fit:

```javascript```
let myFader = new MouseFader(target, params);
myFader.addEffect('opacity', 1, 0.5); // effect, near val, far val
...
```

## License:

This software is provided under the Mozilla Public License 2.0. You can freely use the code in your own projects, using any license, without limitation, but if you modify the code base those changes must be pushed back under the same MPL2 license. Any copyright/credits must be left intact.
