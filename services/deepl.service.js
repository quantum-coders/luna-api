const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_ENDPOINT = process.env.DEEPL_ENDPOINT;

class DeeplService {
	static async translateText(text, targetLang, sourceLang = null) {
		// verify text is an array of strings
		if(!Array.isArray(text)) {
			console.error('Text must be an array of strings');
			return;
		}
		const url = `${ DEEPL_ENDPOINT }/v2/translate`;
		const headers = {
			'Authorization': `DeepL-Auth-Key ${ DEEPL_API_KEY }`,
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
		} catch(error) {
			console.error('Error translating text:', error);
		}
	}

	static async translateDocument(file, targetLang, sourceLang = null, glossaryId = null, outputFormat = null) {
		const url = `${ DEEPL_ENDPOINT }/v2/document`;
		const formData = new FormData();
		formData.append('file', file);
		formData.append('target_lang', targetLang);
		if(sourceLang) formData.append('source_lang', sourceLang);
		if(glossaryId) formData.append('glossary_id', glossaryId);
		if(outputFormat) formData.append('output_format', outputFormat);

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Authorization': `DeepL-Auth-Key ${ DEEPL_API_KEY }`,
				},
				body: formData,
			});
			return await response.json();
		} catch(error) {
			console.error('Error uploading document:', error);
		}
	}

	static async checkDocumentStatus(documentId, documentKey) {
		const url = `${ DEEPL_ENDPOINT }/v2/document/${ documentId }`;
		const headers = {
			'Authorization': `DeepL-Auth-Key ${ DEEPL_API_KEY }`,
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
		} catch(error) {
			console.error('Error checking document status:', error);
		}
	}

	static async downloadTranslatedDocument(documentId, documentKey) {
		const url = `${ DEEPL_ENDPOINT }/v2/document/${ documentId }/result`;
		const headers = {
			'Authorization': `DeepL-Auth-Key ${ DEEPL_API_KEY }`,
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
		} catch(error) {
			console.error('Error downloading translated document:', error);
		}
	}
}

export default DeeplService;