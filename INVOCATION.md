# 💬 Guía de Invocación del Agente

## 🎯 Cómo Invocar el Agente

Tu agente se invoca desde el **Chat de GitHub Copilot** en VS Code usando el nombre del participante.

### Nombre del Participante

Según la configuración en `package.json`:

```json
{
  "chatParticipants": [
    {
      "id": "unit-test-agent",           // ID interno
      "name": "unit-test",                // ← Este es el que usa el usuario
      "fullName": "SuperApp Test Generator (PETS)",
      "description": "Genera pruebas unitarias bajo el estándar PETS."
    }
  ]
}
```

El usuario invoca el agente escribiendo: **`@unit-test`**

## 📝 Comandos Disponibles

### 1. Generar Tests (Comando por Defecto)

```
@unit-test
```

**Pasos:**
1. Abre un archivo Dart (middleware, widget, repository, etc.)
2. Abre el chat de Copilot (Ctrl+Shift+I / Cmd+Shift+I)
3. Escribe `@unit-test`
4. El agente generará tests completos siguiendo PETS

**Captura de pantalla:**
```
@unit-test
@unit-test /generate  ← También funciona explícitamente
```

### 2. Revisar Tests

```
@unit-test /review
```

**Pasos:**
1. Abre un archivo de test existente (`*_test.dart`)
2. Abre el chat de Copilot
3. Escribe `@unit-test /review`
4. El agente auditará los tests y sugerirá mejoras

## 🔧 Configuración Técnica

### package.json

El participante del chat se define en `package.json`:

```json
"contributes": {
  "chatParticipants": [
    {
      "id": "unit-test-agent",
      "name": "unit-test",              // ← Nombre que aparece en el chat
      "fullName": "SuperApp Test Generator (PETS)",
      "description": "Genera pruebas unitarias bajo el estándar PETS.",
      "isSticky": true,
      "commands": [
        {
          "name": "generate",
          "description": "Generates the unit test suite for the selected code."
        },
        {
          "name": "review",
          "description": "Reviews existing unit tests against the PETS standard."
        }
      ]
    }
  ]
}
```

### extension.ts

El agente se registra con el mismo ID:

```typescript
const agent = vscode.chat.createChatParticipant('unit-test-agent', handler);
agent.iconPath = new vscode.ThemeIcon('beaker');
```

**IMPORTANTE:** El ID en `createChatParticipant()` debe coincidir con el `id` en `package.json`.

## 🎨 Apariencia en el Chat

Cuando el usuario escribe `@uni` en el chat, aparecerá:

```
@unit-test
@unit-test /generate
@unit-test /review
```

El autocompletado muestra:
- **Icono:** 🧪 (beaker)
- **Nombre:** unit-test
- **Descripción:** Genera pruebas unitarias bajo el estándar PETS.

## 📊 Flujo de Ejecución

```
Usuario escribe: @unit-test
         ↓
VS Code identifica el participante 'unit-test'
         ↓
Busca el chatParticipant con id='unit-test-agent'
         ↓
Ejecuta el handler registrado en extension.ts
         ↓
Handler carga estándares y genera prompt
         ↓
Modelo de IA (Sonnet/GPT) genera la respuesta
         ↓
Resultado se muestra en el chat
```

## 🔍 Debugging

Si el agente no aparece en el chat:

### 1. Verificar que la extensión esté activa
```bash
# En VS Code, abrir Developer Tools (Cmd+Shift+P → "Toggle Developer Tools")
# En la consola, verificar:
```

### 2. Revisar package.json
Asegurarse de que:
- `"contributes"` → `"chatParticipants"` esté definido
- El `name` sea único (no conflicto con otras extensiones)
- El `id` coincida con el usado en `createChatParticipant()`

### 3. Recargar la extensión
```
Cmd+Shift+P → "Developer: Reload Window"
```

### 4. Verificar logs
En la consola de Developer Tools, buscar:
```
[Extension Host] Activating extension: unit-test-agent
```

## 🆚 Diferencia: ID vs Name

| Atributo | Valor | Uso |
|----------|-------|-----|
| **`id`** | `unit-test-agent` | Identificador interno único |
| **`name`** | `unit-test` | Lo que escribe el usuario: `@unit-test` |
| **`fullName`** | `SuperApp Test Generator (PETS)` | Descripción larga en el UI |

**Regla:** El usuario SIEMPRE usa el `name`, no el `id`.

## 🎯 Ejemplos de Uso

### Generar tests para un middleware

1. Abrir `my_middleware.dart`
2. En el chat:
   ```
   @unit-test
   ```
3. Respuesta:
   ```dart
   import 'package:test/test.dart';
   import 'package:mockito/mockito.dart';
   
   void main() {
     group('MyMiddleware', () {
       test('should dispatch success when repository succeeds', () {
         // ...
       });
     });
   }
   ```

### Revisar tests existentes

1. Abrir `my_middleware_test.dart`
2. En el chat:
   ```
   @unit-test /review
   ```
3. Respuesta:
   ```
   ✅ **Compliant**: El código sigue el estándar PETS.
   
   Sugerencias menores:
   - Considera agregar un test para el caso de error de red
   ```

## 📝 Notas

- **Auto-completado:** VS Code mostrará sugerencias al escribir `@uni`
- **Comandos:** Después de `@unit-test`, puedes añadir `/review` o `/generate`
- **Contexto:** El agente usa el archivo activo en el editor como entrada
- **Streaming:** Las respuestas se muestran en tiempo real (stream)

---

**TIP:** Para probar rápidamente, escribe `@unit-test` en el chat mientras tienes cualquier archivo `.dart` abierto.
