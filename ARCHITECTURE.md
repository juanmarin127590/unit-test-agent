# 🏗️ Arquitectura Modular del Unit Test Agent

## 📋 Resumen

El agente ha sido refactorizado para soportar una arquitectura modular y extensible que permite:

1. ✅ **Separación de estándares**: Los estándares PETS, testing, Redux, etc., están en archivos `.md` separados
2. ✅ **Configuración flexible**: Sistema de configuración JSON para controlar qué estándares cargar
3. ✅ **Prompts dinámicos**: Los prompts se construyen dinámicamente basándose en los estándares cargados
4. ✅ **Estándares personalizados**: Soporte para definir estándares custom en el workspace del usuario

---

## 🗂️ Estructura del Proyecto

```
unit-test-agent/
├── src/
│   ├── extension.ts          # Activación y lógica principal del agente
│   ├── prompts.ts            # Funciones para construir prompts dinámicos
│   ├── standards.ts          # Gestor de estándares (carga, extracción, contexto)
│   └── config.ts             # Gestor de configuración
├── resources/
│   ├── testing-standards.md  # Estándar de testing (AAA, mocks, etc.)
│   ├── rlv_pets.md          # Estándar PETS (arquitectura SuperApp)
│   ├── coding-standards.md   # Estándares de código
│   ├── redux-standards.md    # Estándares de Redux
│   └── repository-standards.md
├── .unit-test-agent.config.json    # Configuración del usuario
└── .unit-test-agent.schema.json    # Schema JSON para validación
```

---

## ⚙️ Configuración

### Archivo de Configuración

Puedes crear un archivo `.unit-test-agent.config.json` en la raíz de tu workspace para personalizar el comportamiento del agente:

```json
{
  "standards": {
    "enabled": ["testing", "pets"],
    "customFiles": [
      {
        "path": "docs/my-custom-standard.md",
        "name": "custom-testing"
      }
    ],
    "includeSections": {
      "testing": [
        "Configuración General",
        "Patrón AAA",
        "Gestión de Mocks"
      ],
      "pets": [
        "Arquitectura",
        "Estructura del Módulo"
      ]
    }
  },
  "modelPreference": {
    "priority": ["sonnet", "gpt-5", "gpt-4o", "gemini", "gpt-4"]
  },
  "behavior": {
    "autoLoadWorkspaceStandards": true,
    "language": "es",
    "verboseLogging": false
  }
}
```

### Opciones de Configuración

#### `standards.enabled`
Lista de estándares a cargar desde `/resources`. Opciones:
- `"testing"` → `testing-standards.md`
- `"pets"` → `rlv_pets.md`
- `"coding"` → `coding-standards.md`
- `"redux"` → `redux-standards.md`
- `"repository"` → `repository-standards.md`

#### `standards.customFiles`
Permite cargar estándares desde archivos markdown personalizados en tu workspace:

```json
"customFiles": [
  {
    "path": "docs/my-team-standards.md",
    "name": "team-testing"
  }
]
```

#### `standards.includeSections`
Define qué secciones específicas incluir de cada estándar. Útil para optimizar el tamaño del contexto:

```json
"includeSections": {
  "testing": ["Configuración General", "Patrón AAA"],
  "pets": ["Arquitectura"]
}
```

#### `modelPreference.priority`
Define el orden de preferencia para seleccionar modelos de IA:

```json
"priority": ["sonnet", "gpt-5", "gpt-4o", "gemini", "gpt-4"]
```

#### `behavior`
- `autoLoadWorkspaceStandards`: Busca automáticamente archivos como `.unit-test-standards.md` en el workspace
- `language`: Idioma para explicaciones (`"es"` o `"en"`)
- `verboseLogging`: Habilita logging detallado para debugging

---

## 🔧 Cómo Funciona

### 1. Carga de Estándares

Al iniciar, el agente:

1. Lee `.unit-test-agent.config.json` del workspace (si existe)
2. Carga solo los estándares habilitados en `standards.enabled`
3. Carga archivos custom definidos en `standards.customFiles`
4. Si `autoLoadWorkspaceStandards` es `true`, busca archivos como:
   - `.unit-test-standards.md`
   - `.pets-standards.md`
   - `custom-testing-standards.md`

### 2. Construcción de Prompts

Los prompts se construyen dinámicamente:

```typescript
// Para GENERAR tests
const testingContext = buildPetsTestingContext(standardsManager, includeSections);
const systemPrompt = buildPetsSystemPrompt(testingContext);

// Para REVISAR tests
const reviewContext = buildReviewContext(standardsManager, includeSections);
const systemPrompt = buildPetsReviewPrompt(reviewContext);
```

