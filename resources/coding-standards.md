# 🎯 Estándares de Código - Relevant SuperApp Flutter

Este documento sirve como índice general de todos los estándares de código, mejores prácticas y convenciones para el desarrollo en Flutter dentro del proyecto Relevant SuperApp.

---

## 📚 **Documentación Organizada por Dominio**

La documentación de estándares está organizada en archivos separados por área de responsabilidad para facilitar la navegación y el mantenimiento.

### 🧪 [Testing Standards](./testing-standards.md)
**Estándares y mejores prácticas para pruebas unitarias, middlewares y widgets.**

**Contenido Principal**:
- Configuración de Mocks con Mockito
- Patrón AAA (Arrange-Act-Assert)
- Orden recomendado: Redux State → Middlewares → Widgets
- Tests de Redux States (Reducers)
- Tests de Middlewares (incluye pruebas indirectas de repositorios)
- Tests de Widgets
- Gestión de cobertura de código
- Checklist antes de commit

**Cuándo consultar**:
- Al escribir nuevos tests
- Al revisar cobertura de código
- Durante code reviews de tests
- Al configurar mocks con Mockito

---

### 🔄 [Redux Standards](./redux-standards.md)
**Guía completa para implementar Redux en el proyecto.**

**Contenido Principal**:
- Estados (States) con Freezed
- Acciones (Actions) - públicas e internas
- Reducers y funciones puras
- Middlewares para lógica asíncrona
- Selectores y ViewModels
- Convenciones de nombres
- Patrones de implementación

**Cuándo consultar**:
- Al crear una nueva feature con Redux
- Al implementar estados, acciones o reducers
- Al crear middlewares
- Durante refactoring de código Redux
- Al definir ViewModels

---

### 🗄️ [Repository Standards](./repository-standards.md)
**Arquitectura y patrones para la capa de repositorios.**

**Contenido Principal**:
- Arquitectura de capas (Repository → DataSource → API)
- Interfaces de Repositorio
- Implementaciones con manejo de errores
- DataSources (Remote/Local)
- DTOs y Mappers
- Manejo de Exceptions y Failures
- Cache y persistencia local

**Cuándo consultar**:
- Al crear un nuevo repositorio
- Al implementar DataSources
- Al definir DTOs y mappers
- Al manejar errores de API
- Durante implementación de cache

---

## 🏗️ **Arquitectura General del Proyecto**

### Capas de la Aplicación

```
┌─────────────────────────────────────────────┐
│              UI Layer                       │
│  (Widgets, Components, Pages)               │
└────────────────┬────────────────────────────┘
                 │ dispatch(Action)
┌────────────────▼────────────────────────────┐
│          Redux Layer                        │
│  (States, Actions, Reducers, Middlewares)   │
└────────────────┬────────────────────────────┘
                 │ Either<Failure, Data>
┌────────────────▼────────────────────────────┐
│        Repository Layer                     │
│  (Interfaces, Implementations)              │
└────────────────┬────────────────────────────┘
                 │ DTOs
┌────────────────▼────────────────────────────┐
│        DataSource Layer                     │
│  (Remote, Local, Cache)                     │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│        External Services                    │
│  (REST APIs, GraphQL, Database, Cache)      │
└─────────────────────────────────────────────┘
```

### Flujo de Datos

**Lectura de Datos (Query)**:
```
UI → dispatch(RequestAction) 
   → Middleware 
   → Repository 
   → DataSource 
   → API
   → DataSource (DTO)
   → Repository (Entity) 
   → Middleware → dispatch(SuccessAction) 
   → Reducer 
   → New State 
   → UI
```

**Escritura de Datos (Command)**:
```
UI → dispatch(RequestAction) 
   → Middleware 
   → Repository 
   → DataSource 
   → API
   → Confirmation
   → dispatch(SuccessAction) 
   → Reducer 
   → New State 
   → UI
```

---

## 🎨 **Convenciones de Nomenclatura**

### Archivos y Directorios

| Tipo                 | Convención                    | Ejemplo                                    |
| -------------------- | ----------------------------- | ------------------------------------------ |
| **Feature Folder**   | `snake_case`                  | `check_professional_availability/`         |
| **State**            | `[feature]_state.dart`        | `check_professional_availability_state.dart` |
| **Actions**          | `[feature]_actions.dart`      | `check_professional_availability_actions.dart` |
| **Reducer**          | `[feature]_reducer.dart`      | `check_professional_availability_reducer.dart` |
| **Middleware**       | `[action]_middleware.dart`    | `get_professional_availability_middleware.dart` |
| **Repository**       | `[domain]_repository.dart`    | `coco_repository.dart`                     |
| **DataSource**       | `[domain]_[type]_datasource.dart` | `coco_remote_datasource.dart`         |
| **DTO**              | `[entity]_dto.dart`           | `professional_dto.dart`                    |
| **Mapper**           | `[entity]_mapper.dart`        | `professional_mapper.dart`                 |
| **Entity**           | `[entity].dart`               | `professional.dart`                        |
| **Test**             | `[file]_test.dart`            | `get_professional_availability_middleware_test.dart` |

