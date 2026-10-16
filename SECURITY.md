# Security policy

## Supported versions

| Version | Supported           |
| ------- | ------------------- |
| 4.x     | Yes                 |
| < 4.0   | No. Please upgrade. |

## Reporting a vulnerability

Please don't open a public issue for a security problem. Instead, either:

- use GitHub's [private vulnerability reporting](https://github.com/Adasha/proximity-effect/security/advisories/new), or
- email <adasha76@outlook.com> with "proximity-effect security" in the subject.

Include the version, a minimal reproduction, and what an attacker could achieve. You should get a reply within a week. Once a fix is released, the advisory and the changelog will credit you, unless you'd rather not be named.

## Scope and design

ProximityEffect only writes inline styles to the elements you give it. It never creates markup, never sets `innerHTML`, and never touches attributes other than `style`.

Everything you pass in is configuration, and should come from your own code rather than from untrusted input. Even so, the library checks configuration before using it:

- A custom style's `rule` must be a CSS property name. `cssText`, `CSSStyleDeclaration` methods and other non-property members are rejected.
- A custom style's `func` must be a plain CSS function name. Functions that load resources or read values from elsewhere (`url()`, `image-set()`, `attr()`, `var()` and similar) are rejected.
- A custom style's `unit` must be a known CSS unit.
- Every value is a finite number, so each write is exactly one number, plus a unit, to one CSS property.
- Only an object's own properties are read, so a polluted `Object.prototype` can't add or change configuration.

The animation can still make content hard to read (for example, with low opacity or heavy blur). That is an accessibility concern rather than a security one.
