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
   attack: 1, // 0-1
   decay: 1, // 0-1
   threshold: 0, // 
   runoff: 100 //
}

let myFader = new MouseFader(target, params);
myFader.addEffect('opacity', 1, 0.5); // effect, near val, far val
...
```
