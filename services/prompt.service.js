// services/PromptService.js

import prompts from '../assets/data/prompt-templates.js';

/**
 * Service for handling prompt generation based on user data and predefined templates.
 */
class PromptService {
    /**
     * Generates the appropriate system prompt based on user input.
     *
     * @param {Object} data - The user data and prompt information.
     * @param {string} data.firstname - The first name of the user.
     * @param {string} data.username - The username of the user.
     * @param {string|number} data.idUser - The unique identifier of the user.
     * @param {string} data.prompt - The user input prompt (e.g., '/start').
     * @returns {string} The generated system prompt.
     * @throws {Error} Throws an error if input validation fails or prompt generation encounters an issue.
     */
    static handleSystemPrompt(data) {
        try {
            // Validate input data
            this.validateInputData(data);

            const { firstname, username, idUser, prompt } = data;
            const replaceValues = [
                firstname,
                username,
                idUser,
                new Date().toISOString(), // Use ISO string for standardized date format
            ];

            let systemPrompt = '';

            // Determine which prompt template to use based on the user input
            if (prompt === '/start') {
                systemPrompt = this.generateSystemPrompt('startMainIntro', ...replaceValues);
            } else {
                systemPrompt = this.generateSystemPrompt('mainPrompt', ...replaceValues);
            }

            return systemPrompt;
        } catch (error) {
            console.error('Error in handleSystemPrompt:', error);
            throw error; // Rethrow the error after logging
        }
    }

    /**
     * Generates a system prompt by replacing placeholders with actual values.
     *
     * @param {string} promptName - The key name of the prompt template.
     * @param {...string|number} replaceValues - The values to replace placeholders in the template.
     * @returns {string} The generated prompt with replaced values.
     * @throws {Error} Throws an error if the prompt template is not found.
     */
    static generateSystemPrompt(promptName, ...replaceValues) {
        try {
            // Check if the prompt template exists
            if (!prompts.hasOwnProperty(promptName)) {
                throw new Error(`Prompt "${promptName}" not found.`);
            }

            let promptTemplate = prompts[promptName];

            // Replace placeholders in the template with actual values
            replaceValues.forEach((value, index) => {
                const placeholder = `{${index}}`;
                if (promptTemplate.includes(placeholder)) {
                    promptTemplate = promptTemplate.replace(placeholder, value);
                } else {
                    console.warn(`Placeholder ${placeholder} not found in prompt "${promptName}".`);
                }
            });

            return promptTemplate;
        } catch (error) {
            console.error('Error in generateSystemPrompt:', error);
            throw error; // Rethrow the error after logging
        }
    }

    /**
     * Validates the input data for generating prompts.
     *
     * @param {Object} data - The user data and prompt information.
     * @throws {Error} Throws an error if any required field is missing or invalid.
     */
    static validateInputData(data) {
        if (typeof data !== 'object' || data === null) {
            throw new Error('Input data must be a non-null object.');
        }

        const { firstname, username, idUser, prompt } = data;

        if (!firstname || typeof firstname !== 'string') {
            throw new Error('Invalid or missing "firstname" in input data.');
        }

        if (!username || typeof username !== 'string') {
            throw new Error('Invalid or missing "username" in input data.');
        }

        if (!idUser || (typeof idUser !== 'string' && typeof idUser !== 'number')) {
            throw new Error('Invalid or missing "idUser" in input data.');
        }

        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Invalid or missing "prompt" in input data.');
        }
    }
}

export default PromptService;
