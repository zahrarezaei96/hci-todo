let recognition;
let hasStarted = false;
let toggleExpandedFn = null;

export function setToggleExpanded(fn) {
  toggleExpandedFn = fn;
}

// Voice display element
function showVoiceText(text) {
  let display = document.getElementById('voice-display');
  if (!display) {
    display = document.createElement('div');
    display.id = 'voice-display';
    display.style.cssText = `
      position: fixed; bottom: 24px; right: 24px;
      background: rgba(0,0,0,0.75); color: white;
      padding: 6px 14px; border-radius: 20px;
      font-size: 13px; font-family: sans-serif;
      z-index: 999997; pointer-events: none;
      transition: opacity 0.3s;
      white-space: nowrap;
    `;
    document.body.appendChild(display);
  }
  display.textContent = `🎤 "${text}"`;
  display.style.opacity = '1';
  clearTimeout(display._timeout);
  display._timeout = setTimeout(() => { display.style.opacity = '0'; }, 2500);
}

// Get element at nose cursor with tolerance
function getElementAtNoseCursor() {
  const dot = document.getElementById('gaze-cursor-dot');
  if (!dot) return null;
  const x = parseFloat(dot.style.left);
  const y = parseFloat(dot.style.top);
  if (!x || !y) return null;

  // Try exact point first
  dot.style.display = 'none';
  let el = document.elementFromPoint(x, y);
  dot.style.display = 'block';

  // If no meaningful element, try nearby points (tolerance)
  if (!el || el === document.body || el === document.documentElement) {
    const offsets = [[0,0],[10,0],[-10,0],[0,10],[0,-10],[15,0],[-15,0],[0,15],[0,-15]];
    dot.style.display = 'none';
    for (const [dx, dy] of offsets) {
      const candidate = document.elementFromPoint(x + dx, y + dy);
      if (candidate && candidate !== document.body && candidate !== document.documentElement) {
        el = candidate;
        break;
      }
    }
    dot.style.display = 'block';
  }
  return el;
}

