let currentUrl = window.location.href;
let urlCheckInterval = null;

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

/* ---------------------------------
   Block interactions
---------------------------------- */

function blockEvent(e) {
  const dialog = document.getElementById("auction-dialog");
  if (dialog && dialog.contains(e.target)) return;
  e.stopPropagation();
  e.preventDefault();
}

function installBlockers() {
  // Remove any existing blockers first
  removeBlockers();
  
  blockedEvents.forEach(evt => {
    window.addEventListener(evt, blockEvent, {
      capture: true,
      passive: false
    });
  });
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  
  // Create blank overlay immediately if it doesn't exist
  if (!document.getElementById("auction-overlay")) {
    const overlay = document.createElement("div");
    overlay.id = "auction-overlay";
    overlay.innerHTML = "";
    document.body.appendChild(overlay);
  }
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

async function startAuctionProcess() {
  /* ---------------------------------
     0. Safety Guards
  ---------------------------------- */

  if (window.top !== window.self) return;
  
  // Clean up any existing overlay
  const existingOverlay = document.getElementById("auction-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const fullUrl = window.location.href;
  currentUrl = fullUrl;

  // Install blockers BEFORE querying backend
  installBlockers();

  /* ---------------------------------
     1. Query Backend First
  ---------------------------------- */

  let ownership;
  try {
    const res = await fetch(`http://localhost:8000/query_data?url=${encodeURIComponent(fullUrl)}`, {
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
    console.log("User owns site, no auction needed.");
    removeBlockers();
    const overlay = document.getElementById("auction-overlay");
    if (overlay) overlay.remove();
    return;
  }

  // Case 2: AI owns site
  if (owned_by_ai) {
    window.location.href = "about:blank";
    return;
  }

  // Case 3: Auction required (Both are false)
  try {
    const startRes = await fetch(`http://localhost:8000/start_bid?url=${encodeURIComponent(fullUrl)}`, {
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
    // Blockers already installed, just inject dialog
    injectDialog();
  }

  /* ---------------------------------
     3. Dialog Injection
  ---------------------------------- */

  function injectDialog() {
    const overlay = document.getElementById("auction-overlay");
    if (!overlay) return; // Safety check

    // Truncate URL if too long (keep first 40 and last 20 chars)
    const displayUrl = fullUrl.length > 70 
      ? `${fullUrl.substring(0, 30)}...${fullUrl.substring(fullUrl.length - 10)}`
      : fullUrl;

    // Populate the overlay with dialog content
    overlay.innerHTML = `
      <div id="auction-dialog" role="dialog" aria-modal="true" tabindex="-1">
        <div id="budget-display">Budget: Fetching...</div>
        <h2>Website Access Auction</h2>
        <p>Bid against an AI agent to use <b>${displayUrl}</b>.</p>
        <p>🎤 <strong>SHOUT YOUR BID!</strong> The louder you yell, the higher your bid.</p>

        <div id="decibel-display" style="font-size: 2em; margin: 20px 0; color: #00ff00;">-- dB</div>

        <div class="buttons">
          <button id="bid-btn">🎤 Start Shouting</button>
          <button id="fold-btn">Fold</button>
        </div>

        <p id="status-text"></p>
      </div>
    `;

    const budgetDisplay = document.getElementById("budget-display");
    const decibelDisplay = document.getElementById("decibel-display");
    const bidBtn = document.getElementById("bid-btn");
    const foldBtn = document.getElementById("fold-btn");
    const statusText = document.getElementById("status-text");

    let currentHighestBid = 0;
    let userBudget = 0;
    let audioContext = null;
    let analyser = null;
    let microphone = null;

    // --- Fetch Budget ---
    const fetchBudget = async () => {
      try {
        const res = await fetch("http://localhost:8000/budget");
        const data = await res.json();
        userBudget = data.user_budget;
        console.log(data);
        budgetDisplay.textContent = `Budget: $${userBudget}`;
      } catch (err) {
        console.error("Budget fetch failed:", err);
        budgetDisplay.textContent = "Budget: Unavailable";
      }
    };

    fetchBudget();

    const updateStatus = (msg) => { statusText.textContent = msg; };

    // --- Microphone & Decibel Measurement ---
    async function measureDecibels(durationMs = 3000) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 512;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let maxDecibel = 0;

        return new Promise((resolve) => {
          const startTime = Date.now();
          
          function measure() {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            const decibel = Math.round(average * 0.7); // Scale to reasonable bid range
            
            if (decibel > maxDecibel) {
              maxDecibel = decibel;
            }
            
            decibelDisplay.textContent = `${decibel} dB (Max: ${maxDecibel})`;
            
            if (Date.now() - startTime < durationMs) {
              requestAnimationFrame(measure);
            } else {
              stream.getTracks().forEach(track => track.stop());
              audioContext.close();
              resolve(maxDecibel);
            }
          }
          
          measure();
        });
      } catch (err) {
        console.error("Microphone access error:", err);
        updateStatus("Microphone access denied!");
        return 0;
      }
    }

    bidBtn.onclick = async () => {
      bidBtn.disabled = true;
      updateStatus("🎤 SHOUT NOW! (3 seconds)");
      decibelDisplay.style.color = "#ff0000";
      
      const userBid = await measureDecibels(3000);
      decibelDisplay.style.color = "#00ff00";
      
      const minRequired = currentHighestBid + 10;

      // --- Frontend Validation ---
      if (!userBid || userBid === 0) {
        updateStatus("No sound detected! Try shouting louder.");
        bidBtn.disabled = false;
        return;
      }
      
      if (userBid > userBudget) {
        updateStatus(`Insufficient funds! Your budget is only $${userBudget}. Your shout bid: $${userBid}`);
        bidBtn.disabled = false;
        return;
      }

      if (userBid < minRequired) {
        updateStatus(`Bid too low! Required: $${minRequired}, Your shout: $${userBid}. Auto-folding...`);
        await finalizeAuction(fullUrl, false, 0);
        
        setTimeout(() => {
          removeBlockers();
          window.location.href = "about:blank";
        }, 2000);
        return;
      }

      updateStatus("Agent is thinking...");

      try {
        const res = await fetch(`http://localhost:8000/bid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_bid: userBid })
        });

        const data = await res.json();

        if (data.retry) {
          // Backend says no - let's determine why
          if (userBid > userBudget) {
              updateStatus("Rejected: Bid exceeds current budget.");
          } else {
              updateStatus("Rejected: Someone outbid you while you were shouting!");
          }
          bidBtn.disabled = false;
          return;
        }

        currentHighestBid = data.current_highest_bid;

        if (!data.end) {
          const nextMin = currentHighestBid + 10;
          updateStatus(`Current: $${currentHighestBid} (${data.current_highest_bidder}). Min: $${nextMin}`);
          
          
          bidBtn.disabled = false;
          decibelDisplay.textContent = "-- dB";
        } else {
          updateStatus(`AI Folded! You won with $${currentHighestBid}.`);
          await finalizeAuction(fullUrl, true, currentHighestBid);
          
          setTimeout(() => {
            removeBlockers();
            const overlayElement = document.getElementById("auction-overlay");
            if (overlayElement) overlayElement.remove();
          }, 1500);
        }
      } catch (err) {
        console.error("Bidding error:", err);
        updateStatus("Connection lost.");
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
      await finalizeAuction(fullUrl, false, currentHighestBid); 
      
      setTimeout(() => {
        removeBlockers();
        window.location.href = "about:blank";
      }, 1000);
    };
  }
}

// Monitor URL changes
function monitorUrlChanges() {
  urlCheckInterval = setInterval(() => {
    if (window.location.href !== currentUrl) {
      console.log("URL changed, restarting auction process");
      startAuctionProcess();
    }
  }, 500);
}

// Start the auction process and monitor for URL changes
startAuctionProcess();
monitorUrlChanges();
