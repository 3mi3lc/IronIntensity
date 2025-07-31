// src/lib/id.ts
import { v4 as uuid } from 'uuid';

export const newId = () => uuid();
export const now = () => new Date().toISOString();
