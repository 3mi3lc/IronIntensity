import type { Config } from 'drizzle-kit';

export default {
    schema: './db/schema.tsx',
    out: './drizzle',
    dialect: 'sqlite',
    driver: 'expo',
} satisfies Config;