// One real interaction: copy the email, and say so in a live region rather than
// only changing the button's own label (a screen-reader user needs the feedback).
const copyButton = document.getElementById("copy");
const statusEl = document.getElementById("copy-status");
const email = document.getElementById("email");

copyButton?.addEventListener("click", async () => {
  const text = email?.textContent?.trim() ?? "";
  try {
    await navigator.clipboard.writeText(text);
    if (statusEl) statusEl.textContent = "Email copied.";
  } catch {
    // Clipboard access can be refused; never leave the user guessing.
    if (statusEl) statusEl.textContent = `Copy failed — the address is ${text}`;
  }
});
