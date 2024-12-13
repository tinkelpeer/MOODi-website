document.addEventListener("DOMContentLoaded", () => {
  const inputField = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const responseOutput = document.getElementById("response-output");
  const startNewConversationButton = document.getElementById("start-new-conversation-button");
  const expressionImage = document.getElementById("expression-image");
  const errorMessage = document.getElementById("error-message");
  const errorText = errorMessage.querySelector(".error-text");
  
  // Initialize conversation array to keep track of user and assistant messages
  let conversation = [];
  
  // Define default and error expressions 
  const defaultExpression = "happy";
  const errorExpression = "error";
  
  // Set the initial expression image to the default
  expressionImage.src = `png/${defaultExpression}.png`;
  
  // Variable to keep track of the currently playing audio
  let currentAudio = null;

  /**
   * Adjusts the height of the textarea based on its content.
   */
  function adjustTextareaHeight() {
    // Reset the height to calculate the new height
    inputField.style.height = 'auto';
    
    // Get the bounding rectangle of the parent element
    const containerRect = inputField.parentElement.getBoundingClientRect();
    
    // Calculate the available height within the viewport
    const availableHeight = window.innerHeight - 160 - containerRect.top;
    
    // Determine the desired height based on the scroll height of the textarea
    const desiredHeight = inputField.scrollHeight;
    
    if (desiredHeight > availableHeight) {
      // If desired height exceeds available space, set to maximum and enable scrolling
      inputField.style.height = `${availableHeight}px`;
      inputField.style.overflowY = 'auto';
    } else {
      // Otherwise, set to desired height and hide overflow
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
    
    // If the current image is already the desired expression, do nothing
    if (expressionImage.src.endsWith(`${expression}.png`)) return;
    
    // Clone the current image to create a new image element for the transition
    const newImage = expressionImage.cloneNode(true);
    newImage.src = newSrc;
    
    // Style the new image for positioning and transition effects
    Object.assign(newImage.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity: '0',
      transition: 'opacity 1s ease'
    });
    
    // Apply transition to the existing image
    expressionImage.style.transition = 'opacity 1s ease';
    
    // Append the new image to the parent container
    expressionImage.parentNode.appendChild(newImage);
    
    // Trigger reflow to ensure the transition starts
    requestAnimationFrame(() => {
      expressionImage.style.opacity = '0'; // Fade out the old image
      newImage.style.opacity = '1'; // Fade in the new image
    });
    
    // Once the transition ends, update the src of the original image and remove the new one
    newImage.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'opacity') {
        expressionImage.style.transition = 'none'; 
        expressionImage.src = newSrc; 
        expressionImage.style.opacity = '1'; // Reset opacity
        newImage.remove(); 
      }
    }, { once: true });
  }

  /**
   * Fetches the appropriate expression based on the last assistant message.
   * @returns {Promise<string>} - The chosen expression.
   */
  async function getExpressionForAssistantMessage() {
    // Find the last message from the assistant in the conversation
    const lastAssistantMessage = [...conversation].reverse().find(msg => msg.role === "assistant");
    
    // If no assistant message is found, return the default expression
    if (!lastAssistantMessage) return defaultExpression;
    
    try {
      // Send a request to the /expression endpoint with the current conversation
      const response = await fetch("/expression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation })
      });
      
      // If the response is not OK, log an error and return the default expression
      if (!response.ok) {
        console.error("Error calling /expression endpoint.");
        return defaultExpression;
      }
      
      // Parse the JSON response to get the expression
      const { expression = defaultExpression } = await response.json();
      return expression;
    } catch {
      // In case of any error, return the default expression
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
    // Get the arrow element within the talk bubble
    const talkBubbleArrow = talkBubble.querySelector(".talk-bubble-arrow");
    if (!talkBubbleArrow) return;
    
    // Determine if the device is mobile based on the viewport width
    const isMobile = window.innerWidth <= 768;
    
    // Hide the bubble temporarily to calculate its position
    talkBubble.style.visibility = 'hidden';
    talkBubble.style.display = 'block';
    
    if (isMobile) {
      // On mobile devices, simplify the positioning
      talkBubble.style.top = 'auto';
      talkBubble.style.bottom = 'auto';
      talkBubble.style.left = 'auto';
    } else {
      // Calculate the bubble's top position based on the fixed arrow position
      const bubbleRect = talkBubble.getBoundingClientRect();
      let bubbleTop = arrowFixedTop - (bubbleRect.height / 2);
      bubbleTop = Math.max(bubbleTop, minBubbleTop); // Ensure the bubble doesn't go above the minimum top
      
      // Set the bubble's top position
      talkBubble.style.top = `${bubbleTop}px`;
      
      // Calculate and set the arrow's position within the bubble
      const arrowTopInsideBubble = arrowFixedTop - bubbleTop;
      talkBubbleArrow.style.top = `${arrowTopInsideBubble}px`;
      talkBubbleArrow.style.transform = "translateY(-50%)";
    }
    
    // Make the bubble visible after positioning
    talkBubble.style.visibility = 'visible';
  }

  /**
   * Displays an error message to the user.
   * @param {string} message - The error message to display.
   */
  function showError(message) {
    errorText.textContent = message; 
    errorMessage.classList.remove("hidden"); 
  }

  /**
   * Hides the currently displayed error message.
   */
  function hideError() {
    errorMessage.classList.add("hidden"); 
  }

  // Event listener to adjust textarea height and hide error messages on user input
  inputField.addEventListener('input', () => {
    adjustTextareaHeight();
    hideError();
  });

  /**
   * Handles the send button click event to send user input and receive assistant response.
   */
  sendButton.addEventListener("click", async () => {
    const userText = inputField.value.trim(); // Get and trim user input
    
    // If the input is empty, show an error message and return
    if (!userText) {
      showError("Please enter some text before sending.");
      return;
    }
    
    hideError(); // Hide any existing error messages
    
    // Add the user's message to the conversation
    conversation.push({ role: "user", content: userText });
    
    // Show a loading animation while waiting for the assistant's response
    responseOutput.innerHTML = `
      <div class="talk-bubble loading">
        <div class="talk-bubble-arrow"></div>
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    
    const loadingBubble = responseOutput.querySelector(".talk-bubble");
    positionTalkBubble(loadingBubble); // Position the loading bubble
    
    inputField.value = ""; // Clear the input field
    adjustTextareaHeight(); // Adjust the textarea height after clearing
    
    try {
      // Send the conversation to the /ask endpoint to get the assistant's reply
      const response = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation })
      });
      
      // If the response is not OK, show an error message and exit
      if (!response.ok) {
        showError("Error: Unable to retrieve response.");
        return;
      }
      
      // Parse the assistant's reply from the response
      const { completion: assistantReply = "No response." } = await response.json();
      
      // Add the assistant's reply to the conversation
      conversation.push({ role: "assistant", content: assistantReply });
      
      // Check the appropriateness of the assistant's reply by calling the /check endpoint
      const checkResponse = await fetch("/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation })
      });
      
      // If the check response is not OK, show an error message and exit
      if (!checkResponse.ok) {
        showError("Error: Unable to check message.");
        return;
      }
      
      // Parse the classification status from the check response
      const { status } = await checkResponse.json();
      
      // Initialize the final reply and expression
      let finalAssistantReply = assistantReply; 
      let finalExpression = "happy"; 
      
      // Modify the assistant's reply based on the classification status
      if (status === "inappropriate") {
        finalAssistantReply = "Uh-oh, that's inappropriate! I cannot assist with inappropriate requests.";
        conversation[conversation.length - 1].content = finalAssistantReply; // Update the last message
        finalExpression = "error"; // Set expression to error
      } else if (status === "gibberish") {
        finalAssistantReply = "Whoa, did a cat walk over your keyboard? Could you rephrase that?";
        conversation[conversation.length - 1].content = finalAssistantReply; // Update the last message
        finalExpression = "error"; // Set expression to error
      } else {
        // If appropriate, fetch the appropriate expression based on the assistant's message
        finalExpression = await getExpressionForAssistantMessage();
      }
      
      // Update the UI with the assistant's final reply
      responseOutput.innerHTML = `
        <div class="talk-bubble">
          <div class="talk-bubble-arrow"></div>
          <div class="talk-bubble-content">${finalAssistantReply}</div>
          <button class="sound-button hidden">
            <img src="sound.svg" alt="Play Audio" />
          </button>
        </div>
      `;
      
      const finalBubble = responseOutput.querySelector(".talk-bubble");
      positionTalkBubble(finalBubble); // Position the final talk bubble
      updateImage(finalExpression); // Update the expression image based on the assistant's reply
      
      // If the conversation has more than one message, show the "Start New Conversation" button
      if (conversation.length > 1) {
        startNewConversationButton.style.display = "inline-block";
      }
      
      // Fetch Text-to-Speech (TTS) audio for the assistant's reply
      const ttsResponse = await fetch("/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalAssistantReply })
      });
      
      // If the TTS response is not OK, log an error and exit
      if (!ttsResponse.ok) {
        console.error("Error: Unable to retrieve audio from TTS.");
        return;
      }
      
      // Parse the audio data from the TTS response
      const { audio: audioBase64 } = await ttsResponse.json();
      
      // If no audio data is received, log an error and exit
      if (!audioBase64) {
        console.error("Error: No audio data received from TTS.");
        return;
      }
      
      // Convert the base64 audio data to a Blob and create a URL for it
      const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Get the sound button within the final talk bubble and make it visible
      const soundButton = finalBubble.querySelector(".sound-button");
      soundButton.classList.remove("hidden");
      finalBubble.classList.add("with-sound-button"); // Add a class to adjust styling
      
      // Add a click event listener to the sound button to play the audio
      soundButton.addEventListener("click", () => {
        // If there's already audio playing, pause and reset it
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        
        // Create a new Audio object and play it
        currentAudio = new Audio(audioUrl);
        currentAudio.play();
        
        // When the audio ends, reset the currentAudio variable
        currentAudio.addEventListener('ended', () => {
          currentAudio = null;
        });
      });
    } catch (error) {
      // Log any unexpected errors and show a generic error message
      console.error(error);
      showError("Error: Unable to connect to server.");
    }
  });

  /**
   * Handles the "Start New Conversation" button click event to reset the conversation.
   */
  startNewConversationButton.addEventListener("click", () => {
    // If audio is playing, pause and reset it
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    
    // Reset the conversation array and clear the response output
    conversation = [];
    responseOutput.textContent = "";
    
    // Clear the input field and adjust its height
    inputField.value = "";
    adjustTextareaHeight();
    
    // Hide the "Start New Conversation" button
    startNewConversationButton.style.display = "none";
    
    // Reset the expression image to the default
    updateImage(defaultExpression);
    
    // Hide any existing error messages
    hideError();
  });

  // Initial setup: adjust the textarea height when the page loads
  adjustTextareaHeight();
  
  // Reposition the talk bubble when the window is resized
  window.addEventListener('resize', () => {
    const currentBubble = responseOutput.querySelector(".talk-bubble");
    if (currentBubble) {
      positionTalkBubble(currentBubble);
    }
  });
});

















  
