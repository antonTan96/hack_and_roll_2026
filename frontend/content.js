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

  // Case 3: Auction required (Both are false)
  try {
    const startRes = await fetch(`http://localhost:8000/start_bid/${hostname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "omit"
    });

    if (startRes.ok) {
      startAuction();
    } else {
      console.error("Failed to initialize auction on backend");
      return;
    }
  } catch (err) {
    console.error("Error starting auction:", err);
  }

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

        <div class="buttons">
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
    
    let currentHighestBid = 0; // Track the auction state locally
    const updateStatus = (msg) => { statusText.textContent = msg; };

    bidBtn.onclick = async () => {
      const userBid = parseInt(bidInput.value, 10);
      const minRequired = currentHighestBid + 10;

      // Validation: Check against the +10 rule
      if (!userBid || userBid < minRequired) {
        updateStatus(`Bid must be at least ${minRequired}.`);
        return;
      }

      // UI Feedback
      bidInput.disabled = true;
      bidBtn.disabled = true;
      updateStatus("Agent is thinking...");

      try {
        const res = await fetch(`http://localhost:8000/bid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_bid: userBid, hostname: hostname })
        });

        const data = await res.json();

        if (data.retry) {
          updateStatus("Bid rejected by server. Try a higher amount.");
          bidInput.disabled = false;
          bidBtn.disabled = false;
          return;
        }

        // Update our local tracking with the latest bid from server
        currentHighestBid = data.current_highest_bid;

        if (!data.end) {
          // AI counter-bid occurred (or user bid was accepted and AI is still in)
          const nextMin = currentHighestBid + 10;
          updateStatus(`Current bid: ${currentHighestBid} (${data.current_highest_bidder}). Min next bid: ${nextMin}`);
          
          bidInput.disabled = false;
          bidBtn.disabled = false;
          bidInput.value = ""; 
          bidInput.focus();
        } else {
          // AI Folded
          updateStatus(`AI Folded! You won with ${currentHighestBid}.`);
          await finalizeAuction(hostname, true, currentHighestBid);
          
          setTimeout(() => {
            removeBlockers();
            overlay.remove();
          }, 1500);
        }
      } catch (err) {
        console.error("Bidding error:", err);
        updateStatus("Connection lost.");
        bidInput.disabled = false;
        bidBtn.disabled = false;
      }
    };

    const finalizeAuction = async (host, winner, bid) => {
      try {
        await fetch(`http://localhost:8000/fold`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: winner,
            hostname: host,
            winning_bid: bid
          })
        });
      } catch (err) {
        console.error("Finalization failed:", err);
      }
    };

    foldBtn.onclick = async () => {
      updateStatus("You folded. Access denied.");
      // If user folds, the winner is 'ai' (or however your backend tracks it)
      await finalizeAuction(hostname, false, 0); 
      
      setTimeout(() => {
        removeBlockers();
        window.location.href = "about:blank";
      }, 1000);
    };
  }
})();
