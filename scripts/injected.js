// Injected Script - Runs in page context
// This script can access page variables and functions

(function() {
  'use strict';

  // DeskAgent helper utilities for injected scripts
  window.DeskAgentHelpers = {
    // Find elements by various selectors
    findElement: function(selector, type = 'css') {
      switch (type) {
        case 'css':
          return document.querySelector(selector);
        case 'xpath':
          const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          return result.singleNodeValue;
        case 'text':
          return Array.from(document.querySelectorAll('*')).find(el =>
            el.textContent.trim().includes(selector)
          );
        case 'aria':
          return document.querySelector(`[aria-label="${selector}"]`);
        default:
          return null;
      }
    },

    // Find all elements
    findElements: function(selector, type = 'css') {
      switch (type) {
        case 'css':
          return Array.from(document.querySelectorAll(selector));
        case 'xpath':
          const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          const elements = [];
          for (let i = 0; i < result.snapshotLength; i++) {
            elements.push(result.snapshotItem(i));
          }
          return elements;
        case 'text':
          return Array.from(document.querySelectorAll('*')).filter(el =>
            el.textContent.trim().includes(selector)
          );
        default:
          return [];
      }
    },

    // Simulate click
    click: function(element) {
      if (typeof element === 'string') {
        element = this.findElement(element);
      }
      if (element) {
        element.click();
        return true;
      }
      return false;
    },

    // Set input value
    setValue: function(element, value) {
      if (typeof element === 'string') {
        element = this.findElement(element);
      }
      if (element) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    },

    // Get element text
    getText: function(element) {
      if (typeof element === 'string') {
        element = this.findElement(element);
      }
      return element ? element.textContent.trim() : null;
    },

    // Wait for element
    waitForElement: function(selector, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
          const element = this.findElement(selector);
          if (element) {
            resolve(element);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
          } else {
            setTimeout(check, 100);
          }
        };

        check();
      });
    },

    // Scroll to element
    scrollTo: function(element, options = {}) {
      if (typeof element === 'string') {
        element = this.findElement(element);
      }
      if (element) {
        element.scrollIntoView({
          behavior: options.smooth ? 'smooth' : 'auto',
          block: options.block || 'center',
          inline: options.inline || 'nearest'
        });
        return true;
      }
      return false;
    },

    // Get element attributes
    getAttributes: function(element) {
      if (typeof element === 'string') {
        element = this.findElement(element);
      }
      if (element) {
        const attrs = {};
        for (const attr of element.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      }
      return null;
    },

    // Get element styles
    getStyles: function(element) {
      if (typeof element === 'string') {
        element = this.findElement(element);
      }
      return element ? window.getComputedStyle(element) : null;
    },

    // Check if element is visible
    isVisible: function(element) {
      if (typeof element === 'string') {
        element = this.findElement(element);
      }
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    },

    // Execute custom JavaScript
    execute: function(code) {
      try {
        return eval(code);
      } catch (error) {
        console.error('Error executing code:', error);
        throw error;
      }
    },

    // Wait utility
    wait: function(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  };

  console.log('DeskAgent helpers loaded');
})();
