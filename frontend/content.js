(async function () {
  /* ---------------------------------
     0. Safety Guards
  ---------------------------------- */

  if (window.top !== window.self) return;
  if (document.getElementById("auction-overlay")) return;

  const hostname = window.location.hostname;

  /* ---------------------------------
     1. Query Backend First
  ---------------------------------- */

  let ownership;
  try {
    const res = await fetch(`http://localhost:8000/query_data/${hostname}`, {
      method: "GET",
      credentials: "omit"
    });

    if (!res.ok) {
      console.error("Backend query failed");
      return; // fail open for hackathon safety
    }

    ownership = await res.json();
  } catch (err) {
    console.error("Error querying backend:", err);
    return; // fail open
  }

  const { owned_by_user, owned_by_ai } = ownership;

  // Case 1: User already owns site
  if (owned_by_user) {
    return;
  }

  // Case 2: AI owns site
  if (owned_by_ai) {
    window.location.href = "about:blank";
    return;
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

  // Case 3: Auction required
  startAuction();

  /* ---------------------------------
     2. Auction Logic
  ---------------------------------- */

  function startAuction() {
    installBlockers();
    injectDialog();
  }

  /* ---------------------------------
     3. Global Event Blocking (Modal)
  ---------------------------------- */

  function blockEvent(e) {
    const dialog = document.getElementById("auction-dialog");

    if (dialog && dialog.contains(e.target)) return;

    e.stopPropagation();
    e.preventDefault();
  }

  function installBlockers() {
    blockedEvents.forEach(evt => {
      window.addEventListener(evt, blockEvent, {
        capture: true,
        passive: false
      });
    });

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function removeBlockers() {
    blockedEvents.forEach(evt => {
      window.removeEventListener(evt, blockEvent, {
        capture: true,
        passive: false
      });
    });

    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  /* ---------------------------------
     4. Dialog Injection
  ---------------------------------- */

  function injectDialog() {
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
        <p>Bid against an AI agent to use <b>${hostname}</b>.</p>

        <input
          type="number"
          id="bid-input"
          placeholder="Enter your bid"
        />

        <div style="display:flex; gap:8px; justify-content:center;">
          <button id="bid-btn">Place Bid</button>
          <button id="fold-btn">Fold</button>
        </div>

        <p id="status-text"></p>
      </div>
    `;

    document.body.appendChild(overlay);

    const dialog = document.getElementById("auction-dialog");
    const bidInput = document.getElementById("bid-input");
    const bidBtn = document.getElementById("bid-btn");
    const foldBtn = document.getElementById("fold-btn");
    const statusText = document.getElementById("status-text");

    dialog.focus();
    bidInput.focus();

    /* Focus trap */
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

    /* -----------------------------
       5. Button Handlers
    ------------------------------ */

    bidBtn.onclick = async () => {
      const bid = bidInput.value;

      if (!bid || Number(bid) <= 0) {
        statusText.textContent = "Please enter a valid bid.";
        return;
      }

      bidInput.disabled = true;
      bidBtn.disabled = true;
      foldBtn.disabled = true;

      statusText.textContent = "Submitting bid...";

      // 🔗 Replace with real backend call
      // const res = await fetch(`/submit_bid/${hostname}`, {...})

      setTimeout(() => {
        const userWon = true; // mock result

        if (userWon) {
          statusText.textContent = "You won the auction! Access granted.";
          setTimeout(() => {
            removeBlockers();
            overlay.remove();
          }, 800);
        } else {
          statusText.textContent = "You lost the auction.";
          setTimeout(() => {
            removeBlockers();
            window.location.href = "about:blank";
          }, 800);
        }
      }, 1200);
    };

    foldBtn.onclick = () => {
      statusText.textContent = "You folded. Access denied.";
      setTimeout(() => {
        removeBlockers();
        window.location.href = "about:blank";
      }, 500);
    };
  }
})();
