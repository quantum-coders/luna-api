import 'dotenv/config';
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';

class ChromaService {

	static client = new ChromaClient({
		path: 'https://chroma.qcdr.io',
		auth: { provider: 'basic', credentials: process.env.CHROMA_SERVER_CREDENTIALS },
	});

	/**
	 * Creates a new collection.
	 * @param {string} name - The name of the collection.
	 * @param {object} metadata - Metadata for the collection.
	 * @returns {Promise<object>} - The created collection.
	 */
	static async createCollection(name, metadata = {}) {
		return await this.client.createCollection({
			name: name,
			metadata: metadata,
		});
	}

	/**
	 * Gets an existing collection.
	 * @param {string} name - The name of the collection.
	 * @returns {Promise<object>} - The retrieved collection.
	 */
	static async getCollection(name) {
		return await this.client.getCollection({
			name: name,
		});
	}

	/**
	 * Gets or creates a collection.
	 * @param {string} name - The name of the collection.
	 * @param {object} metadata - Metadata for the collection.
	 * @returns {Promise<object>} - The got or created collection.
	 */
	static async getOrCreateCollection(name, metadata = {}) {
		return await this.client.getOrCreateCollection({
			name: name,
			metadata: metadata,
		});
	}

	/**
	 * Deletes a collection by name.
	 * @param {string} name - The name of the collection.
	 * @returns {Promise<void>}
	 */
	static async deleteCollection(name) {
		return await this.client.deleteCollection({ name: name });
	}

	/**
	 * Lists all collections.
	 * @returns {Promise<object[]>} - The list of collections.
	 */
	static async listCollections() {
		return await this.client.listCollections();
	}

	/**
	 * Adds documents to a collection, optionally with associated embeddings and metadata.
	 *
	 * @async
	 * @param {object} collection - The collection object.
	 * @param {string[]} documents - Array of text documents to add.
	 * @param {string[]} ids - Array of unique identifiers (must have the same length as `documents`).
	 * @param {number[][]} [embeddings=[]] - Array of embeddings (must have the same length as `documents`). If not provided, the default embedding function will be used.
	 * @param {object[]} [metadatas=[]] - Array of metadata objects (must have the same length as `documents`). If not provided, default empty metadata objects will be used.
	 * @throws {Error} If the input arrays (`documents`, `ids`, and `embeddings`, if provided) do not have the same length.
	 * @returns {Promise<object>} The response from the API after adding documents.
	 */
	static async addDocuments(collection, documents, ids, embeddings = [], metadatas = []) {
		// Input Validation
		if(documents.length !== ids.length || (embeddings.length > 0 && documents.length !== embeddings.length)) {
			throw new Error('Mismatched input lengths: documents, ids, and embeddings (if provided) must have the same length.');
		}

		// Default Metadata Handling
		if(metadatas.length === 0) {
			metadatas = Array(documents.length).fill({});
		}

		// Prepare Document Payload
		const documentPayload = {
			ids,
			documents,
			metadatas,
		};

		if(embeddings.length > 0) {
			documentPayload.embeddings = embeddings;
		}

		// Add Documents
		return await collection.add(documentPayload);
	}

	/**
	 * Upserts documents to a collection with associated metadata and embeddings.
	 *
	 * @async
	 * @param {object} collection - The collection object.
	 * @param {string[]} documents - Array of documents to upsert.
	 * @param {string[]} ids - Array of unique identifiers (same length as documents).
	 * @param {number[][]} [embeddings=[]] - Array of embeddings (same length as documents).
	 * @param {object[]} [metadatas=[]] - Array of metadata objects (same length as documents).
	 * @throws {Error} If documents, ids, embeddings, and metadatas don't have the same length.
	 * @returns {Promise<object>} The response from the API after upserting documents.
	 */
	static async upsertDocuments(
		collection,
		documents,
		ids,
		embeddings = [],
		metadatas = [],
	) {
		// Input Validation
		if(
			documents.length !== ids.length ||
			(embeddings.length > 0 && documents.length !== embeddings.length)
		) {
			throw new Error(
				'Mismatched input lengths: documents, ids, and embeddings (if provided) must have the same length.',
			);
		}

		// Default Metadata Handling
		if(metadatas.length === 0) {
			metadatas = Array(documents.length).fill({});
		}

		// Prepare Document Payload
		const documentPayload = {
			ids,
			documents,
			metadatas,
		};

		if(embeddings.length > 0) {
			documentPayload.embeddings = embeddings;
		}

		// Upsert Documents
		return await collection.upsert(documentPayload);
	}

	/**
	 * Queries a collection.
	 * @param {object} collection - The collection object.
	 * @param {string[]} queryTexts - Array of query texts.
	 * @param {number} [nResults=10] - Number of results to return.
	 * @param {object} [where={}] - Metadata filter.
	 * @param {string[]} [include=["documents", "metadatas", "distances"]] - Fields to include in the results.
	 * @returns {Promise<object>} - The query results.
	 */
	static async queryCollection(collection,
		queryTexts,
		nResults = 10,
		where = {},
		include = [ 'documents', 'metadatas', 'distances' ]) {
		return await collection.query({
			queryTexts: queryTexts,
			nResults: nResults,
			where: where,
			include: include,
		});
	}

