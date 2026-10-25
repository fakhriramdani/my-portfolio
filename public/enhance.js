/**
 * public/enhance.js — first-party vanilla enhancement script (<= 5 KB gzip).
 * APG tablist + roving tabindex + URL sync (?tab=)
 * Native dialog enhancement + showModal + focus return + backdrop click + scroll lock.
 * Conforms to ADR-0005, ADR-0006, and TECH-SPEC v2.0 Section 4.5.
 */
(function () {
  'use strict';

  var VALID_TABS = ['projects', 'skills', 'education', 'language'];
  var lastTriggerMap = new WeakMap();
  var previousOverflow = '';
  var previousScrollbarGutter = '';

  function lockScroll() {
    if (!document.querySelector('dialog[open]')) {
      previousOverflow = document.documentElement.style.overflow || '';
      previousScrollbarGutter = document.documentElement.style.scrollbarGutter || '';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.scrollbarGutter = 'stable';
    }
  }

  function unlockScroll() {
    if (!document.querySelector('dialog[open]')) {
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.style.scrollbarGutter = previousScrollbarGutter;
    }
  }

  function initTabs() {
    var tabbar = document.querySelector('[data-tabbar], .nd-tabbar');
    if (!tabbar) return;

    var tabs = Array.prototype.slice.call(tabbar.querySelectorAll('label[data-tab]'));
    var inputs = Array.prototype.slice.call(tabbar.querySelectorAll('input[type="radio"], input[data-tab-input]'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('[data-tab-panel]'));

    inputs.forEach(function (input) {
      input.tabIndex = -1;
    });

    tabs.forEach(function (tab) {
      var id = tab.getAttribute('data-tab');
      tab.setAttribute('aria-controls', 'panel-' + id);
    });

    panels.forEach(function (panel) {
      panel.setAttribute('tabindex', '0');
    });

    function activateTab(targetId, shouldFocus, updateUrl) {
      if (VALID_TABS.indexOf(targetId) === -1) {
        targetId = 'projects';
      }

      tabs.forEach(function (tab) {
        var id = tab.getAttribute('data-tab');
        var isSelected = (id === targetId);
        tab.setAttribute('tabindex', isSelected ? '0' : '-1');
        if (isSelected && shouldFocus) {
          tab.focus();
        }
      });

      inputs.forEach(function (input) {
        var id = input.value || input.id.replace('tab-', '');
        var shouldCheck = (id === targetId);
        if (input.checked !== shouldCheck) {
          input.checked = shouldCheck;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      panels.forEach(function (panel) {
        var id = panel.getAttribute('data-tab-panel');
        if (id === targetId) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
      });

      if (updateUrl && window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', '?tab=' + targetId);
      }
    }

    tabbar.addEventListener('click', function (e) {
      var tab = e.target.closest('label[data-tab]');
      if (!tab) return;
      var id = tab.getAttribute('data-tab');
      if (id) {
        e.preventDefault();
        activateTab(id, true, true);
      }
    });

    tabbar.addEventListener('keydown', function (e) {
      var activeTab = document.activeElement && document.activeElement.closest('label[data-tab]');
      if (!activeTab || tabs.indexOf(activeTab) === -1) return;

      var currentIndex = tabs.indexOf(activeTab);
      var newIndex = -1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        newIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        newIndex = 0;
      } else if (e.key === 'End') {
        newIndex = tabs.length - 1;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var id = activeTab.getAttribute('data-tab');
        if (id) activateTab(id, true, true);
        return;
      }

      if (newIndex !== -1) {
        e.preventDefault();
        var nextTab = tabs[newIndex];
        var nextId = nextTab.getAttribute('data-tab');
        activateTab(nextId, true, true);
      }
    });

    // Load time URL sync
    var searchParams = new URLSearchParams(window.location.search);
    var urlTab = searchParams.get('tab');
    if (urlTab !== null) {
      if (VALID_TABS.indexOf(urlTab) !== -1) {
        activateTab(urlTab, false, false);
      } else {
        searchParams.delete('tab');
        var newQuery = searchParams.toString();
        var cleanUrl = window.location.pathname + (newQuery ? '?' + newQuery : '') + window.location.hash;
        if (window.history && typeof window.history.replaceState === 'function') {
          window.history.replaceState(null, '', cleanUrl);
        }
        activateTab('projects', false, false);
      }
    } else {
      var checkedInput = null;
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].checked) {
          checkedInput = inputs[i];
          break;
        }
      }
      var initialId = checkedInput ? (checkedInput.value || checkedInput.id.replace('tab-', '')) : 'projects';
      activateTab(initialId, false, false);
    }
  }

  function initModals() {
    function openModal(id, trigger) {
      var dialog = document.getElementById('modal-' + id);
      if (!dialog || typeof dialog.showModal !== 'function') return;

      if (trigger) {
        lastTriggerMap.set(dialog, trigger);
      }

      lockScroll();
      dialog.showModal();
    }

    function closeModal(dialog) {
      if (dialog && typeof dialog.close === 'function' && dialog.open) {
        dialog.close();
      }
    }

    document.addEventListener('click', function (e) {
      // 1. Close button click
      var closeBtn = e.target.closest('[data-modal-close]') || e.target.closest('.nd-modal__close');
      if (closeBtn) {
        var dialog = closeBtn.closest('dialog');
        if (dialog) {
          e.preventDefault();
          closeModal(dialog);
          return;
        }
      }

      // 2. Backdrop click
      if (e.target.tagName === 'DIALOG' && e.target.classList.contains('nd-modal')) {
        closeModal(e.target);
        return;
      }

      // 3. Trigger or project card click
      var trigger = e.target.closest('[data-modal-trigger]');
      var card = e.target.closest('[data-project-card]');

      if (trigger) {
        var id = trigger.getAttribute('data-modal-trigger');
        if (id) {
          e.preventDefault();
          openModal(id, trigger);
        }
      } else if (card) {
        var cardId = card.getAttribute('data-project-id');
        var cardTrigger = card.querySelector('[data-modal-trigger]') || card;
        if (cardId) {
          e.preventDefault();
          openModal(cardId, cardTrigger);
        }
      }
    });

    document.addEventListener('close', function (e) {
      if (e.target && e.target.tagName === 'DIALOG') {
        unlockScroll();
        var trigger = lastTriggerMap.get(e.target);
        if (trigger && typeof trigger.focus === 'function') {
          trigger.focus();
        }
      }
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var openDialog = document.querySelector('dialog[open]');
      if (!openDialog) return;

      var focusable = openDialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !openDialog.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !openDialog.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    document.addEventListener('touchmove', function (e) {
      if (!document.querySelector('dialog[open]')) return;
      if (!e.target.closest('.nd-modal__content')) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  function init() {
    initTabs();
    initModals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
