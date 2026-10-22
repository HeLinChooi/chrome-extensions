const apiKey = document.getElementById('apiKey');
const model = document.getElementById('model');
const status = document.getElementById('status');

chrome.storage.local.get(['apiKey', 'model']).then((saved) => {
  apiKey.value = saved.apiKey ?? '';
  model.value = saved.model ?? '';
});

document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.local.set({ apiKey: apiKey.value.trim(), model: model.value.trim() });
  status.textContent = 'Saved.';
});
