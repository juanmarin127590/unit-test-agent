# 🔄 Guía de Migración - Arquitectura Modular

## 📊 Resumen de Cambios

Tu agente ha sido refactorizado de una arquitectura monolítica a una arquitectura modular y extensible.

### Antes (v1.0)
```
extension.ts
  ├── PETS_SYSTEM_PROMPT (constante hardcodeada)
  ├── PETS_REVIEW_PROMPT (constante hardcodeada)
  └── handler (lógica fija)
```

### Después (v2.0)
```
extension.ts
  ├── StandardsManager (carga estándares dinámicamente)
  ├── ConfigManager (lee configuración del usuario)
  └── handler (usa prompts dinámicos)

prompts.ts
  ├── buildPetsSystemPrompt(context) → Dinámico
  └── buildPetsReviewPrompt(context) → Dinámico

standards.ts
  ├── StandardsManager (carga .md files)
  ├── buildPetsTestingContext() → Construye contexto
  └── buildReviewContext() → Construye contexto

config.ts
  └── ConfigManager (lee .unit-test-agent.config.json)

resources/
  ├── testing-standards.md
  ├── rlv_pets.md
  └── ... (estándares separados)
```

---

## 🔧 Cambios Técnicos Detallados

### 1. `src/prompts.ts`

**ANTES:**
```typescript
export const PETS_SYSTEM_PROMPT = `
You are an expert...
// Todo el contenido hardcodeado
`;

export const PETS_REVIEW_PROMPT = `...`;
```

**DESPUÉS:**
```typescript
export function buildPetsSystemPrompt(standardsContext: string): string {
    return `
You are an expert...

${standardsContext}  // ← Contenido dinámico desde archivos

CORE INSTRUCTIONS:
...
`;
}

export function buildPetsReviewPrompt(reviewContext: string): string { ... }
```

**Impacto:**
- ✅ Prompts ahora son funciones, no constantes
- ✅ Reciben contexto dinámico de estándares cargados
- ✅ Separación clara entre instrucciones core y estándares

---

### 2. `src/extension.ts`

**ANTES:**
```typescript
// Línea 132-138
let systemPrompt = PETS_SYSTEM_PROMPT;
let userTask = `The code to unit test is...`;

if (request.command === 'review') {
    systemPrompt = PETS_REVIEW_PROMPT;
    userTask = `Please REVIEW...`;
}
```

**DESPUÉS:**
```typescript
// Cargar configuración
await configManager.loadConfig();

// Cargar estándares habilitados
for (const standardName of configManager.getEnabledStandards()) {
    await standardsManager.loadStandard(fileName, standardName);
}

// Construir prompts dinámicamente
const testingContext = buildPetsTestingContext(standardsManager, includeSections);
const systemPrompt = buildPetsSystemPrompt(testingContext);
```

**Impacto:**
- ✅ Carga lazy de estándares (solo una vez)
- ✅ Configuración del usuario determina qué se carga
- ✅ Prompts se construyen con contenido real de archivos `.md`

---

### 3. Nuevos Archivos Creados

#### `src/standards.ts`
**Propósito:** Gestor centralizado de estándares de codificación

**Funciones principales:**
```typescript
class StandardsManager {
  loadStandard(fileName, name)         // Cargar desde /resources
  loadCustomStandard(fileName, name)   // Cargar desde workspace
  getStandardContent(name)             // Obtener contenido
  extractSections(name, sections)      // Extraer secciones específicas
  listStandards()                      // Listar cargados
}

buildPetsTestingContext(manager, sections?)  // Contexto para generación
buildReviewContext(manager, sections?)       // Contexto para revisión
```

#### `src/config.ts`
**Propósito:** Gestor de configuración del usuario

**Funciones principales:**
```typescript
class ConfigManager {
  loadConfig()                       // Leer .unit-test-agent.config.json
  getEnabledStandards()              // Estándares a cargar
  getCustomStandardFiles()           // Archivos custom
  getIncludeSections(standardName)   // Secciones específicas
  shouldAutoLoadWorkspaceStandards() // Auto-carga
  isVerboseLogging()                 // Debugging
}
```

#### Archivos de Configuración
- `.unit-test-agent.config.json` - Configuración del usuario
- `.unit-test-agent.schema.json` - Schema para validación
- `.unit-test-standards.example.md` - Plantilla de estándar custom

---

## 🎯 Ventajas de la Nueva Arquitectura

### 1. **Mantenibilidad**
**Antes:** Para cambiar una regla PETS, tenías que modificar `prompts.ts`:
```typescript
export const PETS_SYSTEM_PROMPT = `
  ...
  - Mocks must be centralized. // ← Cambiar esto requiere editar código
  ...
`;
```

