(function () {
  /* ---------------------------------
     0. Safety Guards
  ---------------------------------- */

  // Only run in top-level frame
  if (window.top !== window.self) return;

  // Prevent double injection
  if (document.getElementById("auction-overlay")) return;

  /* ---------------------------------
     1. Global Event Blocking (Modal)
  ---------------------------------- */

  function blockEvent(e) {
    const dialog = document.getElementById("auction-dialog");

    // Allow interaction inside the dialog
    if (dialog && dialog.contains(e.target)) {
      return;
    }

    // Block everything else
    e.stopPropagation();
    e.preventDefault();
  }

  const blockedEvents = [
    "click",
    "mousedown",
    "mouseup",
    "keydown",
    "keypress",
    "keyup",
    "wheel",
    "touchstart",
    "touchmove",
    "contextmenu"
  ];

  blockedEvents.forEach(evt => {
    window.addEventListener(evt, blockEvent, {
        capture: true,
        passive: false
    });
  });

  // Disable scrolling
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  /* ---------------------------------
     2. Overlay + Dialog Injection
  ---------------------------------- */

  const overlay = document.createElement("div");
  overlay.id = "auction-overlay";

  overlay.innerHTML = `
    <div
      id="auction-dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <h2>Website Access Auction</h2>
      <p>Bid against an AI agent to use this website.</p>

      <input
        type="number"
        id="bid-input"
        placeholder="Enter your bid"
      />

      <button id="bid-btn">Place Bid</button>

      <p id="status-text"></p>
    </div>
  `;

  document.body.appendChild(overlay);

  const dialog = document.getElementById("auction-dialog");
  const bidInput = document.getElementById("bid-input");
  const bidBtn = document.getElementById("bid-btn");
  const statusText = document.getElementById("status-text");

  // Force initial focus
  dialog.focus();
  bidInput.focus();

  /* ---------------------------------
     3. Focus Trap (UX Polish)
  ---------------------------------- */

  window.addEventListener(
    "focusin",
    (e) => {
      if (!dialog.contains(e.target)) {
        e.stopPropagation();
        dialog.focus();
      }
    },
    true
  );

  /* ---------------------------------
     4. Auction Logic (Mock)
  ---------------------------------- */

  bidBtn.onclick = () => {
    const bid = bidInput.value;

    if (!bid || Number(bid) <= 0) {
      statusText.textContent = "Please enter a valid bid.";
      return;
    }

    bidInput.disabled = true;
    bidBtn.disabled = true;

    statusText.textContent = "Auction in progress...";

    // Simulate AI bidding delay
    setTimeout(() => {
      const userWon = true; // Replace with backend response

      if (userWon) {
        statusText.textContent = "You won the auction! Access granted.";
        setTimeout(unlockPage, 800);
      } else {
        statusText.textContent = "You lost the auction. Access denied.";
        // Optional: window.close();
      }
    }, 1500);
  };

  /* ---------------------------------
     5. Unlock Page
  ---------------------------------- */

  function unlockPage() {
    overlay.remove();

    // Re-enable scrolling
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    // Remove global blockers
    blockedEvents.forEach(evt =>
      window.removeEventListener(evt, blockEvent, true)
    );
  }
})();