	/**
	 * Deletes documents from a collection.
	 * @param {object} collection - The collection object.
	 * @param {string[]} [ids=[]] - Array of document IDs to delete.
	 * @param {object} [where={}] - Metadata filter.
	 * @returns {Promise<object>} - The response from the API.
	 */
	static async deleteDocuments(collection, ids = [], where = {}) {
		return await collection.delete({
			ids: ids,
			where: where,
		});
	}

	/**
	 * Gets documents from a collection.
	 * @param {object} collection - The collection object.
	 * @param {string[]} [ids=[]] - Array of document IDs to get.
	 * @param {object} [where={}] - Metadata filter.
	 * @param {string[]} [include=["documents", "metadatas"]] - Fields to include in the results.
	 * @returns {Promise<object>} - The documents.
	 */
	static async getDocuments(collection, ids = [], where = {}, include = [ 'documents', 'metadatas' ]) {
		return await collection.get({
			ids: ids,
			where: where,
			include: include,
		});
	}

	/**
	 * Peeks into a collection to see a limited number of items.
	 * @param {object} collection - The collection object.
	 * @param {number} [limit=10] - Number of items to peek.
	 * @returns {Promise<object>} - The peek results.
	 */
	static async peekCollection(collection, limit = 10) {
		return await collection.peek({ limit: limit });
	}

	/**
	 * Counts the number of items in a collection.
	 * @param {object} collection - The collection object.
	 * @returns {Promise<number>} - The number of items in the collection.
	 */
	static async countItems(collection) {
		return await collection.count();
	}

	/**
	 * Modifies a collection's metadata or name.
	 * @param {object} collection - The collection object.
	 * @param {string} [newName=null] - New name for the collection.
	 * @param {object} [newMetadata={}] - New metadata for the collection.
	 * @returns {Promise<void>}
	 */
	static async modifyCollection(collection, newName = null, newMetadata = {}) {
		return await collection.modify({
			name: newName,
			metadata: newMetadata,
		});
	}

	/**
	 * Generates embeddings for a list of text documents using a specified embedding model.
	 *
	 * @async
	 * @param {string[]} texts - The list of text documents to embed.
	 * @param {string} [integration="openai"] - The embedding provider to use ("openai" is currently the only supported option).
	 * @param {string} [model="text-embedding-ada-002"] - The specific embedding model to use (defaults to "text-embedding-ada-002" for OpenAI).
	 * @throws {Error} If an invalid integration is specified or there's an issue generating embeddings.
	 * @returns {Promise<number[][]>} A promise that resolves to a two-dimensional array of embeddings, where each inner array represents the embedding vector for a corresponding text document.
	 */
	static async generateEmbeddings(texts, integration = 'openai', model = 'text-embedding-3-small') {
		switch(integration) {
			case 'openai':
				const embeddingFunction = new OpenAIEmbeddingFunction({
					openai_api_key: process.env.OPENAI_API_KEY,
					openai_model: model,
				});
				try {
					return await embeddingFunction.generate(texts);
				} catch(error) {
					throw new Error('Failed to generate embeddings using OpenAI: ' + error.message);
				}
			// Add cases for other embedding providers here in the future (e.g., "cohere", "huggingface")
			default:
				throw new Error(`Unsupported embedding integration: ${ integration }`);
		}
	}

	/**
	 * Creates or retrieves a Chroma collection with an embedding function based on the specified integration.
	 *
	 * @async
	 * @param {string} collectionName - The name of the collection to create or retrieve.
	 * @param {string} [integration="openai"] - The embedding provider to use ("openai" is currently the only supported option).
	 * @param model - The specific embedding model to use (defaults to "text-embedding-3-small" for OpenAI).
	 * @throws {Error} If an invalid integration is specified or there's an issue creating/getting the collection.
	 * @returns {Promise<any>} A promise that resolves to the Chroma collection object.
	 */
	static async createOrGetCollectionUsingEmbeddings(collectionName,
		integration = 'openai',
		model = 'text-embedding-3-small') {
		let embeddingFunction;
		switch(integration.toLowerCase()) {
			case 'openai':
				embeddingFunction = new OpenAIEmbeddingFunction({
					openai_api_key: process.env.OPENAI_API_KEY,
					openai_model: model,
				});
				break;
			default:
				throw new Error(`Unsupported embedding integration: ${ integration }`);
		}

		try {
			return await this.client.getOrCreateCollection({
				name: collectionName,
				embeddingFunction,
			});
		} catch(error) {
			if(error.code === 'already_exists') {
				return await this.client.getCollection({
					name: collectionName,
				});
			} else {
				throw new Error(`Error creating/getting collection: ${ error.message }`);
			}
		}
	}
}

export default ChromaService;