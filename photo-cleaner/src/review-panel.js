/**
 * The review panel: one card per photo marked "delete", with the photo kept
 * instead beside it. Unticked cards are kept. The button sends only the ticked
 * photos on, through `onConfirm`.
 *
 * Built with createElement and textContent only: photos.google.com enforces
 * Trusted Types, which would block innerHTML.
 */

const CARD_THUMB = '=w256-h256';
const SMALL_THUMB = '=w96-h96';

function el(tag, style, text) {
  const node = document.createElement(tag);
  if (style) node.style.cssText = style;
  if (text) node.textContent = text;
  return node;
}

/** A thumbnail that opens the full photo in a new tab. */
function photoLink(item, size, style) {
  const link = el('a');
  link.href = `https://photos.google.com/photo/${item.mediaKey}`;
  link.target = '_blank';
  link.title = new Date(item.timestamp).toLocaleString('en-SG');
  const img = el('img', style);
  img.src = item.thumb + size;
  link.append(img);
  return link;
}

function card(result) {
  const box = el('label', 'display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer');
  box.append(photoLink(result.item, CARD_THUMB, 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px'));
  if (result.betterItem) {
    const row = el('div', 'display:flex;align-items:center;gap:6px;font-size:12px;color:#555', 'instead keep:');
    row.append(photoLink(result.betterItem, SMALL_THUMB, 'width:48px;height:48px;object-fit:cover;border-radius:4px'));
    box.append(row);
  }
  box.append(el('div', 'font-size:13px', result.reason));
  const tick = el('div', 'display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600');
  const checkbox = el('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  tick.append(checkbox, 'delete');
  box.append(tick);
  return { box, checkbox };
}

/**
 * @param {Array} toReview results marked "delete": {item, reason, betterItem}
 * @param {string} albumName
 * @param {(items: Array) => Promise<void>} onConfirm receives the ticked items
 */
export function showReviewPanel(toReview, albumName, onConfirm) {
  document.getElementById('photo-cleaner-panel')?.remove();
  const panel = el('div', 'position:fixed;inset:24px;z-index:99999;display:flex;flex-direction:column;background:#f4f4f4;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.35);font:14px system-ui,sans-serif;color:#222');
  panel.id = 'photo-cleaner-panel';

  const header = el('div', 'display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #ddd;flex-wrap:wrap');
  const title = el('div', 'flex:1;font-weight:600');
  const confirm = el('button', 'padding:8px 14px;border:0;border-radius:6px;background:#1a73e8;color:#fff;font-weight:600;cursor:pointer');
  const close = el('button', 'padding:8px 14px;border:1px solid #bbb;border-radius:6px;background:#fff;cursor:pointer', 'Close');
  header.append(title, confirm, close);

  const grid = el('div', 'flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;align-content:start');
  const cards = toReview.map((result) => ({ result, ...card(result) }));
  grid.append(...cards.map((c) => c.box));

  const ticked = () => cards.filter((c) => c.checkbox.checked);
  const refresh = () => {
    title.textContent = `${toReview.length} photos marked delete. Untick any you want to keep. Click a photo to see it full size.`;
    confirm.textContent = `Put ${ticked().length} ticked photos in "${albumName}"`;
    confirm.disabled = ticked().length === 0;
  };
  grid.addEventListener('change', refresh);
  refresh();

  close.addEventListener('click', () => panel.remove());
  confirm.addEventListener('click', async () => {
    confirm.disabled = true;
    confirm.textContent = 'Adding…';
    await onConfirm(ticked().map((c) => c.result.item));
    title.textContent = `Done. Open "${albumName}" in the Google Photos app, check it, and delete from there.`;
    confirm.remove();
  });

  panel.append(header, grid);
  document.body.append(panel);
}
