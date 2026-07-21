const fs = require('fs');
const path = require('path');
const { Document } = require('@langchain/core/documents');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { HuggingFaceTransformersEmbeddings } = require('@langchain/community/embeddings/hf_transformers');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const config = require('./config');
const { loadCompanyPolicies } = require('./policyLoader');

let embeddingsSingleton = null;
function getEmbeddings() {
  if (!embeddingsSingleton) {
    embeddingsSingleton = new HuggingFaceTransformersEmbeddings({
      model: config.embeddingModel,
    });
  }
  return embeddingsSingleton;
}

/**
 * Converts parsed policy records into LangChain Documents. Each policy is
 * embedded as a single chunk (policies are short and self-contained), but we
 * still run them through a splitter as a safety net for any unusually long
 * policy statement.
 */
async function policiesToDocuments(policies) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 80,
  });

  const docs = [];
  for (const p of policies) {
    const pageContent = [
      `${p.id} — ${p.title}`,
      `Category: ${p.category}`,
      `Policy Statement: ${p.statement}`,
      `Authorized Role: ${p.authorizedRole}`,
      `Environment: ${p.environment}`,
      `Consent Required: ${p.consentRequired}`,
    ].join('\n');

    const chunks = await splitter.splitText(pageContent);
    chunks.forEach((chunk, idx) => {
      docs.push(
        new Document({
          pageContent: chunk,
          metadata: {
            policyId: p.id,
            title: p.title,
            category: p.category,
            authorizedRole: p.authorizedRole,
            environment: p.environment,
            consentRequired: p.consentRequired,
            chunkIndex: idx,
          },
        })
      );
    });
  }
  return docs;
}

function storePathFor(slug) {
  return path.join(config.vectorStoreDir, slug);
}

/**
 * Builds a fresh MemoryVectorStore index for a company from its source .docx in-memory.
 */
async function buildIndexForCompany(companyName) {
  const entry = config.companyRegistry[companyName];
  if (!entry) throw new Error(`Unknown company: ${companyName}`);

  console.log(`[vectorStore] Building in-memory index for "${companyName}" from ${entry.sourceFile} ...`);
  const policies = await loadCompanyPolicies(entry.sourceFile);
  const docs = await policiesToDocuments(policies);

  const embeddings = getEmbeddings();
  const store = await MemoryVectorStore.fromDocuments(docs, embeddings);

  console.log(`[vectorStore] Indexed ${policies.length} policies (${docs.length} chunks) in-memory for "${companyName}".`);
  return store;
}

/**
 * Loads a persisted index, or builds one. For MemoryVectorStore, we always build it fresh in memory.
 */
async function loadIndexForCompany(companyName) {
  return buildIndexForCompany(companyName);
}

const storeCache = new Map(); // companyName -> Promise<MemoryVectorStore>

/**
 * Returns a ready-to-query vector store for the given company, building or
 * loading it on first access and caching the result for the process lifetime.
 */
function getStoreForCompany(companyName) {
  if (!storeCache.has(companyName)) {
    storeCache.set(companyName, loadIndexForCompany(companyName));
  }
  return storeCache.get(companyName);
}

/**
 * Retrieves the top-K most relevant policy chunks for a query, deduplicated
 * by policy ID (a policy may match on more than one chunk).
 */
async function retrievePolicies(companyName, query, k = config.retrievalTopK) {
  const store = await getStoreForCompany(companyName);
  const results = await store.similaritySearchWithScore(query, Math.max(k * 2, k));

  const seen = new Set();
  const deduped = [];
  for (const [doc, score] of results) {
    const id = doc.metadata.policyId;
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push({
      policyId: id,
      title: doc.metadata.title,
      category: doc.metadata.category,
      authorizedRole: doc.metadata.authorizedRole,
      environment: doc.metadata.environment,
      consentRequired: doc.metadata.consentRequired,
      content: doc.pageContent,
      relevanceScore: Number((1 - score).toFixed(4)), // cosine distance -> similarity-ish
    });
    if (deduped.length >= k) break;
  }
  return deduped;
}

/**
 * Pre-warms every registered company's index. Call at server startup so the
 * first user request isn't slowed down by index construction.
 */
async function warmAllIndexes() {
  const names = Object.keys(config.companyRegistry);
  for (const name of names) {
    await getStoreForCompany(name);
  }
}

module.exports = {
  getEmbeddings,
  buildIndexForCompany,
  loadIndexForCompany,
  getStoreForCompany,
  retrievePolicies,
  warmAllIndexes,
};
