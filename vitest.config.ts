import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80,
      },
      include: ['src/**/*.ts'],
      exclude: [
        'dist/**',
        'node_modules/**',
        'tests/**',
        'coverage/**',
        '.workspace/**',
        'src/index.ts',
        'src/cli/index.ts',
        'src/cli/ui/**',
        'src/studio/**',
        'src/core/client/types.ts',
        'src/core/workflow/pipeline-step.ts',
        'vitest.config.ts',
      ],
    },
  },
});
