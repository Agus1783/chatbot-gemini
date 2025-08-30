document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');

    // New elements for file handling
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const themeToggle = document.getElementById('theme-toggle');

    // Use a relative URL, as the frontend is served from the same origin as the backend.
    const API_URL = '/api/chat';

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

    // --- Initial Welcome Message ---
    addMessageToChatBox('bot', 'Hello Everyone, Welcome to My ChatBot. Can I help you?');

    // --- Theme Handling Logic ---
    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Apply saved theme or system preference on load
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        setTheme(savedTheme);
    } else if (prefersDark) {
        setTheme('dark');
    } else {
        setTheme('light'); // Default
    }

    // --- File Handling Logic ---
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            fileName.textContent = file.name;
            filePreview.style.display = 'flex';
        }
    });

    removeFileBtn.addEventListener('click', () => {
        fileInput.value = ''; // Clear the file input's value
        filePreview.style.display = 'none'; // Hide the preview
    });



    // --- Form Submission Logic ---
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        let userMessage = userInput.value.trim();
        const file = fileInput.files[0];

        // Guard against empty submission (no text and no file)
        if (!userMessage && !file) {
            return;
        }

        // Determine the prompt to send to the API. Use a default if only a file is present.
        const promptForApi = (file && !userMessage) ? "Jelaskan informasi yang ada pada file ini" : userMessage;

        // Add the user's message to the chat box, including a file indicator if present.
        // This logic ensures the default prompt is NOT shown in the UI.
        let displayMessage = userMessage;
        if (file) {
            // If there's a user message, append the file name. Otherwise, just show the file name.
            displayMessage = userMessage ? `${userMessage} [File: ${file.name}]` : `[File: ${file.name}]`;
        }
        addMessageToChatBox('user', displayMessage);

        // Clear inputs for the next message
        userInput.value = '';
        removeFileBtn.click(); // Programmatically click the remove button to reset the file input UI

        const thinkingMessageId = `thinking-${Date.now()}`;
        const thinkingMessageElement = addMessageToChatBox('bot', 'Thinking...', thinkingMessageId);

        // Use FormData to send both text and file data
        const formData = new FormData();
        formData.append('prompt', promptForApi);
        if (file) {
            formData.append('file', file);
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                // Let the browser set the 'Content-Type' header for FormData
                body: formData,
            });

            if (!response.ok) {
                let errorMessage = `Failed to get response. Status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || JSON.stringify(errorData);
                } catch (e) {
                    console.warn("Could not parse server error response as JSON.");
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            thinkingMessageElement.querySelector('p').textContent = data.result || 'Sorry, no response received.';

        } catch (error) {
            console.error('Chat Error:', error);
            thinkingMessageElement.querySelector('p').textContent = error.message || 'An unexpected error occurred.';
        } finally {
            thinkingMessageElement.removeAttribute('id');
        }
    });
});