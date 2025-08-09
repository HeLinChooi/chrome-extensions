const currentUrl = window.location.hostname + window.location.pathname;

function generateHighlightId() {
  return 'highlight_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getTextPath(element) {
  const path = [];
  let current = element;
  
  while (current && current !== document.body) {
    const parent = current.parentNode;
    if (parent) {
      const siblings = Array.from(parent.childNodes);
      const index = siblings.indexOf(current);
      path.unshift(index);
    }
    current = parent;
  }
  
  return path;
}

function getElementByPath(path) {
  let current = document.body;
  
  for (const index of path) {
    if (current.childNodes[index]) {
      current = current.childNodes[index];
    } else {
      return null;
    }
  }
  
  return current;
}

function saveHighlight(highlightData) {
  chrome.storage.sync.get([currentUrl], function(result) {
    const highlights = result[currentUrl] || [];
    highlights.push(highlightData);
    
    chrome.storage.sync.set({
      [currentUrl]: highlights
    });
  });
}

function removeHighlightFromStorage(highlightId) {
  chrome.storage.sync.get([currentUrl], function(result) {
    const highlights = result[currentUrl] || [];
    const updatedHighlights = highlights.filter(h => h.id !== highlightId);
    
    chrome.storage.sync.set({
      [currentUrl]: updatedHighlights
    });
  });
}

function highlightSelectedText() {
  const selection = window.getSelection();
  
  if (selection.rangeCount === 0 || selection.toString().trim() === '') {
    return;
  }

  const range = selection.getRangeAt(0);
  
  if (range.collapsed) {
    return;
  }

  const span = document.createElement('span');
  const highlightId = generateHighlightId();
  span.className = 'text-highlighter-yellow';
  span.setAttribute('data-highlight-id', highlightId);
  
  const text = range.toString();
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;
  
  try {
    range.surroundContents(span);
  } catch (e) {
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
  }
  
  const highlightData = {
    id: highlightId,
    text: text,
    startPath: getTextPath(startContainer),
    endPath: getTextPath(endContainer),
    startOffset: startOffset,
    endOffset: endOffset,
    timestamp: Date.now()
  };
  
  saveHighlight(highlightData);
  selection.removeAllRanges();
}

function removeHighlight(element) {
  if (element.classList.contains('text-highlighter-yellow')) {
    const highlightId = element.getAttribute('data-highlight-id');
    const parent = element.parentNode;
    
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
    parent.normalize();
    
    if (highlightId) {
      removeHighlightFromStorage(highlightId);
    }
  }
}

function restoreHighlights() {
  chrome.storage.sync.get([currentUrl], function(result) {
    const highlights = result[currentUrl] || [];
    
    highlights.forEach(highlightData => {
      try {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent;
          const index = text.indexOf(highlightData.text);
          
          if (index !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + highlightData.text.length);
            
            if (range.toString() === highlightData.text) {
              const span = document.createElement('span');
              span.className = 'text-highlighter-yellow';
              span.setAttribute('data-highlight-id', highlightData.id);
              
              try {
                range.surroundContents(span);
                break;
              } catch (e) {
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
                break;
              }
            }
          }
        }
      } catch (e) {
        console.log('Could not restore highlight:', e);
      }
    });
  });
}

document.addEventListener('mouseup', function(e) {
  if (e.ctrlKey || e.metaKey) {
    highlightSelectedText();
  }
});

document.addEventListener('dblclick', function(e) {
  if (e.target.classList.contains('text-highlighter-yellow')) {
    if (e.ctrlKey || e.metaKey) {
      removeHighlight(e.target);
    }
  }
});

document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
    e.preventDefault();
    highlightSelectedText();
  }
});

setTimeout(restoreHighlights, 500);