document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');

    // Use a relative URL, as the frontend is served from the same origin as the backend.
    const API_URL = '/api/chat';

    /**
     * Appends a message to the chat box and scrolls to the bottom.
     * @param {string} sender - The sender of the message ('user' or 'bot').
     * @param {string} message - The message content.
     * @param {string|null} elementId - An optional ID for the message element.
     * @returns {HTMLElement} The created message element.
     */
    const addMessageToChatBox = (sender, message, elementId = null) => {
        const messageElement = document.createElement('div');
        const contentElement = document.createElement('p');
        contentElement.textContent = message;

        messageElement.classList.add('chat-message', `${sender}-message`);
        if (elementId) {
            messageElement.id = elementId;
        }

        messageElement.appendChild(contentElement);
        chatBox.appendChild(messageElement);

        // Scroll to the latest message
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userMessage = userInput.value.trim();
        if (!userMessage) {
            return; // Don't send empty messages
        }

        // 1. Add user's message to the chat box
        addMessageToChatBox('user', userMessage);
        userInput.value = ''; // Clear the input field

        // 2. Show a temporary "Thinking..." bot message
        const thinkingMessageId = `thinking-${Date.now()}`;
        const thinkingMessageElement = addMessageToChatBox('bot', 'Thinking...', thinkingMessageId);

        try {
            // 3. Send the user's message to the backend
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // The backend expects an array of messages for context
                    messages: [{ role: 'user', content: userMessage }],
                }),
            });

            if (!response.ok) {
                // Handle HTTP errors like 404, 500
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get response from server.');
            }

            const data = await response.json();
            const aiResponse = data.result;

            // 4. Replace "Thinking..." with the AI's reply
            const botMessageContent = thinkingMessageElement.querySelector('p');
            botMessageContent.textContent = aiResponse || 'Sorry, no response received.';

        } catch (error) {
            console.error('Chat Error:', error);
            // 5. Handle fetch errors or other exceptions
            const botMessageContent = thinkingMessageElement.querySelector('p');
            botMessageContent.textContent = error.message || 'An unexpected error occurred.';
        } finally {
            thinkingMessageElement.removeAttribute('id');
        }
    });
});