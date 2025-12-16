# Unit Test Agent - VS Code Extension

## Architecture Overview

This is a **VS Code Chat Participant extension** that generates Flutter/Dart unit tests following the PETS (Prepare, Execute, Test, Share) standard. The extension uses a **modular standards system** where testing rules are stored as markdown files and loaded dynamically based on user configuration.

### Core Components

- **`src/extension.ts`**: Chat participant registration, model selection (priority: sonnet > gpt-5 > gpt-4o > gemini > gpt-4), and request handling
- **`src/standards.ts`**: StandardsManager that loads markdown files from `/resources` and extracts specific sections
- **`src/config.ts`**: ConfigManager that reads `.unit-test-agent.config.json` from user's workspace
- **`src/prompts.ts`**: Dynamic prompt builders that inject loaded standards into system prompts
- **`resources/*.md`**: Testing standards (testing-standards.md, rlv_pets.md, redux-standards.md, etc.)

### Data Flow

1. Extension activates → ConfigManager loads `.unit-test-agent.config.json`
2. StandardsManager loads only enabled standards from `/resources` based on config
3. User invokes `@unit-test` or `@unit-test /review` in Copilot chat
4. Extension builds context by combining standards, workspace info (builders), and user's code
5. Prompts constructed via `buildPetsSystemPrompt()` or `buildPetsReviewPrompt()`
6. Language model selected via `pickModel()` using configured priority
7. Response streamed back to chat

## Key Patterns

### Standards Loading Strategy

Standards are **selectively loaded** to optimize context size:

```typescript
// In extension.ts activation
const enabledStandards = configManager.getEnabledStandards(); // ['testing', 'pets']
for (const standardName of enabledStandards) {
    await standardsManager.loadStandard(`${standardName}-standards.md`, standardName);
}
```

Section extraction further reduces context:

```typescript
// ConfigManager provides specific sections per standard
includeSections: {
    testing: ['Configuración General', 'Patrón AAA', 'Gestión de Mocks'],
    pets: ['Arquitectura', 'Estructura del Módulo']
}
```

### Prompt Building Pattern

Prompts are **assembled dynamically** from loaded standards:

```typescript
const testingContext = buildPetsTestingContext(standardsManager, includeSections);
const systemPrompt = buildPetsSystemPrompt(testingContext);
const workspaceInfo = await getProjectContext(); // Scans for builders in test/builders/

const messages = [
    vscode.LanguageModelChatMessage.User(systemPrompt),
    vscode.LanguageModelChatMessage.User(workspaceInfo),
    vscode.LanguageModelChatMessage.User(buildUserTaskMessage(fileName, codeContext))
];
```

### Configuration System

User config in `.unit-test-agent.config.json` overrides defaults via deep merge in `ConfigManager.mergeConfig()`. The extension searches for config files at workspace root on activation.

## Development Workflow

### Build & Watch

```bash
npm run watch  # Compiles TypeScript with --watch flag
```

Or use the pre-configured VS Code task: `npm: watch` (default build task)

### Testing

```bash
npm run pretest  # Compiles + lints
npm test         # Runs @vscode/test-cli
```

Tests are in `src/test/extension.test.ts` using Mocha.

### Packaging

```bash
npm run vscode:prepublish  # Production compile
```

## Extension-Specific Conventions

### Chat Participant Registration

Participant ID in `package.json` (`"id": "unit-test-agent"`) MUST match the ID in `vscode.chat.createChatParticipant()`:

```typescript
const agent = vscode.chat.createChatParticipant('unit-test-agent', handler);
```

Users invoke with `@unit-test` (the `"name"` field, not the `id`).

### Error Handling for Streams

Check `token.isCancellationRequested` before writing to stream to prevent "write after end" errors (see bottom of extension.ts handler).

### Standards File Naming

Convention: `{standard-name}-standards.md` in `/resources`. Exception: PETS is `rlv_pets.md` for legacy reasons. Map in config:

```json
"enabled": ["testing", "pets"]  // Maps to testing-standards.md, rlv_pets.md
```

### Workspace Context Scanning

`getProjectContext()` in extension.ts scans for Flutter-specific files:
- Checks for `pubspec.yaml` to confirm Flutter project
- Lists builders in `test/builders/**/*.dart` to inform test generation

## Integration Points

- **VS Code Language Model API**: `vscode.lm.selectChatModels({ vendor: 'copilot' })`
- **Chat API**: `vscode.chat.createChatParticipant()` with streaming response handler
- **Workspace API**: `vscode.workspace.findFiles()` for builder/pubspec discovery

## Common Tasks

### Adding a New Standard

1. Create `resources/my-new-standard.md`
2. Update default config in `src/config.ts`:
   ```typescript
   enabled: ['testing', 'pets', 'my-new']
   ```
3. Add mapping if filename differs from pattern

### Adding a New Command

1. Add to `package.json` under `chatParticipants[0].commands`
2. Handle in extension.ts: `if (request.command === 'my-command')`

### Changing Model Priority

Update `ConfigManager.DEFAULT_CONFIG.modelPreference.priority` or user's config file
