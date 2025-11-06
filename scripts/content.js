// Content Script - Injected into all pages
class DeskAgentContent {
  constructor() {
    this.isInjected = false;
    this.selectorEngine = typeof DeskAgentSelectorEngine !== 'undefined'
      ? new DeskAgentSelectorEngine()
      : null;

    // Clickable element configuration - will be loaded from settings
    this.clickableConfig = null;

    this.init();
  }

  async init() {
    console.log('DeskAgent content script loaded');

    // Load clickable element configuration
    await this.loadClickableConfig();

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Notify background that content script is ready
    chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).catch(() => {});
  }

  async loadClickableConfig() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};

      // Parse configuration or use defaults
      this.clickableConfig = {
        tags: this.parseConfigList(settings.clickableTags || 'a, button'),
        roles: this.parseConfigList(settings.clickableRoles || 'button, link, row, gridcell, listitem, option, menuitem'),
        dataAttrs: this.parseConfigList(settings.clickableDataAttrs || 'click, action, cell, row, item, chat'),
        classNames: this.parseConfigList(settings.clickableClassNames || 'click, link, button, action')
      };

      console.log('Loaded clickable config:', this.clickableConfig);
    } catch (error) {
      console.error('Error loading clickable config:', error);
      // Use defaults if loading fails
      this.clickableConfig = {
        tags: ['a', 'button'],
        roles: ['button', 'link', 'row', 'gridcell', 'listitem', 'option', 'menuitem'],
        dataAttrs: ['click', 'action', 'cell', 'row', 'item', 'chat'],
        classNames: ['click', 'link', 'button', 'action']
      };
    }
  }

  parseConfigList(configString) {
    return configString
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'INJECT_SCRIPT':
          await this.injectScript(message.code);
          sendResponse({ success: true });
          break;

        case 'GET_PAGE_INFO':
          const pageInfo = this.getPageInfo();
          sendResponse({ success: true, pageInfo });
          break;

        case 'HIGHLIGHT_ELEMENT':
          this.highlightElement(message.selector);
          sendResponse({ success: true });
          break;

        case 'EXECUTE_FUNCTION':
          const result = await this.executeFunction(message.functionName, message.args);
          sendResponse({ success: true, result });
          break;

        case 'FIND_ELEMENT':
          const element = await this.findElement(message.selectors);
          sendResponse({ success: true, element });
          break;

        case 'CHECK_ELEMENT_VISIBLE':
          const isVisible = await this.isElementVisible(message.selector);
          sendResponse({ success: true, visible: isVisible });
          break;

        case 'GET_ELEMENT_COORDINATES':
          const coords = await this.getElementCoordinates(message.selector);
          sendResponse({ success: true, coordinates: coords });
          break;

        case 'PRESS_KEY':
          const keyResult = await this.pressKey(message.selector, message.key);
          sendResponse({ success: true, result: keyResult });
          break;

        case 'CLICK_ELEMENT':
          const clickResult = await this.clickElement(message.selector, message.options);
          sendResponse({ success: true, result: clickResult });
          break;

        case 'TYPE_TEXT':
          const typeResult = await this.typeText(message.selector, message.text, message.options);
          sendResponse({ success: true, result: typeResult });
          break;

        case 'RELOAD_CLICKABLE_CONFIG':
          await this.loadClickableConfig();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async injectScript(code) {
    return new Promise((resolve, reject) => {
      try {
        // Create script element
        const script = document.createElement('script');
        script.textContent = code;
        script.type = 'text/javascript';

        // Inject into page
        (document.head || document.documentElement).appendChild(script);

        // Remove script element after execution
        script.remove();

        this.isInjected = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  getPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      readyState: document.readyState,
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  highlightElement(selector) {
    // Remove previous highlights
    document.querySelectorAll('.deskagent-highlight').forEach(el => {
      el.classList.remove('deskagent-highlight');
    });

    // Add highlight style if not present
    if (!document.getElementById('deskagent-highlight-style')) {
      const style = document.createElement('style');
      style.id = 'deskagent-highlight-style';
      style.textContent = `
        .deskagent-highlight {
          outline: 3px solid #4285f4 !important;
          outline-offset: 2px !important;
          background-color: rgba(66, 133, 244, 0.1) !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Highlight target element
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('deskagent-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Remove highlight after 3 seconds
      setTimeout(() => {
        element.classList.remove('deskagent-highlight');
      }, 3000);
    }
  }

  async executeFunction(functionName, args = []) {
    // Execute a function in page context
    const script = `
      (function() {
        if (typeof ${functionName} === 'function') {
          return ${functionName}(${args.map(arg => JSON.stringify(arg)).join(', ')});
        } else {
          throw new Error('Function ${functionName} not found');
        }
      })();
    `;

    return await this.injectScript(`
      window.__deskagent_result = ${script};
    `);
  }

  // Find element using multiple selectors
  async findElement(selectors) {
    const normalizedSelectors = this.normalizeSelectors(selectors);
    const attempts = [];

    const matches = [];

    for (const rawSelector of normalizedSelectors) {
      try {
        const resolved = this.resolveSelector(rawSelector);
        if (!resolved) {
          attempts.push({ selector: rawSelector, matched: false });
          continue;
        }

        const enriched = this.describeElement(resolved.element, {
          providedSelector: rawSelector,
          strategy: resolved.strategy,
          query: resolved.query
        });

        attempts.push({ selector: rawSelector, matched: true, metadata: enriched.metadata });

        if (enriched.metadata?.isUnique) {
          return { ...enriched, attempts };
        }

        matches.push(enriched);
      } catch (error) {
        console.warn(`Selector resolution failed for "${rawSelector}"`, error);
        attempts.push({ selector: rawSelector, matched: false, error: error.message });
      }
    }

    if (matches.length) {
      return { ...matches[0], attempts };
    }

    const heuristicMatch = this.fallbackHeuristics(normalizedSelectors);
    if (heuristicMatch) {
      const enriched = this.describeElement(heuristicMatch.element, {
        providedSelector: heuristicMatch.hint,
        strategy: heuristicMatch.strategy,
        query: heuristicMatch.query
      });
      attempts.push({ selector: heuristicMatch.hint, matched: true, heuristic: true, metadata: enriched.metadata });
      return { ...enriched, attempts };
    }

    return { exists: false, attempts };
  }

  normalizeSelectors(selectors) {
    if (!selectors) return [];
    if (!Array.isArray(selectors)) return [selectors].filter(Boolean);
    const flat = selectors.flat().filter(Boolean);
    return flat.map(sel => typeof sel === 'string' ? sel.trim() : sel)
      .filter(sel => typeof sel === 'string' && sel.length > 0);
  }

  resolveSelector(rawSelector) {
    const trimmed = rawSelector.trim();
    const { strategy, query } = this.parseSelector(trimmed);

    let element = null;
    switch (strategy) {
      case 'css':
        element = this.safeQuerySelector(query);
        break;
      case 'xpath':
        element = this.queryXPath(query);
        break;
      case 'aria':
        element = this.queryAria(query);
        break;
      case 'text':
        element = this.queryText(query);
        break;
      default:
        element = this.safeQuerySelector(query);
        break;
    }

    if (!element) return null;
    return { element, strategy, query };
  }

  parseSelector(selector) {
    const lower = selector.toLowerCase();

    if (lower.startsWith('css=')) {
      return { strategy: 'css', query: selector.slice(4) };
    }

    // Handle xpath formats: xpath=..., xpath/..., or //...
    if (lower.startsWith('xpath=')) {
      return { strategy: 'xpath', query: selector.slice(6) };
    }
    if (lower.startsWith('xpath/')) {
      return { strategy: 'xpath', query: selector.slice(6) };
    }
    if (selector.startsWith('//') || selector.startsWith('(')) {
      return { strategy: 'xpath', query: selector };
    }

    // Handle aria formats: aria/..., aria=...
    if (lower.startsWith('aria/') || lower.startsWith('aria=')) {
      const value = lower.startsWith('aria=') ? selector.slice(5) : selector.slice(5);
      return { strategy: 'aria', query: value };
    }

    // Handle text formats: text=..., text/...
    if (lower.startsWith('text=') || lower.startsWith('text/')) {
      const value = lower.startsWith('text=') ? selector.slice(5) : selector.slice(5);
      return { strategy: 'text', query: value };
    }

    // Handle pierce (shadow DOM piercing) - treat as regular CSS for now
    if (lower.startsWith('pierce/')) {
      return { strategy: 'css', query: selector.slice(7) };
    }

    return { strategy: 'css', query: selector };
  }

  cssEscape(value) {
    if (typeof value === 'undefined' || value === null) {
      return '';
    }
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(String(value));
    }
    return String(value).replace(/(["'\\])/g, '\\$1').replace(/\u0000/g, '\uFFFD');
  }

  safeQuerySelector(selector) {
    try {
      return document.querySelector(selector);
    } catch (error) {
      console.warn(`Invalid CSS selector: "${selector}"`, error);
      return null;
    }
  }

  queryXPath(xpath) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    } catch (error) {
      console.warn(`Invalid XPath selector: "${xpath}"`, error);
      return null;
    }
  }

  queryAria(label) {
    if (!label) return null;

    // Parse aria selector format: "Search[role="combobox"]" or just "Search"
    const match = label.match(/^(.+?)\[role="?([^"\]]+)"?\]$/);
    const ariaText = match ? match[1].trim() : label.trim();
    const requiredRole = match ? match[2].trim() : null;

    // Try exact match first
    let selector = `[aria-label="${this.cssEscape(ariaText)}"]`;
    if (requiredRole) {
      selector += `[role="${this.cssEscape(requiredRole)}"]`;
    }
    const exact = document.querySelector(selector);
    if (exact) return exact;

    // Fallback to fuzzy matching
    const candidates = Array.from(document.querySelectorAll('[aria-label], [aria-labelledby], [role]'));
    const labelLower = ariaText.toLowerCase();

    const found = candidates.find(el => {
      // Check role requirement first if specified
      if (requiredRole) {
        const role = el.getAttribute('role');
        if (!role || role.toLowerCase() !== requiredRole.toLowerCase()) {
          return false;
        }
      }

      // Check aria-label
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.toLowerCase() === labelLower) return true;
      if (ariaLabel && ariaLabel.toLowerCase().includes(labelLower)) return true;

      // Check aria-labelledby
      const ariaLabelledby = el.getAttribute('aria-labelledby');
      if (ariaLabelledby) {
        const labelNode = document.getElementById(ariaLabelledby);
        if (labelNode && labelNode.textContent && labelNode.textContent.toLowerCase().includes(labelLower)) {
          return true;
        }
      }

      // If no role required, also check role attribute itself
      if (!requiredRole) {
        const role = el.getAttribute('role');
        if (role && role.toLowerCase().includes(labelLower)) return true;
      }

      return false;
    });

    // If found element is not clickable itself, try to find clickable ancestor
    if (found) {
      const tagName = found.tagName ? found.tagName.toLowerCase() : '';
      // If it's already a link or button, return as-is
      if (tagName === 'a' || tagName === 'button' ||
          found.getAttribute('role') === 'button' ||
          found.getAttribute('role') === 'link') {
        return found;
      }
      // Otherwise, try to find clickable ancestor
      return this.findClickableAncestor(found) || found;
    }

    return null;
  }

  queryText(text) {
    if (!text) return null;
    const normalized = text.trim().toLowerCase();
    if (!normalized) return null;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.textContent ? node.textContent.trim().toLowerCase() : '';
      if (!value) continue;
      if (value.includes(normalized)) {
        // Find the nearest clickable ancestor instead of just parentElement
        return this.findClickableAncestor(node.parentElement) || node.parentElement;
      }
    }
    return null;
  }

  // Find the nearest clickable ancestor - now uses configurable rules
  findClickableAncestor(element) {
    if (!element) return null;

    let current = element;
    let depth = 0;
    const maxDepth = 15; // Increased from 10 to handle deeper DOM structures

    // Use default config if not loaded yet
    const config = this.clickableConfig || {
      tags: ['a', 'button'],
      roles: ['button', 'link', 'row', 'listitem', 'option', 'menuitem'],
      dataAttrs: ['click', 'action', 'cell', 'row', 'item', 'chat'],
      classNames: ['click', 'link', 'button', 'action']
    };

    console.log(`   🔍 Finding clickable ancestor for <${element.tagName}> (config loaded: ${!!this.clickableConfig})`);

    while (current && depth < maxDepth) {
      const tagName = current.tagName ? current.tagName.toLowerCase() : '';
      const role = current.getAttribute('role');

      console.log(`      Checking depth ${depth}: <${tagName.toUpperCase()}> role="${role || 'none'}"`);

      // Check if tag is in configured clickable tags
      if (config.tags.includes(tagName)) {
        console.log(`      ✓ Matched tag: ${tagName}`);
        return current;
      }

      // Check for configured ARIA roles
      if (role && config.roles.includes(role)) {
        console.log(`      ✓ Matched role: ${role}`);
        return current;
      }

      // Check for elements with click handlers (always check these)
      if (current.onclick ||
          current.hasAttribute('onclick') ||
          current.style.cursor === 'pointer') {
        return current;
      }

      // Check for configured class name keywords
      const className = current.className || '';
      if (typeof className === 'string') {
        const lowerClassName = className.toLowerCase();
        for (const keyword of config.classNames) {
          if (lowerClassName.includes(keyword.toLowerCase())) {
            return current;
          }
        }
      }

      // Check for data-* attributes with configured keywords
      // Check common data attributes: data-testid, data-action, data-click, etc.
      const dataAttrs = Array.from(current.attributes || [])
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => attr.value.toLowerCase());

      for (const dataValue of dataAttrs) {
        for (const keyword of config.dataAttrs) {
          if (dataValue.includes(keyword.toLowerCase())) {
            return current;
          }
        }
      }

      current = current.parentElement;
      depth++;
    }

    console.log(`      ❌ No clickable ancestor found (traversed ${depth} levels)`);
    return null;
  }

  fallbackHeuristics(selectors) {
    if (!selectors || !selectors.length) return null;
    for (const sel of selectors) {
      if (typeof sel !== 'string') continue;
      const lower = sel.toLowerCase();
      if (lower.includes('aria-') || lower.startsWith('aria/')) {
        const label = sel.split(/[:=\/]/).pop();
        const element = this.queryAria(label);
        if (element) {
          return { element, strategy: 'aria-heuristic', query: label, hint: sel };
        }
      }
      if (lower.startsWith('text=') || lower.startsWith('text/')) {
        const text = sel.split(/[:=\/]/).pop();
        const element = this.queryText(text);
        if (element) {
          return { element, strategy: 'text-heuristic', query: text, hint: sel };
        }
      }
    }
    return null;
  }

  describeElement(element, context = {}) {
    if (!element) {
      return { exists: false };
    }

    const selectorInfo = this.selectorEngine
      ? this.selectorEngine.generateSelector(element, { includeCoordinates: true })
      : null;

    const coordinates = selectorInfo?.coordinates || this.#getElementCoordinatesFromEl(element);
    const finalSelector = selectorInfo?.selector || context.query || context.providedSelector;
    let origin = 'provided';
    if (selectorInfo?.selector) {
      origin = context.providedSelector && selectorInfo.selector === context.providedSelector
        ? 'provided'
        : 'generated';
    } else if (!context.providedSelector) {
      origin = 'unknown';
    }

    return {
      exists: true,
      selector: finalSelector,
      optimizedSelector: selectorInfo?.selector || null,
      origin,
      providedSelector: context.providedSelector,
      strategy: context.strategy,
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent ? element.textContent.trim().slice(0, 200) : '',
      visible: this.isElementVisibleSync(element),
      metadata: selectorInfo?.metadata,
      coordinates
    };
  }

  #getElementCoordinatesFromEl(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right
    };
  }

  // Check if element is visible
  async isElementVisible(selector) {
    const element = document.querySelector(selector);
    if (!element) return false;
    return this.isElementVisibleSync(element);
  }

  // Synchronous visibility check
  isElementVisibleSync(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  // Get element coordinates
  async getElementCoordinates(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right
    };
  }

  // Press key using DOM events
  async pressKey(selector, key) {
    const element = selector ? document.querySelector(selector) : document.activeElement;
    if (!element) {
      return { success: false, error: 'Element not found' };
    }

    // Focus the element first
    element.focus();

    // Map key names to key codes
    const keyMap = {
      'Enter': { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 },
      'Tab': { key: 'Tab', code: 'Tab', keyCode: 9, which: 9 },
      'Escape': { key: 'Escape', code: 'Escape', keyCode: 27, which: 27 },
      'Backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8 },
      'Delete': { key: 'Delete', code: 'Delete', keyCode: 46, which: 46 },
      'ArrowUp': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, which: 38 },
      'ArrowDown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 39, which: 39 },
      'ArrowLeft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, which: 37 },
      'ArrowRight': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39 }
    };

    const keyInfo = keyMap[key] || { key: key, code: key, keyCode: key.charCodeAt(0), which: key.charCodeAt(0) };

    // Create and dispatch keyboard events
    const keydownEvent = new KeyboardEvent('keydown', {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      which: keyInfo.which,
      bubbles: true,
      cancelable: true
    });

    const keypressEvent = new KeyboardEvent('keypress', {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      which: keyInfo.which,
      bubbles: true,
      cancelable: true
    });

    const keyupEvent = new KeyboardEvent('keyup', {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      which: keyInfo.which,
      bubbles: true,
      cancelable: true
    });

    element.dispatchEvent(keydownEvent);
    element.dispatchEvent(keypressEvent);
    element.dispatchEvent(keyupEvent);

    // Special handling for Enter key - also submit the form if it's in one
    if (key === 'Enter' && element.form) {
      element.form.submit();
    }

    return { success: true, key: key };
  }

  // Type text using DOM events (bypasses anti-automation like WhatsApp)
  async typeText(selector, text, options = {}) {
    const element = document.querySelector(selector);
    if (!element) {
      return { success: false, error: 'Element not found' };
    }

    // Focus element first
    element.focus();
    element.click(); // Some apps need click to activate

    // Wait a bit after click for element to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Detect element type
    const isContentEditable = element.contentEditable === 'true' ||
                              element.getAttribute('contenteditable') === 'true';
    const tagName = element.tagName.toLowerCase();

    // Clear existing content
    if (isContentEditable || tagName === 'div' || tagName === 'p') {
      // For contenteditable, use execCommand or manually clear
      element.textContent = '';
      // Also clear any child nodes
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    } else {
      element.value = '';
    }

    // Typing delay: 0ms for regular inputs (fast), 50ms for contenteditable (more realistic for WhatsApp)
    const delay = options.delay !== undefined ? options.delay : (isContentEditable ? 50 : 0);

    // Type each character with events (like a real user)
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const keyCode = char.charCodeAt(0);

      // For contenteditable, insert character using document.execCommand or insertText
      if (isContentEditable) {
        // Try using execCommand first (works better with WhatsApp)
        const success = document.execCommand('insertText', false, char);

        if (!success) {
          // Fallback: manually insert
          const textNode = document.createTextNode(char);
          element.appendChild(textNode);
        }
      } else {
        // For regular inputs, just append to value
        element.value += char;
      }

      // Dispatch events after inserting character
      const inputEvent = new InputEvent('input', {
        data: char,
        inputType: 'insertText',
        bubbles: true,
        cancelable: false,
        composed: true
      });
      element.dispatchEvent(inputEvent);

      const keydownEvent = new KeyboardEvent('keydown', {
        key: char,
        code: char.length === 1 ? `Key${char.toUpperCase()}` : char,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(keydownEvent);

      const keyupEvent = new KeyboardEvent('keyup', {
        key: char,
        code: char.length === 1 ? `Key${char.toUpperCase()}` : char,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(keyupEvent);

      // Delay between characters
      if (delay > 0 && i < text.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Final change event after all characters
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      success: true,
      text: text,
      elementType: isContentEditable ? 'contenteditable' : tagName,
      delay: delay,
      length: text.length
    };
  }

  // Click element using DOM events (more reliable than debugger API)
  async clickElement(selector, options = {}) {
    const element = document.querySelector(selector);
    if (!element) {
      return { success: false, error: 'Element not found' };
    }

    // Find clickable ancestor if the element itself might not be clickable
    const clickableElement = this.findClickableAncestor(element) || element;

    // Log if we found a clickable ancestor
    if (clickableElement !== element) {
      console.log(`   🔍 Found clickable ancestor: <${clickableElement.tagName}> (from <${element.tagName}>)`);
    }

    // Scroll element into view if not visible
    if (!this.isElementVisibleSync(clickableElement)) {
      clickableElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      // Wait a bit for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Get element position
    const rect = clickableElement.getBoundingClientRect();
    const x = options.offsetX !== undefined ? rect.left + options.offsetX : rect.left + rect.width / 2;
    const y = options.offsetY !== undefined ? rect.top + options.offsetY : rect.top + rect.height / 2;

    // Create mouse events with coordinates (like WhatsApp Web)
    const mouseEventOptions = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY,
      button: 0,
      buttons: 1
    };

    // Dispatch full sequence of pointer and mouse events (for modern web apps like WhatsApp)
    const pointerEventOptions = {
      ...mouseEventOptions,
      pointerId: 1,
      width: 1,
      height: 1,
      pressure: 0.5,
      pointerType: 'mouse',
      isPrimary: true
    };

    clickableElement.dispatchEvent(new PointerEvent('pointerover', pointerEventOptions));
    clickableElement.dispatchEvent(new PointerEvent('pointerenter', pointerEventOptions));
    clickableElement.dispatchEvent(new PointerEvent('pointermove', pointerEventOptions));
    clickableElement.dispatchEvent(new PointerEvent('pointerdown', pointerEventOptions));

    clickableElement.dispatchEvent(new MouseEvent('mouseenter', mouseEventOptions));
    clickableElement.dispatchEvent(new MouseEvent('mouseover', mouseEventOptions));
    clickableElement.dispatchEvent(new MouseEvent('mousemove', mouseEventOptions));
    clickableElement.dispatchEvent(new MouseEvent('mousedown', mouseEventOptions));

    // Focus the element if it's focusable
    if (typeof clickableElement.focus === 'function') {
      try {
        clickableElement.focus();
      } catch (e) {
        // Ignore focus errors
      }
    }

    // Small delay between mousedown and mouseup (realistic timing)
    await new Promise(resolve => setTimeout(resolve, 10));

    clickableElement.dispatchEvent(new PointerEvent('pointerup', pointerEventOptions));
    clickableElement.dispatchEvent(new PointerEvent('pointerout', pointerEventOptions));
    clickableElement.dispatchEvent(new PointerEvent('pointerleave', pointerEventOptions));

    clickableElement.dispatchEvent(new MouseEvent('mouseup', mouseEventOptions));
    clickableElement.dispatchEvent(new MouseEvent('click', mouseEventOptions));

    // Also dispatch dblclick for apps that might need it (like WhatsApp)
    clickableElement.dispatchEvent(new MouseEvent('dblclick', mouseEventOptions));

    // For links, also trigger navigation if click wasn't prevented
    if (clickableElement.tagName === 'A' && clickableElement.href) {
      // Check if default was prevented
      const clickEvent = new MouseEvent('click', { ...mouseEventOptions, cancelable: true });
      const notPrevented = clickableElement.dispatchEvent(clickEvent);

      if (notPrevented && !clickableElement.target) {
        // Navigate in same window
        window.location.href = clickableElement.href;
      } else if (notPrevented && clickableElement.target === '_blank') {
        // Open in new tab
        window.open(clickableElement.href, '_blank');
      }
    }

    return {
      success: true,
      tagName: clickableElement.tagName,
      href: clickableElement.href || null,
      coordinates: { x, y },
      usedAncestor: clickableElement !== element,
      originalTag: element.tagName
    };
  }

  // Helper methods that can be called from background script
  static async findElements(selector) {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map((el, index) => ({
      index,
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      textContent: el.textContent.substring(0, 100),
      boundingRect: el.getBoundingClientRect()
    }));
  }

  static async getElementText(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent : null;
  }

  static async clickElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
      return true;
    }
    return false;
  }

  static async setInputValue(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  static async waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkElement = () => {
        const element = document.querySelector(selector);

        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        } else {
          setTimeout(checkElement, 100);
        }
      };

      checkElement();
    });
  }
}

// Initialize content script
new DeskAgentContent();
