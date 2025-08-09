# Text Highlighter Chrome Extension

A simple Chrome extension that allows you to highlight text on any webpage with a persistent yellow highlight that saves across browser sessions.

## Features

- ✨ **One-click highlighting**: Ctrl+click (Cmd+click on Mac) to highlight selected text
- 🎯 **Toggle functionality**: Ctrl+click on highlighted text to remove the highlight
- 💾 **Persistent storage**: Highlights are saved per website and restored when you revisit
- 🔄 **Cross-device sync**: Uses Chrome sync storage to keep highlights across your devices
- 🌐 **Works everywhere**: Compatible with all websites
- 🎨 **Clean design**: Yellow background with black text for optimal readability

## Installation

### Method 1: Load as Unpacked Extension (Developer Mode)

1. **Download or clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** by toggling the switch in the top-right corner
4. **Click "Load unpacked"** and select the folder containing the extension files
5. The extension will now be active on all websites

### Method 2: Manual Installation

1. Create a new folder for the extension
2. Copy these files into the folder:
   - `manifest.json`
   - `content.js`
   - `styles.css`
3. Follow steps 2-5 from Method 1 above

## Usage

### Highlighting Text

1. **Select text** on any webpage by clicking and dragging
2. **Hold Ctrl** (Windows/Linux) or **Cmd** (Mac) and **click** to highlight the selected text
3. The text will be highlighted with a yellow background and black text

### Removing Highlights

1. **Hold Ctrl** (Windows/Linux) or **Cmd** (Mac)
2. **Click on any highlighted text** to remove the highlight

### Persistence

- Highlights are automatically saved and will reappear when you revisit the same webpage
- Each website stores its highlights independently
- Highlights sync across your Chrome browsers when signed into the same Google account

## File Structure

```
chrome-extension-highlight/
├── manifest.json       # Extension configuration and permissions
├── content.js         # Main highlighting functionality
├── styles.css         # Highlight styling (yellow background)
└── README.md          # This documentation
```

## Technical Details

### How It Works

1. **Content Script**: Runs on every webpage and listens for Ctrl+click events
2. **DOM Manipulation**: Creates `<span>` elements with yellow background around selected text
3. **Storage System**: Uses Chrome's `storage.sync` API to save highlight data per website
4. **Restoration**: When a page loads, searches for previously highlighted text and recreates highlights

### Storage Format

Highlights are stored using the website URL as the key:

```javascript
{
  "example.com/page": [
    {
      "id": "highlight_1703123456789_abc123def",
      "text": "highlighted text content",
      "startPath": [2, 1, 0],
      "endPath": [2, 1, 0], 
      "startOffset": 15,
      "endOffset": 35,
      "timestamp": 1703123456789
    }
  ]
}
```

### Browser Compatibility

- **Chrome**: Full support (Manifest V3)
- **Edge**: Full support (Chromium-based)
- **Other Chromium browsers**: Should work with minimal modifications

## Customization

### Changing Highlight Color

Edit `styles.css` to modify the highlight appearance:

```css
.text-highlighter-yellow {
  background-color: #your-color-here;  /* Change highlight color */
  color: #000000 !important;           /* Change text color */
}
```

### Modifying Keyboard Shortcuts

Edit the event listener in `content.js`:

```javascript
// Change from Ctrl+click to Alt+click
if (e.altKey) {
  // highlighting logic
}
```

## Troubleshooting

### Highlights Not Appearing
- Ensure Developer mode is enabled in Chrome extensions
- Check that the extension is loaded and active
- Try refreshing the webpage

### Highlights Not Persisting
- Verify the extension has "storage" permission in `manifest.json`
- Check Chrome's storage quota hasn't been exceeded
- Ensure you're signed into Chrome for sync functionality

### Cannot Remove Highlights
- Make sure to hold Ctrl/Cmd while clicking on highlighted text
- Some websites may interfere with click events - try clicking directly on the highlighted text

## Privacy & Permissions

### Required Permissions

- **`activeTab`**: Access to the current webpage for highlighting functionality
- **`storage`**: Save and retrieve highlights across browser sessions

### Data Handling

- **Local Storage**: All highlight data is stored locally in your browser
- **No External Servers**: No data is sent to external servers
- **Chrome Sync**: Only syncs through Google's secure Chrome sync service
- **Website Specific**: Each website's highlights are stored separately

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have feature requests, please:

1. Check the troubleshooting section above
2. Verify you're using a supported browser
3. Create an issue in the repository with detailed information about the problem