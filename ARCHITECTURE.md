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
