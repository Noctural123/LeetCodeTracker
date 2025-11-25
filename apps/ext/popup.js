document.addEventListener('DOMContentLoaded', () => {
  const handleInput = document.getElementById('handle');
  const saveBtn = document.getElementById('save');
  const statusDiv = document.getElementById('status');

  // Load saved handle
  chrome.storage.local.get(['user_handle'], (result) => {
    if (result.user_handle) {
      handleInput.value = result.user_handle;
    }
  });

  saveBtn.addEventListener('click', () => {
    const handle = handleInput.value.trim();
    if (handle) {
      chrome.storage.local.set({ user_handle: handle }, () => {
        statusDiv.style.display = 'block';
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 2000);
      });
    }
  });
});
