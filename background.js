import { bootstrapBackground } from './connection.js';

bootstrapBackground().catch((error) => {
    console.error('Cannot start background worker.', error);
});