export function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    // Firefox doesn't support SpeechRecognition — show user-facing warning
    let warn = document.getElementById('browser-warn');
    if (!warn) {
      warn = document.createElement('div');
      warn.id = 'browser-warn';
      warn.style.cssText = `
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
        background: #d93025; color: white; padding: 10px 20px;
        border-radius: 10px; font-size: 13px; font-family: sans-serif;
        z-index: 999999; pointer-events: none; text-align: center;
      `;
      warn.textContent = '⚠️ Voice commands require Chrome or Edge — Firefox is not supported';
      document.body.appendChild(warn);
    }
    console.log("Speech recognition not supported");
    return;
  }
  if (hasStarted) return;

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => { hasStarted = true; };

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (!result.isFinal) return;
    const text = result[0].transcript.toLowerCase().trim();
    showVoiceText(text);

    console.log("Voice command:", text);
    const target = getElementAtNoseCursor();

    // ── CLICK / SELECT ──
    if (text.includes("click") || text.includes("select")) {
      target?.click();
    }

    // ── NEXT (onboarding) ──
    if (text.includes("next")) {
      const nextBtn = document.querySelector('.ob-next:not(.ob-next--disabled)');
      nextBtn?.click();
    }

    // ── BACK (onboarding) ──
    if (text.includes("back")) {
      document.querySelector('.ob-back')?.click();
    }

    // ── MALE / FEMALE (onboarding) ──
    if (text.includes("male") && !text.includes("female")) {
      const maleBtns = document.querySelectorAll('.ob-gender-btn');
      maleBtns[0]?.click();
    }
    if (text.includes("female")) {
      const femaleBtns = document.querySelectorAll('.ob-gender-btn');
      femaleBtns[1]?.click();
    }

    // ── WRITE / TYPE / FOCUS (onboarding name input) ──
    if (text.includes("write") || text.includes("type") || text.includes("name")) {
      const obInput = document.querySelector('.ob-input');
      obInput?.focus();
    }

    // ── LET'S GO / FINISH (onboarding) ──
    if (text.includes("let's go") || text.includes("lets go") || text.includes("finish")) {
      const nextBtn = document.querySelector('.ob-next:not(.ob-next--disabled)');
      nextBtn?.click();
    }

    // ── OPEN / EXPAND / CLOSE ──
    if (text.includes("open") || text.includes("expand") || text.includes("close")) {
      // Check if target is a CustomSelect trigger
      const customSelect = target?.closest('[data-custom-select]');
      if (customSelect) {
        const trigger = customSelect.querySelector('button');
        trigger?.click();
      } else {
        // If "close" and a todo is expanded, close it directly
        if (text.includes("close")) {
          const expandedWrap = document.querySelector('.todo-item-wrap--expanded');
          if (expandedWrap) {
            const todoId = expandedWrap.getAttribute('data-todo-id');
            if (todoId && toggleExpandedFn) {
              toggleExpandedFn(todoId);
            } else {
              expandedWrap.click();
            }
          }
        } else {
          // "open" / "expand" — use cursor target
          const todoWrap = target?.closest('.todo-item-wrap');
          if (todoWrap) {
            const todoId = todoWrap.getAttribute('data-todo-id');
            if (todoId && toggleExpandedFn) {
              toggleExpandedFn(todoId);
            } else {
              todoWrap.click();
            }
          }
        }
      }
    }

    // ── CHOOSE / SELECT OPTION ── (when inside custom dropdown)
    if (text.includes("choose") || text.includes("pick") || text.includes("select")) {
      // If cursor is on a custom select option, click it
      const option = target?.closest('[data-select-option]');
      if (option) {
        option.click();
      } else {
        // generic click
        target?.click();
      }
    }

    // ── CHECK / COMPLETE ──
    if (text.includes("check") || text.includes("complete") || text.includes("done")) {
      const checkBtn = target?.closest('.todo-item-wrap')?.querySelector('.check-btn');
      checkBtn?.click();
    }

    // ── DELETE ──
    if (text.includes("delete") || text.includes("remove")) {
      const deleteBtn = target?.closest('.todo-item-wrap')?.querySelector('.detail-delete');
      deleteBtn?.click();
    }

    // ── STAR ──
    if (text.includes("star") || text.includes("important")) {
      const starBtn = target?.closest('.todo-item-wrap')?.querySelector('.star-btn');
      starBtn?.click();
    }

    // ── ADD / TITLE ──
    if (text.includes("add") || text.includes("new task") || text.includes("title")) {
      const addInput = document.querySelector('.add-task-input');
      if (addInput) {
        addInput.focus();
        // Close other inputs
        document.querySelector('.add-tag-input')?.blur();
        document.querySelector('.add-notes-input')?.blur();
      }
    }

    // ── TAG ──
    if (text === "tag" || text === "tags" || text.includes("add tag")) {
      const tagInput = document.querySelector('.add-tag-input');
      if (tagInput) {
        tagInput.focus();
        document.querySelector('.add-task-input')?.blur();
        document.querySelector('.add-notes-input')?.blur();
      }
    }

    // ── NOTE ──
    if (text === "note" || text.includes("add a note") || text.includes("add note")) {
      const noteInput = document.querySelector('.add-notes-input');
      if (noteInput) {
        noteInput.focus();
        document.querySelector('.add-task-input')?.blur();
        document.querySelector('.add-tag-input')?.blur();
      }
    }

    // ── CANCEL ──
    if (text.includes("cancel")) {
      document.querySelector('.btn-cancel-task')?.click();
    }

    // ── CONFIRM / SAVE ──
    if (text.includes("confirm") || text.includes("save") || text.includes("submit")) {
      document.querySelector('.btn-add-task')?.click();
    }

    // ── CLEAR DONE ──
    if (text === "clear" || text.includes("clear tasks") || text.includes("clear all")) {
      document.querySelector('.clear-btn')?.click();
    }

    // ── SEARCH ──
    if (text.includes("search")) {
      (document.querySelector('.search-input'))?.focus();
    }

    // ── SIDEBAR TOGGLE ──
    if (text.includes("sidebar") || text.includes("menu") || text.includes("toggle menu")) {
      document.querySelector('.menu-btn')?.click();
    }

    // ── FILTER TOGGLE ──
    if (text.includes("filter") || text.includes("filters")) {
      document.querySelector('.filter-toggle')?.click();
    }

    // ── SIDEBAR NAVIGATION ──
    if (text.includes("my day") || text.includes("today")) {
      document.querySelector('[data-list-id="myday"]')?.click();
    }
    if (text.includes("planned")) {
      document.querySelector('[data-list-id="planned"]')?.click();
    }
    if (text.includes("all tasks")) {
      document.querySelector('[data-list-id="all"]')?.click();
    }
    if (text.includes("personal")) {
      document.querySelector('[data-list-id="personal"]')?.click();
    }
    if (text.includes("work")) {
      document.querySelector('[data-list-id="work"]')?.click();
    }
    if (text.includes("go") || text.includes("navigate")) {
      target?.closest('.nav-item')?.click();
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') return;
    console.log("Speech error:", event.error);
  };

  recognition.onend = () => {
    hasStarted = false;
    setTimeout(() => startSpeechRecognition(), 500);
  };

  recognition.start();
}