### Clases y Tipos

| Tipo                 | Convención                    | Ejemplo                                |
| -------------------- | ----------------------------- | -------------------------------------- |
| **State Class**      | `PascalCase[Feature]State`    | `CheckProfessionalAvailabilityState`   |
| **Action Class**     | `PascalCase[Feature]Action`   | `CheckProfessionalAvailabilityAction`  |
| **Request Action**   | `PascalCase[Action]Request`   | `GetProfessionalAvailabilityRequest`   |
| **Reducer Function** | `camelCase[feature]Reducer`   | `checkProfessionalAvailabilityReducer` |
| **Middleware**       | `PascalCase[Action]Middleware` | `GetProfessionalAvailabilityMiddleware` |
| **Repository**       | `PascalCase[Domain]Repository` | `CocoRepository`                       |
| **DTO**              | `PascalCase[Entity]Dto`       | `ProfessionalDto`                      |
| **Mapper**           | `PascalCase[Entity]Mapper`    | `ProfessionalMapper`                   |

### Variables y Métodos

```dart
// Variables - camelCase
final selectedDate = DateTime.now();
final professionalList = <Professional>[];

// Métodos - camelCase con verbos
void loadProfessionals() { }
Future<void> saveProfessional() { }
bool isProfessionalAvailable() { }
Professional? findProfessionalById(int id) { }

// Constantes - lowerCamelCase o UPPER_SNAKE_CASE
const defaultTimeout = 30;
const API_BASE_URL = 'https://api.relevant.com';

// Private members - prefijo underscore
final _privateVariable = 'private';
void _privateMethod() { }
```

---

## 📦 **Estructura de Proyecto**

### Módulos

```
modules/
├── rlv_pets/
│   ├── lib/
│   │   ├── domain/
│   │   │   ├── entities/              # Entidades de dominio
│   │   │   ├── repositories/          # Interfaces de repositorios
│   │   │   ├── middleware/            # Middlewares de dominio
│   │   │   └── use_cases/             # Casos de uso
│   │   │
│   │   ├── data/
│   │   │   ├── repository/            # Implementaciones de repositorios
│   │   │   ├── datasource/            # DataSources (remote/local)
│   │   │   └── models/                # Data Transfer Objects
│   │   │
│   │   ├── redux/
│   │   │   ├── [feature_name]/
│   │   │   │   ├── [feature_name]_state.dart
│   │   │   │   ├── [feature_name]_actions.dart
│   │   │   │   ├── [feature_name]_reducer.dart
│   │   │   │   ├── [feature_name]_selectors.dart
│   │   │   │   └── middlewares/
│   │   │   │       └── [action]_middleware.dart
│   │   │   └── bearer_file_state.dart
│   │   │
│   │   ├── presentation/
│   │   │   └── [screen_name]/
│   │   │       ├── [screen_name]_component.dart
│   │   │       ├── [screen_name]_connector.dart
│   │   │       ├── [screen_name]_view_model.dart
│   │   │       └── widgets/
│   │   │           └── [widget].dart
│   │   │
│   │   ├── di/
│   │   │   └── rlv_pets_dependencies.dart
│   │   │
│   │   └── l10n/
│   │       └── pets_localizations.dart
│   │
│   └── test/
│       ├── mocks/
│       │   └── mocks.dart             # ⚠️ ÚNICO archivo de mocks
│       ├── redux/
│       │   └── [feature]/
│       │       ├── [feature]_reducer_test.dart
│       │       └── middlewares/
│       │           └── [action]_middleware_test.dart
│       └── presentation/
│           └── [screen]/
│               └── [screen]_component_test.dart
```

---

## 🔧 **Herramientas y Configuración**

### Dependencias Core

```yaml
dependencies:
  # Redux
  redux: ^5.0.0
  flutter_redux: ^0.10.0
  
  # Functional Programming
  fpdart: ^1.1.0
  
  # Code Generation
  freezed_annotation: ^2.4.0
  json_annotation: ^4.8.1
  
  # Dependency Injection
  get_it: ^7.6.0
  injectable: ^2.3.0
  
  # Networking
  dio: ^5.4.0
  
dev_dependencies:
  # Testing
  flutter_test:
    sdk: flutter
  mockito: ^5.4.0
  
  # Code Generation
  build_runner: ^2.4.0
  freezed: ^2.4.0
  json_serializable: ^6.7.0
  injectable_generator: ^2.4.0
```

