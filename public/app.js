document.addEventListener("DOMContentLoaded", () => {
  const inputField = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const responseOutput = document.getElementById("response-output");
  const startNewConversationButton = document.getElementById("start-new-conversation-button");
  const expressionImage = document.getElementById("expression-image");
  const errorMessage = document.getElementById("error-message");
  const errorText = errorMessage.querySelector(".error-text");
  let conversation = [];
  const defaultExpression = "happy";
  const errorExpression = "error";

  // Set initial image
  expressionImage.src = `png/${defaultExpression}.png`;

  let currentAudio = null;

  /**
   * Adjusts the height of the textarea based on its content.
   */
  function adjustTextareaHeight() {
    inputField.style.height = 'auto';
    const containerRect = inputField.parentElement.getBoundingClientRect();
    const availableHeight = window.innerHeight - 160 - containerRect.top;
    const desiredHeight = inputField.scrollHeight;
    if (desiredHeight > availableHeight) {
      inputField.style.height = `${availableHeight}px`;
      inputField.style.overflowY = 'auto';
    } else {
      inputField.style.height = `${desiredHeight}px`;
      inputField.style.overflowY = 'hidden';
    }
  }

  /**
   * Updates the expression image with a fade transition.
   * @param {string} expression - The expression to display.
   */
  function updateImage(expression) {
    const newSrc = `png/${expression}.png`;
    if (expressionImage.src.endsWith(`${expression}.png`)) return;

    const newImage = expressionImage.cloneNode(true);
    newImage.src = newSrc;
    Object.assign(newImage.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity: '0',
      transition: 'opacity 1s ease'
    });
    expressionImage.style.transition = 'opacity 1s ease';
    expressionImage.parentNode.appendChild(newImage);
    requestAnimationFrame(() => {
      expressionImage.style.opacity = '0';
      newImage.style.opacity = '1';
    });

    newImage.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'opacity') {
        expressionImage.style.transition = 'none';
        expressionImage.src = newSrc;
        expressionImage.style.opacity = '1';
        newImage.remove();
      }
    }, { once: true });
  }

  /**
   * Fetches the appropriate expression based on the last assistant message.
   * @returns {Promise<string>} - The chosen expression.
   */
  async function getExpressionForAssistantMessage() {
    const lastAssistantMessage = [...conversation].reverse().find(msg => msg.role === "assistant");
    if (!lastAssistantMessage) return defaultExpression;

    try {
      const response = await fetch("/expression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation })
      });

      if (!response.ok) {
        console.error("Error calling /expression endpoint.");
        return defaultExpression;
      }

      const { expression = defaultExpression } = await response.json();
      return expression;
    } catch {
      return defaultExpression;
    }
  }

  /**
   * Positions the talk bubble within the viewport.
   * @param {HTMLElement} talkBubble - The talk bubble element to position.
   * @param {number} arrowFixedTop - The fixed top position for the arrow in the viewport.
   * @param {number} minBubbleTop - The minimum top position for the bubble.
   */
  function positionTalkBubble(talkBubble, arrowFixedTop = window.innerHeight * 0.4, minBubbleTop = 50) {
    const talkBubbleArrow = talkBubble.querySelector(".talk-bubble-arrow");
    if (!talkBubbleArrow) return;

    const isMobile = window.innerWidth <= 768;

    talkBubble.style.visibility = 'hidden';
    talkBubble.style.display = 'block';

    if (isMobile) {
      // On mobile, simplify positioning 
      talkBubble.style.top = 'auto';
      talkBubble.style.bottom = 'auto';
      talkBubble.style.left = 'auto';
    } else {
      const bubbleRect = talkBubble.getBoundingClientRect();
      let bubbleTop = arrowFixedTop - (bubbleRect.height / 2);
      bubbleTop = Math.max(bubbleTop, minBubbleTop);
      talkBubble.style.top = `${bubbleTop}px`;
      
      const arrowTopInsideBubble = arrowFixedTop - bubbleTop;
      talkBubbleArrow.style.top = `${arrowTopInsideBubble}px`;
      talkBubbleArrow.style.transform = "translateY(-50%)";
    }
  
    talkBubble.style.visibility = 'visible';
  }

  /**
   * Displays an error message.
   * @param {string} message - The error message to display.
   */
  function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove("hidden");
  }

  /**
   * Hides the error message.
   */
  function hideError() {
    errorMessage.classList.add("hidden");
  }

  // Adjust textarea height on input and hide error
  inputField.addEventListener('input', () => {
    adjustTextareaHeight();
    hideError();
  });

  /**
   * Handles the send button click event.
   */
  sendButton.addEventListener("click", async () => {
    const userText = inputField.value.trim();
    if (!userText) {
      showError("Please enter some text before sending.");
      return;
    }

    hideError();
    conversation.push({ role: "user", content: userText });

    // Show loading animation
    responseOutput.innerHTML = `
      <div class="talk-bubble loading">
        <div class="talk-bubble-arrow"></div>
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="tube-line"></div>
    `;
    const loadingBubble = responseOutput.querySelector(".talk-bubble");
    positionTalkBubble(loadingBubble);
    inputField.value = "";
    adjustTextareaHeight();

    try {
      // Get assistant reply
      const response = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation })
      });

      if (!response.ok) {
        showError("Error: Unable to retrieve response.");
        return;
      }

      const { completion: assistantReply = "No response." } = await response.json();
      conversation.push({ role: "assistant", content: assistantReply });

      // Check the assistant's reply
      const checkResponse = await fetch("/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation })
      });

      if (!checkResponse.ok) {
        showError("Error: Unable to check message.");
        return;
      }

      const { status } = await checkResponse.json();
      let finalAssistantReply = assistantReply;
      let finalExpression = "happy";

      if (status === "inappropriate") {
        finalAssistantReply = "Uh-oh, that's inappropriate! I cannot assist with inappropriate requests.";
        conversation[conversation.length - 1].content = finalAssistantReply;
        finalExpression = "error";
      } else if (status === "gibberish") {
        finalAssistantReply = "Whoa, did a cat walk over your keyboard? Could you rephrase that?";
        conversation[conversation.length - 1].content = finalAssistantReply;
        finalExpression = "error";
      } else {
        finalExpression = await getExpressionForAssistantMessage();
      }

      // Update UI with the final response
      responseOutput.innerHTML = `
        <div class="talk-bubble">
          <div class="talk-bubble-arrow"></div>
          <div class="talk-bubble-content">${finalAssistantReply}</div>
          <button class="sound-button hidden">
            <img src="sound.svg" alt="Play Audio" />
          </button>
        </div>
        <div class="tube-line"></div>
      `;
      const finalBubble = responseOutput.querySelector(".talk-bubble");
      positionTalkBubble(finalBubble);
      updateImage(finalExpression);

      if (conversation.length > 1) {
        startNewConversationButton.style.display = "inline-block";
      }

      // Fetch TTS audio
      const ttsResponse = await fetch("/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalAssistantReply })
      });

      if (!ttsResponse.ok) {
        console.error("Error: Unable to retrieve audio from TTS.");
        return;
      }

      const { audio: audioBase64 } = await ttsResponse.json();
      if (!audioBase64) {
        console.error("Error: No audio data received from TTS.");
        return;
      }

      const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const soundButton = finalBubble.querySelector(".sound-button");
      soundButton.classList.remove("hidden");
      finalBubble.classList.add("with-sound-button");

      soundButton.addEventListener("click", () => {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        currentAudio = new Audio(audioUrl);
        currentAudio.play();
        currentAudio.addEventListener('ended', () => {
          currentAudio = null;
        });
      });
    } catch (error) {
      console.error(error);
      showError("Error: Unable to connect to server.");
    }
  });

  /**
   * Handles the start new conversation button click event.
   */
  startNewConversationButton.addEventListener("click", () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    conversation = [];
    responseOutput.textContent = "";
    inputField.value = "";
    adjustTextareaHeight();
    startNewConversationButton.style.display = "none";
    updateImage(defaultExpression);
    hideError();
  });

  // Initial setup
  adjustTextareaHeight();

  window.addEventListener('resize', () => {
    const currentBubble = responseOutput.querySelector(".talk-bubble");
    if (currentBubble) {
      positionTalkBubble(currentBubble);
    }
  });
});

















  
