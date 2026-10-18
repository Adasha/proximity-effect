/*! wrap-chars v3.0.0 | LGPL-3.0 | https://github.com/Adasha/wrap-chars */

// src/WrapChars.js
var VOID_ELEMENTS = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
var DISALLOWED_TAGS = /* @__PURE__ */ new Set(["script", "style", "iframe", "object", "embed", "template", "textarea", "title", "noscript", "frame", "frameset"]);
var SKIP_DESCEND_TAGS = /* @__PURE__ */ new Set(["script", "style", "textarea", "noscript", "template"]);
var VALID_SPLIT_MODES = /* @__PURE__ */ new Set(["letter", "word"]);
var MARKER = "data-wrapchars";
var WHITESPACE_RUN = /[ \t\n\f\r]+/g;
var WHITESPACE_ONLY = /^[ \t\n\f\r]*$/;
var WORD_SPLIT = /( )/;
var PUNCTUATION = /^\p{P}+$/u;
var EDGE_PUNCTUATION = /^(\p{P}*)(.*?)(\p{P}*)$/su;
var HYPHEN = /^[-\u2010\u2011]$/;
var VISUALLY_HIDDEN = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: "0",
  border: "0",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  userSelect: "none",
  webkitUserSelect: "none"
};
var WrapChars = class _WrapChars {
  // Intl.Segmenter instances, created on first use and reused.
  static #segmenters = {};
  /**
   * wrap()
   * Wrap inline text characters/words with HTML elements.
   *
   * @param {Element} element - A reference to a DOM element.
   * @param {Object} [params={}] - An object containing key/value pairs used to configure the method.
   * @param {string} [params.split="letter"] - The method by which text will be divided. "letter"|"word".
   * @param {string} [params.tagName="span"] - The name of the element to wrap each character in, defaults to <span>.
   * @param {string} [params.className] - An optional class name to add to each element.
   * @param {boolean} [params.deep=true] - Whether to also wrap the text within nested elements. Default is true.
   * @param {boolean} [params.wrapSpaces=false] - If true, will wrap space characters, including spaceChar if specified.
   * @param {string} [params.skipClass] - If provided, will pass over any elements with that class.
   * @param {string} [params.spaceChar] - An optional string to replace inline spaces with. HTML entities are decoded; any markup is kept as literal text.
   * @param {boolean} [params.separatePunctuation=false] - Word mode only: split punctuation surrounding words into separate pieces.
   * @param {string} [params.punctuationClass] - Class for punctuation pieces when separatePunctuation is on. Defaults to className.
   * @param {boolean} [params.accessible=true] - Keep the text readable by screen readers: adds a visually hidden copy of each wrapped text node and hides the pieces with aria-hidden.
   * @throws {TypeError} If element is not an Element, or a removed option is used.
   * @throws {RangeError} If tagName or split is not permitted.
   * @method
   * @static
   */
  static wrap(element, params = {}) {
    if (!(element instanceof Element)) {
      throw new TypeError("WrapChars.wrap: element must be a DOM Element");
    }
    params ??= {};
    if (Object.hasOwn(params, "type")) {
      throw new TypeError(`WrapChars: the "type" option was removed in v3, use "split" instead`);
    }
    const split = params.split ?? "letter";
    if (!VALID_SPLIT_MODES.has(split)) {
      throw new RangeError(`WrapChars: invalid split mode "${split}", expected "letter" or "word"`);
    }
    const accessible = Boolean(params.accessible ?? true);
    const template = _WrapChars.#createTemplate(params.tagName, params.className);
    template.setAttribute(MARKER, "piece");
    if (accessible) template.setAttribute("aria-hidden", "true");
    let punctuationTemplate = template;
    if (params.punctuationClass) {
      punctuationTemplate = template.cloneNode(false);
      punctuationTemplate.className = String(params.punctuationClass);
    }
    const config = {
      split,
      template,
      punctuationTemplate,
      separatePunctuation: Boolean(params.separatePunctuation),
      accessible,
      spaceChar: _WrapChars.#sanitiseSpaceChar(params.spaceChar),
      deep: Boolean(params.deep ?? true),
      skipClass: params.skipClass,
      wrapSpaces: Boolean(params.wrapSpaces)
    };
    _WrapChars.#parseNode(element, config);
  }
  /**
   * unwrap()
   * Reverse wrap(): replace every element it created with plain text.
   * Whitespace stays collapsed as wrap() left it, and spaceChar reverts
   * to a normal space.
   *
   * @param {Element} element - The element previously passed to wrap(), or an ancestor.
   * @throws {TypeError} If element is not an Element.
   * @method
   * @static
   */
  static unwrap(element) {
    if (!(element instanceof Element)) {
      throw new TypeError("WrapChars.unwrap: element must be a DOM Element");
    }
    for (const el of element.querySelectorAll(`[${MARKER}]`)) {
      switch (el.getAttribute(MARKER)) {
        case "text":
          el.remove();
          break;
        case "space":
          el.replaceWith(" ");
          break;
        case "piece":
          el.replaceWith(el.textContent);
          break;
      }
    }
    element.normalize();
  }
  /**
   * #createTemplate()
   * Validate the wrapper tag and build an element to clone for each piece.
   *
   * @param {string} [tagName="span"]
   * @param {string} [className]
   * @returns {Element}
   */
  static #createTemplate(tagName, className) {
    const tag = String(tagName || "span").toLowerCase();
    if (VOID_ELEMENTS.has(tag) || DISALLOWED_TAGS.has(tag)) {
      throw new RangeError(`WrapChars: invalid tagName "${tag}"`);
    }
    let template;
    try {
      template = document.createElement(tag);
    } catch {
      throw new RangeError(`WrapChars: invalid tagName "${tag}"`);
    }
    if (className) template.className = String(className);
    return template;
  }
  /**
   * #sanitiseSpaceChar()
   * Decode HTML entities in the provided string. Markup is not parsed: the
   * textarea's RCDATA content model keeps any tags as literal text.
   *
   * @param {string} str
   * @returns {string|undefined}
   */
  static #sanitiseSpaceChar(str) {
    if (!str) return void 0;
    const e = document.createElement("textarea");
    e.innerHTML = String(str);
    return e.value;
  }
  /**
   * #parseNode()
   * Recursively traverse the node tree to isolate and wrap text nodes.
   *
   * @param {Node} node - The node to process.
   * @param {Object} config - Validated parameters.
   */
  static #parseNode(node, config) {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        if (node.hasAttribute(MARKER)) break;
        const tag = node.tagName.toLowerCase();
        if (SKIP_DESCEND_TAGS.has(tag)) break;
        if (config.skipClass && node.classList.contains(config.skipClass)) break;
        const children = node.childNodes;
        for (let i = children.length; i > 0; i--) {
          const child = children[i - 1];
          if (config.deep || child.nodeType === Node.TEXT_NODE) {
            _WrapChars.#parseNode(child, config);
          }
        }
        break;
      }
      case Node.TEXT_NODE: {
        if (WHITESPACE_ONLY.test(node.data)) break;
        const text = node.data.replace(WHITESPACE_RUN, " ");
        node.replaceWith(_WrapChars.#wrap(text, config));
        break;
      }
      default:
        break;
    }
  }
  /**
   * #wrap()
   * Private method for constructing output.
   *
   * @param {string} text - The text to wrap, with whitespace already collapsed to single spaces.
   * @param {Object} config
   * @returns {DocumentFragment} The wrapped content.
   */
  static #wrap(text, config) {
    const frag = document.createDocumentFragment();
    if (config.accessible) frag.appendChild(_WrapChars.#createHiddenCopy(text));
    for (const [part, isPunctuation] of _WrapChars.#pieces(text, config)) {
      const isSpace = part === " ";
      const content = isSpace && config.spaceChar ? config.spaceChar : part;
      if (isSpace && !config.wrapSpaces) {
        if (config.spaceChar) {
          const span = document.createElement("span");
          span.setAttribute(MARKER, "space");
          if (config.accessible) span.setAttribute("aria-hidden", "true");
          span.textContent = content;
          frag.appendChild(span);
        } else {
          frag.appendChild(document.createTextNode(content));
        }
        continue;
      }
      const template = isPunctuation ? config.punctuationTemplate : config.template;
      const el = template.cloneNode(false);
      if (isSpace) el.setAttribute(MARKER, "space");
      el.textContent = content;
      frag.appendChild(el);
    }
    return frag;
  }
  /**
   * #createHiddenCopy()
   * Build a visually hidden element containing text for screen readers.
   *
   * @param {string} text
   * @returns {HTMLSpanElement}
   */
  static #createHiddenCopy(text) {
    const el = document.createElement("span");
    el.setAttribute(MARKER, "text");
    Object.assign(el.style, VISUALLY_HIDDEN);
    el.textContent = text;
    return el;
  }
  /**
   * #pieces()
   * Divide text into the pieces to be wrapped, according to config.
   *
   * @param {string} text - Text with whitespace collapsed to single spaces.
   * @param {Object} config
   * @yields {[string, boolean]} Each non-empty piece, and whether it is separated punctuation.
   */
  static *#pieces(text, config) {
    if (config.split === "letter") {
      const segmenter = _WrapChars.#getSegmenter("grapheme");
      if (segmenter) {
        for (const { segment } of segmenter.segment(text)) yield [segment, false];
      } else {
        for (const char of text) yield [char, false];
      }
      return;
    }
    for (const chunk of text.split(WORD_SPLIT)) {
      if (!chunk.length) continue;
      if (chunk === " " || !config.separatePunctuation) {
        yield [chunk, false];
      } else {
        yield* _WrapChars.#splitPunctuation(chunk);
      }
    }
  }
  /**
   * #splitPunctuation()
   * Separate punctuation runs from a space-delimited word. Anything that
   * isn't punctuation (letters, symbols, emoji, &nbsp;) stays together.
   *
   * @param {string} word
   * @yields {[string, boolean]} Each non-empty piece, and whether it is punctuation.
   */
  static *#splitPunctuation(word) {
    const segmenter = _WrapChars.#getSegmenter("word");
    if (!segmenter) {
      const [, lead, core, trail] = word.match(EDGE_PUNCTUATION);
      if (lead) yield [lead, true];
      if (core) yield [core, false];
      if (trail) yield [trail, true];
      return;
    }
    const segments = [...segmenter.segment(word)];
    let text = "", punctuation = "";
    for (const [i, { segment, isWordLike }] of segments.entries()) {
      const isCompoundHyphen = HYPHEN.test(segment) && segments[i - 1]?.isWordLike && segments[i + 1]?.isWordLike;
      if (!isWordLike && !isCompoundHyphen && PUNCTUATION.test(segment)) {
        if (text) yield [text, false];
        text = "";
        punctuation += segment;
      } else {
        if (punctuation) yield [punctuation, true];
        punctuation = "";
        text += segment;
      }
    }
    if (text) yield [text, false];
    if (punctuation) yield [punctuation, true];
  }
  /**
   * #getSegmenter()
   * Get a shared Intl.Segmenter, or null where unsupported (Firefox < 125).
   *
   * @param {"grapheme"|"word"} granularity
   * @returns {Intl.Segmenter|null}
   */
  static #getSegmenter(granularity) {
    if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") return null;
    return _WrapChars.#segmenters[granularity] ??= new Intl.Segmenter(void 0, { granularity });
  }
};
var WrapChars_default = WrapChars;
export {
  WrapChars,
  WrapChars_default as default
};