**Después:** Solo editas `resources/testing-standards.md`:
```markdown
## Gestión de Mocks
- ❌ NO crear archivos `.mocks.dart` dispersos
- ✅ SÍ usar `test/mocks/mocks.dart` centralizado
```
Sin tocar TypeScript.

---

### 2. **Extensibilidad**
**Antes:** Agregar un nuevo estándar (ej: Firebase) requería:
1. Modificar `prompts.ts`
2. Agregar constantes
3. Actualizar lógica de construcción

**Después:** Solo:
1. Crear `resources/firebase-standards.md`
2. Habilitar en config:
```json
{ "standards": { "enabled": ["testing", "pets", "firebase"] } }
```

---

### 3. **Configurabilidad por Proyecto**
Cada proyecto puede tener su propia configuración:

**Proyecto A** (Microservicio básico):
```json
{
  "standards": { "enabled": ["testing"] },
  "modelPreference": { "priority": ["gpt-4"] }
}
```

**Proyecto B** (SuperApp completa):
```json
{
  "standards": { 
    "enabled": ["testing", "pets", "redux", "repository"],
    "customFiles": [{ "path": "docs/superapp-rules.md", "name": "superapp" }]
  },
  "modelPreference": { "priority": ["sonnet"] }
}
```

---

### 4. **Optimización de Contexto**
**Antes:** Todo el contenido se incluía siempre → prompts enormes

**Después:** Control fino sobre qué incluir:
```json
{
  "standards": {
    "includeSections": {
      "testing": ["Patrón AAA", "Mocks"],  // Solo estas secciones
      "pets": ["Arquitectura"]             // No toda la documentación
    }
  }
}
```

Resultado: **Prompts más pequeños = Menor costo + Mayor precisión**

---

## 📋 Checklist de Migración

### Para Desarrolladores de la Extensión

- [x] `src/standards.ts` creado
- [x] `src/config.ts` creado
- [x] `src/prompts.ts` refactorizado (constantes → funciones)
- [x] `src/extension.ts` actualizado (integración de managers)
- [x] Archivos de configuración creados
- [x] Documentación actualizada (README, ARCHITECTURE)
- [x] No hay errores de compilación

### Para Usuarios de la Extensión

- [ ] (Opcional) Crear `.unit-test-agent.config.json` en tu workspace
- [ ] (Opcional) Crear estándares custom (`.unit-test-standards.md`)
- [ ] (Opcional) Ajustar `includeSections` para optimizar contexto
- [ ] Probar generación de tests con `@unit-test` en el chat de Copilot
- [ ] Probar revisión de tests con `@unit-test /review` en el chat de Copilot

---

## 🚀 Próximos Pasos Recomendados

### Corto Plazo
1. **Probar la extensión** con diferentes configuraciones
2. **Crear estándares custom** para tus proyectos específicos
3. **Optimizar `includeSections`** para reducir tamaño de prompts
4. **Compartir configuración** con tu equipo via git

### Medio Plazo
1. Agregar comando de VS Code para crear/editar estándares custom
2. UI visual para gestionar configuración (sin editar JSON)
3. Validador de estándares (linter para archivos `.md`)
4. Plantillas para diferentes frameworks (Firebase, GraphQL, etc.)

### Largo Plazo
1. Métricas de cumplimiento de estándares
2. Integración con CI/CD
3. Marketplace de estándares comunitarios
4. Auto-generación de estándares desde código existente

---

## ❓ FAQ

### ¿Mis estándares antiguos siguen funcionando?
**Sí.** Si no creas `.unit-test-agent.config.json`, el agente usa configuración por defecto que carga `testing` y `pets`, similar al comportamiento anterior.

### ¿Puedo mezclar estándares built-in y custom?
**Sí.**
```json
{
  "standards": {
    "enabled": ["testing", "pets"],
    "customFiles": [{ "path": "docs/my-rules.md", "name": "custom" }]
  }
}
```

### ¿Qué pasa si un archivo de estándar no existe?
El agente registra un warning en consola y continúa con los demás. No rompe la funcionalidad.

### ¿Puedo desactivar todos los estándares?
**Sí**, pero no es recomendado:
```json
{ "standards": { "enabled": [] } }
```
El agente funcionará solo con las instrucciones core hardcodeadas.

### ¿Cómo sé qué estándares se cargaron?
Habilita logging verbose:
```json
{ "behavior": { "verboseLogging": true } }
```
Revisa Developer Tools → Console.

---

## 📞 Soporte

Si encuentras problemas durante la migración:

1. Verifica que no haya errores de compilación: `npm run compile`
2. Revisa logs con `verboseLogging: true`
3. Compara con `.unit-test-agent.config.json` de ejemplo
4. Abre un issue con detalles del error

---

**¡Felicitaciones!** Tu agente ahora es modular, extensible y configurable. 🎉
