const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_ENDPOINT = process.env.DEEPL_ENDPOINT;

class DeeplService {
	/**
	 * Translates an array of text strings to a specified target language.
	 *
	 * @param {string[]} text - An array of strings to be translated.
	 * @param {string} targetLang - The target language code (e.g., 'EN', 'DE').
	 * @param {string|null} [sourceLang=null] - The source language code (e.g., 'EN', 'DE'). Optional.
	 * @returns {Promise<string[]|void>} - A promise that resolves to an array of translated strings or void in case of an error.
	 */
	static async translateText(text, targetLang, sourceLang = null) {
		// verify text is an array of strings
		if (!Array.isArray(text)) {
			console.error('Text must be an array of strings');
			return;
		}
		const url = `${DEEPL_ENDPOINT}/v2/translate`;
		const headers = {
			'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
			'Content-Type': 'application/json',
		};
		const body = JSON.stringify({
			text,
			target_lang: targetLang,
			source_lang: sourceLang,
		});

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: headers,
				body: body,
			});
			const data = await response.json();

			// Normalize all translated texts in the array
			return data.translations.map(translation => translation.text.replace(/\s+/g, ' '));
		} catch (error) {
			console.error('Error translating text:', error);
		}
	}

	/**
	 * Translates a document to a specified target language.
	 *
	 * @param {File} file - The document file to be translated.
	 * @param {string} targetLang - The target language code (e.g., 'EN', 'DE').
	 * @param {string|null} [sourceLang=null] - The source language code (e.g., 'EN', 'DE'). Optional.
	 * @param {string|null} [glossaryId=null] - The glossary ID to use for translation. Optional.
	 * @param {string|null} [outputFormat=null] - The output format for the translated document. Optional.
	 * @returns {Promise<Object|void>} - A promise that resolves to the translation response object or void in case of an error.
	 */
	static async translateDocument(file, targetLang, sourceLang = null, glossaryId = null, outputFormat = null) {
		const url = `${DEEPL_ENDPOINT}/v2/document`;
		const formData = new FormData();
		formData.append('file', file);
		formData.append('target_lang', targetLang);
		if (sourceLang) formData.append('source_lang', sourceLang);
		if (glossaryId) formData.append('glossary_id', glossaryId);
		if (outputFormat) formData.append('output_format', outputFormat);

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
				},
				body: formData,
			});
			return await response.json();
		} catch (error) {
			console.error('Error uploading document:', error);
		}
	}

	/**
	 * Checks the status of a document translation.
	 *
	 * @param {string} documentId - The ID of the document being translated.
	 * @param {string} documentKey - The document key used to track the translation status.
	 * @returns {Promise<Object|void>} - A promise that resolves to the status of the document translation or void in case of an error.
	 */
	static async checkDocumentStatus(documentId, documentKey) {
		const url = `${DEEPL_ENDPOINT}/v2/document/${documentId}`;
		const headers = {
			'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
			'Content-Type': 'application/json',
		};
		const body = JSON.stringify({
			document_key: documentKey,
		});

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: headers,
				body: body,
			});
			return await response.json();
		} catch (error) {
			console.error('Error checking document status:', error);
		}
	}

	/**
	 * Downloads the translated document.
	 *
	 * @param {string} documentId - The ID of the document being translated.
	 * @param {string} documentKey - The document key used to download the translated document.
	 * @returns {Promise<Blob|void>} - A promise that resolves to a Blob containing the translated document or void in case of an error.
	 */
	static async downloadTranslatedDocument(documentId, documentKey) {
		const url = `${DEEPL_ENDPOINT}/v2/document/${documentId}/result`;
		const headers = {
			'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
			'Content-Type': 'application/json',
		};
		const body = JSON.stringify({
			document_key: documentKey,
		});

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: headers,
				body: body,
			});
			return await response.blob();
		} catch (error) {
			console.error('Error downloading translated document:', error);
		}
	}
}

export default DeeplService;
