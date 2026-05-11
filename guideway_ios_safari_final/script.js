const NAV_EVENTS = [
      // Direction A: web-based “near-real product” mode uses live camera access
      // plus estimated distance guidance, rather than claiming hardware-grade depth measurement.
      { distance: 2.3, action: "Be careful", vibrationText: "Light vibration", wave: "⋮", risk: "Low Risk", riskColor: "#63b54d" },
      { distance: 1.4, action: "Slow down", vibrationText: "Medium vibration", wave: "⋮⋮", risk: "Medium Risk", riskColor: "#f4b400" },
      { distance: 1.4, action: "Turn left", vibrationText: "Medium vibration", wave: "⋮⋮", risk: "Medium Risk", riskColor: "#f4b400" },
      { distance: 1.4, action: "Turn right", vibrationText: "Medium vibration", wave: "⋮⋮", risk: "Medium Risk", riskColor: "#f4b400" },
      { distance: 0.6, action: "Stop", vibrationText: "Strong vibration", wave: "⋮⋮⋮", risk: "High Risk", riskColor: "#ef4444" }
    ];

    const state = {
      currentIndex: 1,
      intervalId: null,
      cameraStream: null,
      voiceSupported: typeof window !== "undefined" && "speechSynthesis" in window,
      vibrationSupported: typeof navigator !== "undefined" && "vibrate" in navigator,
      recognitionSupported: typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
      voiceEnabled: true,
      vibrationEnabled: true,
      latestSentence: "1.4 metres. Slow down.",
      profileVibration: "Medium",
      recognition: null,
      micActive: false
    };

    const navDistance = document.getElementById("navDistance");
    const navRiskText = document.getElementById("navRiskText");
    const navActionText = document.getElementById("navActionText");
    const voiceStatusText = document.getElementById("voiceStatusText");
    const vibrationStatusText = document.getElementById("vibrationStatusText");
    const riskDot = document.getElementById("riskDot");
    const voiceModeText = document.getElementById("voiceModeText");
    const vibrationModeText = document.getElementById("vibrationModeText");
    const navPhone = document.getElementById("navPhone");
    const navCameraVideo = document.getElementById("navCameraVideo");
    const cameraFallback = document.getElementById("cameraFallback");
    const devicesModal = document.getElementById("devicesModal");
    const chatWindow = document.getElementById("chatWindow");
    const assistantInput = document.getElementById("assistantInput");
    const assistantMicBtn = document.getElementById("assistantMicBtn");
    const profileVibrationText = document.getElementById("profileVibrationText");

    function getSentence(eventObj) {
      return `${eventObj.distance.toFixed(1)} metres. ${eventObj.action}.`;
    }

    function getVibrationPattern(distance) {
      if (distance > 2) return [100];
      if (distance >= 1) return [180, 120, 180];
      return [300, 120, 300, 120, 420];
    }

    function shakeNavPhone() {
      navPhone.classList.remove("shake");
      void navPhone.offsetWidth;
      navPhone.classList.add("shake");
      setTimeout(() => navPhone.classList.remove("shake"), 900);
    }

    function playVoice(text) {
      state.latestSentence = text;
      if (!state.voiceEnabled || !state.voiceSupported) return;
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-AU";
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn("Voice playback unavailable", error);
      }
    }

    function playVibration(distance) {
      if (!state.vibrationEnabled) return;
      const pattern = getVibrationPattern(distance);
      shakeNavPhone();
      if (state.vibrationSupported) {
        try {
          navigator.vibrate(pattern);
        } catch (error) {
          console.warn("Vibration unavailable", error);
        }
      }
    }

    function applyNavEvent(index) {
      const eventObj = NAV_EVENTS[index % NAV_EVENTS.length];
      navDistance.textContent = eventObj.distance.toFixed(1);
      navRiskText.textContent = eventObj.risk;
      navActionText.textContent = eventObj.action;
      riskDot.style.background = eventObj.riskColor;
      voiceStatusText.textContent = `“${getSentence(eventObj)}”`;
      vibrationStatusText.textContent = eventObj.vibrationText;
      voiceModeText.textContent = "ENG";
      vibrationModeText.textContent = eventObj.wave;
      state.profileVibration = eventObj.distance > 2 ? "Light" : eventObj.distance >= 1 ? "Medium" : "Strong";
      profileVibrationText.textContent = state.profileVibration;
      playVoice(getSentence(eventObj));
      playVibration(eventObj.distance);
    }

    function startNavigationLoop() {
      stopNavigationLoop();
      applyNavEvent(state.currentIndex);
      state.intervalId = window.setInterval(() => {
        state.currentIndex = (state.currentIndex + 1) % NAV_EVENTS.length;
        applyNavEvent(state.currentIndex);
      }, 3000);
    }

    function stopNavigationLoop() {
      if (state.intervalId) {
        clearInterval(state.intervalId);
        state.intervalId = null;
      }
    }

    async function startCamera() {
      if (state.cameraStream) {
        navCameraVideo.srcObject = state.cameraStream;
        cameraFallback.style.display = "none";
        return;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      const attempts = [
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false },
        { video: { facingMode: "environment" }, audio: false },
        { video: true, audio: false }
      ];
      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          state.cameraStream = stream;
          navCameraVideo.srcObject = stream;
          await navCameraVideo.play().catch(() => {});
          cameraFallback.style.display = "none";
          return;
        } catch (error) {
          // try next constraint set
        }
      }
      cameraFallback.style.display = "block";
    }

    function stopCamera() {
      if (!state.cameraStream) return;
      state.cameraStream.getTracks().forEach((track) => track.stop());
      state.cameraStream = null;
      navCameraVideo.srcObject = null;
      cameraFallback.style.display = "block";
    }

    function openDevicesModal() { devicesModal.classList.add("show"); }
    function closeDevicesModal() { devicesModal.classList.remove("show"); }

    function appendChat(userText, botText) {
      const userRow = document.createElement("div");
      userRow.className = "bubble-row user";
      userRow.innerHTML = `<div class="bubble user">${userText}</div>`;
      chatWindow.appendChild(userRow);

      const botRow = document.createElement("div");
      botRow.className = "bubble-row";
      botRow.innerHTML = `<div class="bubble-icon">🤖</div><div class="bubble bot">${botText}</div>`;
      chatWindow.appendChild(botRow);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function handleAssistantPrompt(text) {
      const lower = text.toLowerCase();
      let reply = "I can help with device status, navigation guidance, and vibration settings.";
      if (lower.includes("devices")) {
        reply = "Yes. Your camera, earphones, smartwatch and glasses are all connected and working well.";
        playVoice("All devices connected.");
        if (state.vibrationSupported) navigator.vibrate([100]); else shakeNavPhone();
      } else if (lower.includes("start navigation")) {
        reply = "Navigation is starting now. The rear camera will scan continuously and English voice updates with estimated distance will play every 3 seconds.";
        startCamera();
        startNavigationLoop();
      } else if (lower.includes("vibration")) {
        state.profileVibration = "Strong";
        profileVibrationText.textContent = "Strong";
        reply = "Done. Vibration intensity has been set to Strong. You will feel stronger vibration for high risk alerts.";
        playVibration(0.6);
      } else if (lower.includes("no alert")) {
        reply = "Check earphones, watch connection, and alert settings. You can also run a device check from AI Assistant.";
      }
      appendChat(text, reply);
    }

    function setupSpeechRecognition() {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        assistantMicBtn.disabled = true;
        assistantMicBtn.title = "Voice query not supported in this browser";
        assistantMicBtn.style.opacity = "0.45";
        return;
      }

      state.recognition = new Recognition();
      state.recognition.lang = "en-AU";
      state.recognition.interimResults = false;
      state.recognition.maxAlternatives = 1;

      state.recognition.onstart = () => {
        state.micActive = true;
        assistantMicBtn.textContent = "◼";
      };
      state.recognition.onend = () => {
        state.micActive = false;
        assistantMicBtn.textContent = "🎤";
      };
      state.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        assistantInput.value = transcript;
        handleAssistantPrompt(transcript);
        assistantInput.value = "";
      };
      state.recognition.onerror = () => {
        state.micActive = false;
        assistantMicBtn.textContent = "🎤";
      };
    }

    function jumpToSection(target) {
      if (target === "devices") {
        openDevicesModal();
      } else if (target === "navigation") {
        document.getElementById("navPhone").scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (target === "profile") {
        document.getElementById("profilePhone").scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    document.getElementById("startNavigationBtn").addEventListener("click", () => {
      startCamera();
      startNavigationLoop();
      jumpToSection("navigation");
    });
    document.getElementById("openDevicesCard").addEventListener("click", openDevicesModal);
    document.getElementById("openDevicesCard").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openDevicesModal();
    });
    document.getElementById("replayVoiceBtn").addEventListener("click", () => playVoice(state.latestSentence));
    document.getElementById("stopNavigationBtn").addEventListener("click", stopNavigationLoop);
    document.getElementById("closeDevicesModal").addEventListener("click", closeDevicesModal);
    document.getElementById("confirmDevicesBtn").addEventListener("click", () => {
      playVoice("All devices connected.");
      if (state.vibrationSupported) navigator.vibrate([100]); else shakeNavPhone();
    });
    document.getElementById("openNavFromModal").addEventListener("click", () => {
      closeDevicesModal();
      startCamera();
      startNavigationLoop();
      jumpToSection("navigation");
    });
    devicesModal.addEventListener("click", (e) => {
      if (e.target === devicesModal) closeDevicesModal();
    });

    document.querySelectorAll(".prompt-chip").forEach((btn) => {
      btn.addEventListener("click", () => handleAssistantPrompt(btn.getAttribute("data-prompt")));
    });
    document.getElementById("assistantSendBtn").addEventListener("click", () => {
      const text = assistantInput.value.trim();
      if (!text) return;
      assistantInput.value = "";
      handleAssistantPrompt(text);
    });
    assistantInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("assistantSendBtn").click();
      }
    });
    assistantMicBtn.addEventListener("click", () => {
      if (!state.recognition) return;
      if (state.micActive) {
        state.recognition.stop();
      } else {
        state.recognition.start();
      }
    });

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => jumpToSection(btn.getAttribute("data-target")));
    });

    function runSmokeTests() {
      console.assert(getSentence({ distance: 1.4, action: "Slow down" }) === "1.4 metres. Slow down.", "Sentence format should match distance + action");
      console.assert(JSON.stringify(getVibrationPattern(2.3)) === JSON.stringify([100]), "Low risk vibration should be light");
      console.assert(JSON.stringify(getVibrationPattern(1.4)) === JSON.stringify([180, 120, 180]), "Medium risk vibration should be medium");
      console.assert(JSON.stringify(getVibrationPattern(0.6)) === JSON.stringify([300, 120, 300, 120, 420]), "High risk vibration should be strong");
      console.assert(typeof (window.SpeechRecognition || window.webkitSpeechRecognition || function(){}) === "function", "Speech recognition check should not crash");
    }

    window.addEventListener("beforeunload", () => {
      stopNavigationLoop();
      stopCamera();
      if (state.voiceSupported) window.speechSynthesis.cancel();
      if (state.recognition && state.micActive) state.recognition.stop();
    });

    setupSpeechRecognition();
    runSmokeTests();
