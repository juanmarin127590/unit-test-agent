# 🧪 Unit Test Agent - Flutter/Dart PETS Standard

> Agente inteligente de VS Code para generar y revisar pruebas unitarias en Flutter/Dart siguiendo el estándar PETS (Prepare, Execute, Test, Share) de SuperApp.

## ✨ Características

- 🤖 **Generación Automática de Tests**: Crea tests unitarios completos siguiendo el estándar PETS
- 🔍 **Revisión de Tests**: Audita tests existentes y sugiere mejoras
- 📚 **Arquitectura Modular**: Sistema extensible de estándares de codificación
- ⚙️ **Altamente Configurable**: Personaliza estándares, modelos de IA y comportamiento
- 🎯 **Específico para Flutter**: Optimizado para arquitectura Redux, Middlewares y Widgets
- 🌐 **Soporte Multi-Modelo**: Compatible con Claude Sonnet, GPT-4/5, Gemini

## 🚀 Inicio Rápido

### 1. Instalación
```bash
# Instalar la extensión desde el marketplace de VS Code
# o desde archivo VSIX
```

### 2. Uso Básico

#### Generar Tests
1. Abre un archivo Dart (middleware, widget, repository, etc.)
2. Invoca el agente con `@unit-test` en el chat de Copilot
3. El agente generará tests completos siguiendo PETS

#### Revisar Tests
1. Abre un archivo de test existente (`*_test.dart`)
2. Invoca el agente con `@unit-test /review` en el chat de Copilot
3. Recibe un análisis detallado de cumplimiento con PETS

## 📋 Arquitectura Modular

La extensión utiliza un sistema modular de estándares que separa las reglas de codificación del código de la extensión.

### Estructura
```
unit-test-agent/
├── src/
│   ├── extension.ts      # Lógica principal
│   ├── standards.ts      # Gestor de estándares
│   ├── config.ts         # Gestor de configuración
│   └── prompts.ts        # Construcción dinámica de prompts
├── resources/
│   ├── testing-standards.md
│   ├── rlv_pets.md
│   ├── redux-standards.md
│   └── ...
└── .unit-test-agent.config.json  # Tu configuración
```

### Estándares Incluidos

- **PETS**: Arquitectura y estructura de módulos SuperApp
- **Testing**: Patrón AAA, mocks con Mockito, cobertura
- **Redux**: States, Actions, Reducers, Middlewares
- **Repository**: Patrones de acceso a datos
- **Coding**: Convenciones generales de código

## ⚙️ Configuración

Crea un archivo `.unit-test-agent.config.json` en la raíz de tu workspace:

```json
{
  "standards": {
    "enabled": ["testing", "pets"],
    "customFiles": [
      {
        "path": "docs/my-team-standards.md",
        "name": "team"
      }
    ],
    "includeSections": {
      "testing": ["Configuración General", "Patrón AAA", "Gestión de Mocks"],
      "pets": ["Arquitectura", "Estructura del Módulo"]
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
Estándares a cargar desde `/resources`:
- `"testing"` - Estándares de testing
- `"pets"` - Arquitectura PETS
- `"coding"` - Convenciones de código
- `"redux"` - Patrones Redux
- `"repository"` - Repositorios

#### `standards.customFiles`
Define tus propios estándares:
```json
"customFiles": [
  { "path": "docs/flutter-testing.md", "name": "custom-flutter" }
]
```

#### `standards.includeSections`
Optimiza el contexto incluyendo solo secciones relevantes:
```json
"includeSections": {
  "testing": ["Patrón AAA", "Mocks"]
}
```

#### `modelPreference.priority`
Orden de preferencia para modelos de IA:
```json
"priority": ["sonnet", "gpt-5", "gpt-4o"]
```

#### `behavior`
- `autoLoadWorkspaceStandards`: Busca `.unit-test-standards.md` automáticamente
- `language`: `"es"` o `"en"` para explicaciones
- `verboseLogging`: Habilita logs detallados

## 📖 Estándares Personalizados

### Crear un Estándar Custom

Crea `.unit-test-standards.md` en tu proyecto:

```markdown
# Mis Estándares de Testing

## Convenciones de Nombres
- Tests: `should <action> when <condition>`
- Mocks: prefijo `mock`

## Cobertura Requerida
- Middlewares: 85%
- Widgets: 75%
...
```

El agente lo cargará automáticamente si `autoLoadWorkspaceStandards: true`.

### Compartir Estándares

Incluye `.unit-test-agent.config.json` y tus archivos `.md` en el repo:

```bash
git add .unit-test-agent.config.json
git add docs/team-standards.md
git commit -m "Add team testing standards"
```

## 🎯 Casos de Uso

### 1. Generar Tests para Middleware
```dart
// my_middleware.dart
class MyMiddleware {
  void run(Store store, Action action, NextDispatcher next) {
    // lógica...
  }
}
```
→ `@unit-test` genera tests con `verifyInOrder`, mocks centralizados, etc.

### 2. Revisar Tests de Widget
```dart
// my_widget_test.dart
testWidgets('test', (tester) async { ... });
```
→ `@unit-test /review` verifica PETS compliance

### 3. Equipo con Estándares Propios
Configura `customFiles` para que todos usen los mismos estándares del equipo.

## 🏗️ Arquitectura Técnica

Para detalles completos sobre la arquitectura modular, ver [ARCHITECTURE.md](./ARCHITECTURE.md).

### Componentes Principales

- **StandardsManager**: Carga y gestiona archivos de estándares
- **ConfigManager**: Lee configuración del usuario
- **Prompt Builders**: Construyen prompts dinámicos con estándares
- **Extension Handler**: Orquesta el flujo de generación/revisión

### Flujo de Ejecución

1. Usuario invoca `@unit-test` en el chat de Copilot
2. `ConfigManager` carga `.unit-test-agent.config.json`
3. `StandardsManager` carga estándares habilitados
4. Se construyen prompts dinámicamente con contexto
5. Modelo de IA genera/revisa tests
6. Resultado se muestra en el chat

## 📚 Documentación Adicional

- [Arquitectura Modular](./ARCHITECTURE.md) - Detalles técnicos completos
- [Ejemplo de Estándar Custom](./.unit-test-standards.example.md) - Plantilla para crear tus propios estándares
- [Schema de Configuración](./.unit-test-agent.schema.json) - Validación JSON

## 🛠️ Requisitos

- VS Code 1.80+
- GitHub Copilot (para acceso a modelos de IA)
- Workspace de Flutter/Dart

## 🐛 Debugging

Habilita logging verbose:
```json
{
  "behavior": { "verboseLogging": true }
}
```

Revisa la consola de VS Code (Developer Tools) para ver:
- Estándares cargados
- Configuración aplicada
- Errores de carga

## 📝 Notas de Versión

### 2.0.0 - Arquitectura Modular
- ✨ Sistema modular de estándares
- ⚙️ Configuración JSON completa
- 📚 Soporte para estándares personalizados
- 🔧 Extracción selectiva de secciones
- 🌐 Auto-carga de estándares del workspace

### 1.0.0 - Versión Inicial
- Generación de tests PETS
- Revisión de tests existentes
- Soporte multi-modelo (Sonnet, GPT, Gemini)

## 🤝 Contribución

¿Tienes sugerencias o mejoras? Abre un issue o PR.

## 📄 Licencia

MIT

---

**Desarrollado con ❤️ para Flutter/Dart y el estándar PETS**

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