### Linters y Análisis

```yaml
# analysis_options.yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  exclude:
    - '**/*.g.dart'
    - '**/*.freezed.dart'
    - '**/*.mocks.dart'
    - '**/mocks.dart'
    - 'test/**'
  
  language:
    strict-raw-types: true
    strict-casts: true
  
  errors:
    missing_required_param: error
    missing_return: error
    invalid_annotation_target: ignore

linter:
  rules:
    # Estilo
    - prefer_const_constructors
    - prefer_const_literals_to_create_immutables
    - prefer_final_fields
    - prefer_final_locals
    
    # Errores
    - avoid_print
    - avoid_returning_null_for_future
    - cancel_subscriptions
    
    # Código limpio
    - always_declare_return_types
    - avoid_empty_else
    - prefer_is_empty
    - prefer_is_not_empty
```

---

## 🚀 **Comandos Útiles**

### Generación de Código

```bash
# Generar código Freezed y JSON Serializable
flutter pub run build_runner build --delete-conflicting-outputs

# Watch mode (regenerar automáticamente)
flutter pub run build_runner watch --delete-conflicting-outputs

# Generar mocks con Mockito
flutter pub run build_runner build --delete-conflicting-outputs
```

### Testing

```bash
# Ejecutar todos los tests
flutter test

# Ejecutar tests con cobertura
flutter test --coverage

# Ejecutar tests de un módulo específico
cd modules/rlv_health && flutter test

# Generar reporte HTML de cobertura
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

### Melos (Monorepo)

```bash
# Ejecutar tests en todos los módulos
melos test

# Generar reporte de cobertura consolidado
melos coverage_report

# Limpiar proyecto
melos clean

# Bootstrap (instalar dependencias)
melos bootstrap
```

---

## ✅ **Checklist General**

### Antes de Crear un PR

- [ ] ✅ Código formateado con `dart format`
- [ ] ✅ Sin warnings del analyzer
- [ ] ✅ Tests pasando (`flutter test`)
- [ ] ✅ Cobertura de tests cumple umbrales mínimos
- [ ] ✅ Todos los mocks en `/test/mocks/mocks.dart`
- [ ] ✅ No hay archivos `.mocks.dart` dispersos
- [ ] ✅ Código generado actualizado (Freezed, JSON, Mocks)
- [ ] ✅ Nombres de archivos y clases siguen convenciones
- [ ] ✅ Documentación actualizada si es necesario
- [ ] ✅ Sin `print()` statements en código de producción
- [ ] ✅ Sin `TODO` o `FIXME` sin issue asociado

### Code Review

- [ ] ✅ Código sigue los estándares documentados
- [ ] ✅ Tests cubren casos edge
- [ ] ✅ No hay código duplicado
- [ ] ✅ Nombres de variables y funciones son descriptivos
- [ ] ✅ Manejo de errores apropiado
- [ ] ✅ No hay hardcoded strings (usar localizaciones)
- [ ] ✅ Dependencias inyectadas correctamente
- [ ] ✅ Redux flow implementado correctamente

---

## 📚 **Referencias Adicionales**

### Documentación Externa

- [Flutter Documentation](https://docs.flutter.dev/)
- [Dart Style Guide](https://dart.dev/guides/language/effective-dart/style)
- [Redux Dart](https://pub.dev/packages/redux)
- [Freezed](https://pub.dev/packages/freezed)
- [Mockito](https://pub.dev/packages/mockito)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

### Documentación Interna

- [Testing Standards](./testing-standards.md)
- [Redux Standards](./redux-standards.md)
- [Repository Standards](./repository-standards.md)
- [Architecture Overview](./index.md)

---

## 🔄 **Versionado del Documento**

| Versión | Fecha      | Cambios                                          | Autor        |
| ------- | ---------- | ------------------------------------------------ | ------------ |
| 3.0.0   | 2025-01-22 | Reorganización en archivos separados por dominio | Agente AI    |
| 2.0.0   | 2025-01-22 | Actualización de estándares de testing          | Agente AI    |
| 1.0.0   | 2024-XX-XX | Versión inicial                                  | Equipo Dev   |

---

## 📞 **Soporte y Preguntas**

Para preguntas sobre estos estándares o sugerencias de mejora:

1. Revisar la documentación específica del dominio
2. Consultar ejemplos en `@modules/rlv_health/`
3. Crear una discusión en el equipo
4. Actualizar este documento si se aprueban cambios

---

**Última actualización**: 2025-01-22  
**Mantenido por**: Equipo de Arquitectura - Relevant SuperApp
