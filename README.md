# MouseFader.js


Modify CSS properties on children of target element based on mouse pointer proximity.
Port of an old Flash component, missing some features but gained others.

Early commit, there is not much here other than a basic test implementation. This shoddy repository is being worked on.

[View test implementation on adasha.com](http://www.adasha.com/lab/mousefader)

## To use:

### HTML:

```html
<div class="targetName">
   ... child elements ...
</div>
```

### JS:

```javascript
let target = document.querySelectorAll("*.targetName"); // requires NodeList at present

let params = {
   attack: 1, // [0>n>=1] rate of change when approaching, 1=full speed 0=no movement
   decay: 1, // [0>n>=1] rate of change when receding, 1=full speed 0=no movement
   threshold: 0, // [n>=0] minimum distance (from element's mathematical centre) before effect starts
   runoff: 100 // [n>=0] distance over which styles are interpolated
   mode: 'redraw'; // redraw=every animation frame; mousemove=have a guess; enterframe=follow FPS
   FPS: 30; // [n>0] 'enterframe' mode only, up to refresh rate
}

let myFader = new MouseFader(target, params);
myFader.addEffect('opacity', 1, 0.5); // effect, near val, far val
...
```
