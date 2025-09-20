const admin = require('firebase-admin');

class FirestoreService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) {
      return this.db;
    }

    try {
      // Initialize Firebase Admin SDK
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
      };

      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Missing Firebase configuration. Check environment variables.');
      }

      // Initialize the app if it hasn't been initialized
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      this.db = admin.firestore();
      this.initialized = true;

      return this.db;
    } catch (error) {
      console.error('❌ Failed to initialize Firestore:', error.message);
      throw error;
    }
  }

  getDb() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.db;
  }

  // Collection reference helper
  getCollection(collectionName) {
    return this.getDb().collection(collectionName);
  }

  // Add document with auto-generated ID
  async addDocument(collectionName, data) {
    try {
      const docRef = await this.getCollection(collectionName).add({
        ...data,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  }

  // Add document with custom ID
  async setDocument(collectionName, docId, data) {
    try {
      await this.getCollection(collectionName).doc(docId).set({
        ...data,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return { id: docId, ...data };
    } catch (error) {
      console.error(`Error setting document in ${collectionName}:`, error);
      throw error;
    }
  }

  // Get document by ID
  async getDocument(collectionName, docId) {
    try {
      const doc = await this.getCollection(collectionName).doc(docId).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  }

  // Update document
  async updateDocument(collectionName, docId, data) {
    try {
      await this.getCollection(collectionName).doc(docId).update({
        ...data,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Document updated in ${collectionName}:`, docId);
      
      // Return the updated document
      return await this.getDocument(collectionName, docId);
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  }

  // Delete document
  async deleteDocument(collectionName, docId) {
    try {
      await this.getCollection(collectionName).doc(docId).delete();
      console.log(`Document deleted from ${collectionName}:`, docId);
      return true;
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  // Query documents
  async queryDocuments(collectionName, queries = [], orderBy = null, limit = null) {
    try {
      let query = this.getCollection(collectionName);

      // Apply where clauses
      queries.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });

      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction || 'desc');
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return documents;
    } catch (error) {
      console.error(`Error querying documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // Count documents (for pagination)
  async countDocuments(collectionName, queries = []) {
    try {
      let query = this.getCollection(collectionName);

      // Apply where clauses
      queries.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });

      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      console.error(`Error counting documents in ${collectionName}:`, error);
      throw error;
    }
  }

  // Batch operations
  batch() {
    return this.getDb().batch();
  }

  // Transaction
  async runTransaction(updateFunction) {
    return await this.getDb().runTransaction(updateFunction);
  }
}

module.exports = new FirestoreService();