### 3. Extracción de Secciones

El `StandardsManager` puede extraer secciones específicas de archivos markdown:

```typescript
// Extrae solo las secciones "Arquitectura" y "Testing"
const sections = manager.extractSections('pets', ['Arquitectura', 'Testing']);
```

Esto permite incluir solo partes relevantes del estándar, reduciendo el tamaño del contexto.

---

## 📝 Creando Estándares Personalizados

### Opción 1: Archivo en el Workspace

Crea un archivo `.unit-test-standards.md` en la raíz de tu proyecto:

```markdown
# Mis Estándares de Testing

## Configuración Personalizada
- Usar siempre `expect` en lugar de `assert`
- Mocks deben tener el sufijo `Mock`

## Estructura de Tests
Seguir el patrón Given-When-Then...
```

El agente lo detectará automáticamente si `autoLoadWorkspaceStandards: true`.

### Opción 2: Referencia Explícita

En `.unit-test-agent.config.json`:

```json
{
  "standards": {
    "customFiles": [
      {
        "path": "docs/standards/flutter-testing.md",
        "name": "custom-flutter"
      }
    ]
  }
}
```

---

## 🎯 Casos de Uso

### Caso 1: Equipo con Estándares Propios

Un equipo puede definir sus propios estándares y compartirlos via git:

1. Crear `docs/team-standards.md` en el repo
2. Configurar `.unit-test-agent.config.json`:
   ```json
   {
     "standards": {
       "enabled": ["testing"],
       "customFiles": [
         { "path": "docs/team-standards.md", "name": "team" }
       ]
     }
   }
   ```
3. Todos los desarrolladores usan el mismo estándar automáticamente

### Caso 2: Optimizar Tamaño del Contexto

Si los prompts son muy largos, limita las secciones:

```json
{
  "standards": {
    "enabled": ["testing", "pets"],
    "includeSections": {
      "testing": ["Patrón AAA", "Gestión de Mocks"],
      "pets": ["Arquitectura"]
    }
  }
}
```

### Caso 3: Diferentes Configuraciones por Proyecto

Cada proyecto Flutter puede tener su propio `.unit-test-agent.config.json`:

- **Proyecto A**: Solo usa `testing` y `redux`
- **Proyecto B**: Usa `testing`, `pets` y estándares custom de Firebase

---

## 🛠️ API Principal

### `StandardsManager`

```typescript
// Cargar un estándar desde /resources
await manager.loadStandard('testing-standards.md', 'testing');

// Cargar estándar custom del workspace
await manager.loadCustomStandard('.my-standards.md', 'custom');

// Obtener contenido
const content = manager.getStandardContent('testing');

// Extraer secciones específicas
const sections = manager.extractSections('testing', ['Patrón AAA', 'Mocks']);

// Listar estándares cargados
const loaded = manager.listStandards(); // ['testing', 'pets', 'custom']
```

### `ConfigManager`

```typescript
// Cargar configuración
await configManager.loadConfig();

// Obtener estándares habilitados
const enabled = configManager.getEnabledStandards(); // ['testing', 'pets']

// Obtener secciones a incluir
const sections = configManager.getIncludeSections('testing');

// Verificar opciones
const autoLoad = configManager.shouldAutoLoadWorkspaceStandards();
const verbose = configManager.isVerboseLogging();
```

---

## 🚀 Beneficios de la Arquitectura Modular

1. **Mantenibilidad**: Cambiar un estándar no requiere modificar código TypeScript
2. **Extensibilidad**: Agregar nuevos estándares es trivial (solo archivos `.md`)
3. **Configurabilidad**: Cada equipo/proyecto puede personalizar sin tocar la extensión
4. **Optimización**: Control fino sobre qué incluir en el contexto del prompt
5. **Versionamiento**: Los estándares pueden versionarse con git como cualquier otro archivo
6. **Colaboración**: Los equipos pueden compartir estándares custom fácilmente

---

## 📚 Próximos Pasos

- ✅ Sistema modular implementado
- ✅ Configuración JSON completa
- ✅ Soporte para estándares custom
- 🔲 UI para gestionar configuración desde VS Code
- 🔲 Comandos para crear/editar estándares custom
- 🔲 Plantillas de estándares para diferentes frameworks
- 🔲 Validación de estándares con linter
- 🔲 Métricas de cumplimiento de estándares

---

## 🐛 Debugging

Habilita logging verbose en la configuración:

```json
{
  "behavior": {
    "verboseLogging": true
  }
}
```

Luego revisa la consola de VS Code (Developer Tools) para ver:
- Estándares cargados
- Secciones extraídas
- Configuración aplicada


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