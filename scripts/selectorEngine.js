// DeskAgent Selector Engine - derived from WhatsApp selector utilities
(function(global) {
  const cssEscape = (value) => {
    if (typeof value === 'undefined' || value === null) {
      return '';
    }
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(String(value));
    }
    return String(value).replace(/(["'\\])/g, '\\$1').replace(/\u0000/g, '\uFFFD');
  };

  class DeskAgentSelectorEngine {
    constructor() {
      this.defaultOptions = {
        includeCoordinates: false,
        optimizeSelector: true,
        maxDepth: 8,
        preferredAttributes: [
          'data-testid',
          'data-id',
          'id',
          'role',
          'aria-label',
          'name',
          'class'
        ]
      };
    }

    generateSelector(element, options = {}) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const config = { ...this.defaultOptions, ...options };
      const result = {
        selector: null,
        coordinates: null,
        metadata: {
          depth: 0,
          specificity: 0,
          isUnique: false
        }
      };

      try {
        result.selector = this.#buildCSSSelector(element, config);
        const matches = document.querySelectorAll(result.selector);
        result.metadata.isUnique = matches.length === 1;
        result.metadata.specificity = this.#calculateSpecificity(result.selector);

        if (!result.metadata.isUnique && config.optimizeSelector) {
          const optimized = this.#optimizeSelector(element, result.selector, config);
          if (optimized) {
            result.selector = optimized;
            const optimizedMatches = document.querySelectorAll(result.selector);
            result.metadata.isUnique = optimizedMatches.length === 1;
            result.metadata.specificity = this.#calculateSpecificity(result.selector);
          }
        }

        if (!result.selector) {
          result.selector = this.#getFallbackSelector(element);
        }

        if (config.includeCoordinates) {
          result.coordinates = this.#getElementCoordinates(element);
        }

        return result;
      } catch (error) {
        console.warn('DeskAgent selector generation failed', error);
        return {
          selector: this.#getFallbackSelector(element),
          coordinates: config.includeCoordinates ? this.#getElementCoordinates(element) : null,
          metadata: { depth: 1, specificity: 1, isUnique: false, error: error.message }
        };
      }
    }

    buildSelectorForMatch(selector, options = {}) {
      if (!selector) return null;
      const element = document.querySelector(selector);
      if (!element) return null;
      return this.generateSelector(element, options);
    }

    #buildCSSSelector(element, config) {
      const path = [];
      let current = element;
      let depth = 0;

      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body && depth < config.maxDepth) {
        const descriptor = this.#getElementDescriptor(current, config);
        if (!descriptor) break;
        path.unshift(descriptor.value);
        if (descriptor.isUnique) {
          break;
        }
        current = current.parentElement;
        depth++;
      }

      return path.join(' > ');
    }

    #getElementDescriptor(element, config) {
      let selector = element.nodeName.toLowerCase();

      for (const attr of config.preferredAttributes) {
        if (!element.hasAttribute(attr)) continue;
        const value = element.getAttribute(attr);
        if (!value) continue;

        if (attr === 'id') {
          const idSelector = `#${cssEscape(value)}`;
          if (document.querySelectorAll(idSelector).length === 1) {
            return { value: idSelector, isUnique: true };
          }
        } else if (attr === 'class') {
          const classes = value.split(/\s+/)
            .filter(Boolean)
            .filter(c => !this.#isGeneratedClass(c))
            .slice(0, 2);
          if (classes.length) {
            const classSelector = selector + '.' + classes.map(c => cssEscape(c)).join('.');
            if (document.querySelectorAll(classSelector).length === 1) {
              return { value: classSelector, isUnique: true };
            }
            selector = classSelector;
          }
        } else {
          const attrSelector = `${selector}[${attr}="${cssEscape(value)}"]`;
          if (document.querySelectorAll(attrSelector).length === 1) {
            return { value: attrSelector, isUnique: true };
          }
          selector = attrSelector;
        }
      }

      if (element.parentElement) {
        const siblings = Array.from(element.parentElement.children).filter(el => el.nodeName === element.nodeName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      return { value: selector, isUnique: false };
    }

    #optimizeSelector(element, baseSelector, config) {
      if (!element) return baseSelector;
      const enhanced = this.#enhanceSelector(element, baseSelector);
      if (enhanced && enhanced !== baseSelector && document.querySelectorAll(enhanced).length === 1) {
        return enhanced;
      }

      const dataSelector = this.#buildDataAttributeSelector(element);
      if (dataSelector && document.querySelectorAll(dataSelector).length === 1) {
        return dataSelector;
      }

      return baseSelector;
    }

    #enhanceSelector(element, baseSelector) {
      const suffixes = [];
      if (element.hasAttribute('role')) {
        suffixes.push(`[role="${cssEscape(element.getAttribute('role'))}"]`);
      }
      if (element.hasAttribute('aria-label')) {
        suffixes.push(`[aria-label="${cssEscape(element.getAttribute('aria-label'))}"]`);
      }
      if (element.nodeName === 'INPUT' && element.hasAttribute('type')) {
        suffixes.push(`[type="${cssEscape(element.getAttribute('type'))}"]`);
      }
      if (!suffixes.length) return baseSelector;
      return baseSelector + suffixes.join('');
    }

    #buildDataAttributeSelector(element) {
      const dataAttrs = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .slice(0, 2);
      if (!dataAttrs.length) return null;
      return element.nodeName.toLowerCase() + dataAttrs.map(attr => `[${attr.name}="${cssEscape(attr.value)}"]`).join('');
    }

    #getElementCoordinates(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bottom: Math.round(rect.bottom),
        right: Math.round(rect.right)
      };
    }

    #calculateSpecificity(selector) {
      if (!selector) return 0;
      let specificity = 0;
      specificity += (selector.match(/#/g) || []).length * 100;
      specificity += (selector.match(/\./g) || []).length * 10;
      specificity += (selector.match(/\[/g) || []).length * 10;
      specificity += (selector.match(/(^|\s+|>)[a-zA-Z]/g) || []).length;
      return specificity;
    }

    #getFallbackSelector(element) {
      if (!element) return null;
      if (element.id) {
        return `#${cssEscape(element.id)}`;
      }
      if (element.classList && element.classList.length) {
        const stableClass = Array.from(element.classList).find(cls => !this.#isGeneratedClass(cls));
        if (stableClass) {
          return `${element.nodeName.toLowerCase()}.${cssEscape(stableClass)}`;
        }
      }
      return element.nodeName ? element.nodeName.toLowerCase() : null;
    }

    #isGeneratedClass(className) {
      const patterns = [
        /^_[a-zA-Z0-9]{5,}/,
        /^[a-zA-Z0-9]{32,}$/,
        /css-[a-zA-Z0-9]+/,
        /^x[a-zA-Z0-9]{10,}/,
        /^[a-f0-9]{8,}$/,
        /\d{13,}/
      ];
      return patterns.some(pattern => pattern.test(className));
    }
  }

  global.DeskAgentSelectorEngine = DeskAgentSelectorEngine;
})(typeof window !== 'undefined' ? window : globalThis);
