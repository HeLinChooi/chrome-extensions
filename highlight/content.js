// Generate unique identifier for this webpage (hostname + pathname)
// Used as storage key to save highlights per website
const currentUrl = window.location.hostname + window.location.pathname;

// Generate a unique ID for each highlight
// Format: 'highlight_timestamp_randomString' (e.g., 'highlight_1703123456789_abc123def')
function generateHighlightId() {
  return 'highlight_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// Create a path array representing the position of an element in the DOM tree
// This allows us to find the same element later when restoring highlights
// Returns array like [2, 1, 0] meaning: body -> 3rd child -> 2nd child -> 1st child
function getTextPath(element) {
  const path = [];
  let current = element;
  
  // Walk up the DOM tree until we reach the body element
  while (current && current !== document.body) {
    const parent = current.parentNode;
    if (parent) {
      // Find the index of current element among its siblings
      const siblings = Array.from(parent.childNodes);
      const index = siblings.indexOf(current);
      path.unshift(index); // Add to beginning of array
    }
    current = parent;
  }
  
  return path;
}

// Navigate to a specific element using a path array
// Used to restore highlights by finding the original text location
function getElementByPath(path) {
  let current = document.body;
  
  // Follow the path by traversing child nodes
  for (const index of path) {
    if (current.childNodes[index]) {
      current = current.childNodes[index];
    } else {
      return null; // Path no longer exists (DOM changed)
    }
  }
  
  return current;
}

// Save a highlight to Chrome's sync storage
// Storage structure: { "example.com/page": [highlight1, highlight2, ...] }
function saveHighlight(highlightData) {
  chrome.storage.sync.get([currentUrl], function(result) {
    const highlights = result[currentUrl] || []; // Get existing highlights or empty array
    highlights.push(highlightData); // Add new highlight to the list
    
    // Save back to storage using the URL as the key
    chrome.storage.sync.set({
      [currentUrl]: highlights
    });
  });
}

// Remove a specific highlight from storage by its ID
function removeHighlightFromStorage(highlightId) {
  chrome.storage.sync.get([currentUrl], function(result) {
    const highlights = result[currentUrl] || [];
    // Filter out the highlight with matching ID
    const updatedHighlights = highlights.filter(h => h.id !== highlightId);
    
    // Save the updated list back to storage
    chrome.storage.sync.set({
      [currentUrl]: updatedHighlights
    });
  });
}

// Highlight the currently selected text with yellow background
function highlightSelectedText() {
  const selection = window.getSelection();
  
  // Exit if no text is selected
  if (selection.rangeCount === 0 || selection.toString().trim() === '') {
    return;
  }

  const range = selection.getRangeAt(0);
  
  // Exit if selection is collapsed (cursor position, no actual selection)
  if (range.collapsed) {
    return;
  }

  // Create span element to wrap the selected text
  const span = document.createElement('span');
  const highlightId = generateHighlightId();
  span.className = 'text-highlighter-yellow'; // Apply yellow highlight CSS
  span.setAttribute('data-highlight-id', highlightId); // Store unique ID for later removal
  
  // Store information about the selection for persistence
  const text = range.toString();
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;
  
  // Wrap the selected text with our highlight span
  try {
    // Try the simple approach first
    range.surroundContents(span);
  } catch (e) {
    // Fallback for complex selections (spans multiple elements)
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
  }
  
  // Create data object to store in Chrome storage
  const highlightData = {
    id: highlightId,
    text: text, // The actual highlighted text
    startPath: getTextPath(startContainer), // DOM path to start location
    endPath: getTextPath(endContainer), // DOM path to end location
    startOffset: startOffset, // Character offset within start node
    endOffset: endOffset, // Character offset within end node
    timestamp: Date.now() // When this highlight was created
  };
  
  saveHighlight(highlightData); // Save to Chrome storage for persistence
  selection.removeAllRanges(); // Clear the selection
}

// Remove a highlight by unwrapping the span element
function removeHighlight(element) {
  if (element.classList.contains('text-highlighter-yellow')) {
    const highlightId = element.getAttribute('data-highlight-id');
    const parent = element.parentNode;
    
    // Move all children of the highlight span back to its parent
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element); // Remove the now-empty highlight span
    parent.normalize(); // Merge adjacent text nodes that may have been split
    
    // Remove from persistent storage as well
    if (highlightId) {
      removeHighlightFromStorage(highlightId);
    }
  }
}

// Restore all saved highlights when the page loads
function restoreHighlights() {
  chrome.storage.sync.get([currentUrl], function(result) {
    const highlights = result[currentUrl] || []; // Get saved highlights for this page
    
    // Process each saved highlight
    highlights.forEach(highlightData => {
      try {
        // Create a tree walker to find all text nodes in the page
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT, // Only visit text nodes
          null,
          false
        );
        
        let node;
        // Walk through each text node looking for our highlighted text
        while (node = walker.nextNode()) {
          const text = node.textContent;
          const index = text.indexOf(highlightData.text);
          
          // If we found the text, try to recreate the highlight
          if (index !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + highlightData.text.length);
            
            // Verify this is exactly the text we want to highlight
            if (range.toString() === highlightData.text) {
              const span = document.createElement('span');
              span.className = 'text-highlighter-yellow';
              span.setAttribute('data-highlight-id', highlightData.id);
              
              // Apply the highlight span around the text
              try {
                range.surroundContents(span);
                break; // Stop looking once we've found and highlighted this text
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

// Main event listener: Handle Ctrl+click for both highlighting and removing
document.addEventListener('mouseup', function(e) {
  // Only act when Ctrl (Windows/Linux) or Cmd (Mac) is held down
  if (e.ctrlKey || e.metaKey) {
    if (e.target.classList.contains('text-highlighter-yellow')) {
      // If clicking on existing highlight, remove it
      removeHighlight(e.target);
    } else {
      // If clicking on regular text (and text is selected), highlight it
      highlightSelectedText();
    }
  }
});

// Wait for page content to fully load before restoring highlights
// 500ms delay ensures dynamic content has time to render
setTimeout(restoreHighlights, 500);