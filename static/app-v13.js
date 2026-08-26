/* Final overview label adjustment for the Python edition. */
const updateImportantLabel = () => {
  document.querySelectorAll('.important-block b').forEach((item) => {
    if (item.textContent.trim() === 'Important dates') item.textContent = 'Important updates';
  });
};
new MutationObserver(updateImportantLabel).observe(document.getElementById('view-root'), { childList: true, subtree: true });
updateImportantLabel();
