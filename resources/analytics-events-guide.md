# Guía de Implementación de Eventos de Analytics (Tags)

## 📋 Índice

1. [Introducción](#introducción)
2. [Conceptos Fundamentales](#conceptos-fundamentales)
3. [Estructura de Eventos](#estructura-de-eventos)
4. [Proceso de Implementación](#proceso-de-implementación)
5. [Patrones y Ejemplos](#patrones-y-ejemplos)
6. [Checklist de Implementación](#checklist-de-implementación)
7. [Testing](#testing)
8. [Errores Comunes](#errores-comunes)

---

## Introducción

### ¿Qué es el Tageo?

El **tageo** o **tags** es el proceso de mapear las acciones del usuario en la aplicación mediante el lanzamiento de eventos con información de trazabilidad. Esto permite:

- 📊 Tener un registro completo de la actividad del usuario
- 📈 Analizar patrones de uso y comportamiento
- 🎯 Tomar decisiones basadas en datos
- 🔍 Identificar puntos de mejora en la experiencia del usuario

### ¿Cuándo se debe implementar tageo?

**IMPORTANTE**: Al crear tareas para una Historia de Usuario (HU), **SIEMPRE** preguntar:

- ❓ **¿Esta HU requiere implementación de tags?**
- 📄 **¿El equipo de analytics ha proporcionado el documento de especificación?**
- 🎯 **¿Cuáles son los puntos de entrada del flujo?**

> **Nota**: No todos los desarrollos requieren tags, pero es fundamental preguntar desde el inicio para evitar retrabajos.

---

## Conceptos Fundamentales

### Módulo `rlv_analytics`

**Todos** los cambios relacionados con eventos de analytics se implementan en el módulo:

```
modules/rlv_analytics/
```

Este módulo centraliza la lógica de eventos y luego se disparan desde los diferentes flujos según sea necesario.

### Componentes Clave

1. **`LogEventRequest`**: Clase base para todos los eventos
2. **`AnalyticsEventName`**: Enum con los nombres de eventos principales
3. **`AnalyticsEventParams`**: Estructura de parámetros jerárquicos (eventCategory → eventAction → eventLabel → eventLabel2-9)
4. **`LogEventMiddleware`**: Middleware que ejecuta el envío del evento
5. **Clases de Eventos**: Clases específicas por dominio (Pets, Health, Vaccination, Agent, etc.)
6. **Constantes**: Archivos con constantes para cada dominio

### Estructura del Módulo

```
modules/rlv_analytics/
├── lib/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── analytics_event_name.dart
│   │   │   └── analytics_event_params.dart
│   │   └── middlewares/
│   │       └── log_event_middleware.dart
│   └── utils/
│       ├── base/
│       │   └── log_event_request_extensions.dart
│       ├── pets/
│       │   ├── log_pets_event.dart
│       │   └── pets_event_constants.dart
│       ├── health_events/
│       │   ├── log_health_event.dart
│       │   ├── log_medical_record_event.dart
│       │   └── health_event_constants.dart
│       └── {domain}_events/
│           ├── log_{domain}_event.dart
│           └── {domain}_event_constants.dart
└── test/
    └── utils/
        └── {domain}_events/
            └── log_{domain}_event_test.dart
```

---

## Estructura de Eventos

### Jerarquía de Parámetros (Secuencial)

Los eventos de analytics siguen una estructura **jerárquica y secuencial** de parámetros:

```dart
AnalyticsEventParams(
  eventCategory: 'Categoría principal',      // Nivel 1
  eventAction: 'Acción específica',          // Nivel 2
  eventLabel: 'Etiqueta 1',                  // Nivel 3
  eventLabel2: 'Etiqueta 2',                 // Nivel 4
  eventLabel3: 'Etiqueta 3',                 // Nivel 5
  eventLabel4: 'Etiqueta 4',                 // Nivel 6
  eventLabel5: 'Etiqueta 5',                 // Nivel 7
  eventLabel6: 'Etiqueta 6',                 // Nivel 8
  eventLabel7: 'Etiqueta 7',                 // Nivel 9
  eventLabel8: 'Etiqueta 8',                 // Nivel 10
  eventLabel9: 'Etiqueta 9',                 // Nivel 11
)
```

> ⚠️ **IMPORTANTE**: La jerarquía es **secuencial**. Si disparas un evento con `eventLabel4`, detrás de él deben estar definidos todos los niveles anteriores (`eventCategory`, `eventAction`, `eventLabel`, `eventLabel2`, `eventLabel3`).

**Ejemplo:**
```dart
// ✅ CORRECTO - Jerarquía secuencial
store.dispatch(LogPetsEvent.saveNewReminder(true, false));
// Internamente tiene: category → action → label → label2 → label3 → label4

// ❌ INCORRECTO - Saltando niveles
LogPetsEvent(
  params: AnalyticsEventParams(
    eventLabel4: 'algo',  // No hay category, action, label, label2, label3
  ),
);
```

### Nombres de Eventos Disponibles

```dart
enum AnalyticsEventName {
  health('SALUD'),
  mobility('MOVILIDAD'),
  life('VIDA'),
  residence('HOGAR'),
  favorites('NUESTRA RECOMENDACION PARA TI'),
  recommendations('TE RECOMENDAMOS'),
  moreProductsForYou('MAS PRODUCTOS PARA TI'),
  footerMenu('MENU FOOTER'),
  hamburgerMenu('MENU HAMBURGUESA'),
  billeteraSura('BILLETERA SURA'),
  miPerfil('MI PERFIL'),
  ampliaTuPortafolio('AMPLIA TU PORTAFOLIO'),
  ayudaAtencion('AYUDA Y ATENCIÓN'),
  serviciosMasUsados('SERVICIOS MÁS USADOS'),
  emergencias('EMERGENCIAS'),
  utilities('Utilidades'),
  welfare('Bienestar'),
  arl('ARL'),
  popUp('POP UP'),
  agent('AGENTE VIRTUAL'),
  pets('MASCOTAS'),
}
```

---

## Proceso de Implementación

### Paso 0: Análisis Previo (CRÍTICO)

Antes de comenzar cualquier implementación, responder estas preguntas:

#### ✅ Preguntas de Especificación

1. **¿Tengo el documento de especificación de analytics?**
   - Formato típico: Imagen, Excel, o documento con tabla
   - Debe incluir: Event Name, Event Category, Event Action, Labels, descripción de cuándo disparar

2. **¿Cuáles son los puntos de entrada del flujo?**
   - Ejemplo: El flujo de vacunación puede entrar desde "Utilidades" o desde "Salud"
   - Esto determina si necesitas lógica condicional basada en `entryPoint`

3. **¿El flujo tiene estados o variantes?**
   - ¿Los eventos cambian según el contexto? (Ej: "con póliza" vs "sin póliza")
   - ¿Necesito mantener estado entre eventos? (Ej: `Store<RlvAnalyticsState>`)

4. **¿Los textos de los eventos son dinámicos?**
   - ¿Algún parámetro cambia según contexto? (Ej: tipo de plan de salud, ciudad seleccionada)

#### 📋 Formato Típico de Especificación

| Pantalla/Flujo | Acción Usuario | Event Name | Event Category | Event Action | Event Label | Event Label2 | ... |
|----------------|----------------|------------|----------------|--------------|-------------|--------------|-----|
| Mis Mascotas | Tap "Agregar mascota" | pets | Agregar mascota | - | - | - | - |
| Agregar Mascota | Tap "Seleccionar foto" | pets | Agregar mascota | Seleccionar foto | - | - | - |
| Agregar Mascota | Tap "Guardar" | pets | Agregar mascota | Seleccionar foto | Guardar | - | - |
| Confirmación | Tap "Ver mascota" | pets | Agregar mascota | Seleccionar foto | Guardar | Mascota agregada | Ver mascota |

### Paso 1: Crear Archivo de Constantes

**Ubicación**: `modules/rlv_analytics/lib/utils/{domain}_events/{domain}_event_constants.dart`

**Naming Convention**:
- Clase: `{Domain}EventConstants` (PascalCase, en inglés)
- Constantes: `camelCase`, nombres descriptivos en inglés
- Valores: Texto exacto según especificación (puede estar en español)

```dart
abstract class {Domain}EventConstants {
  // Event categories (Nivel 1)
  static const String category1 = 'Texto exacto de especificación';
  static const String category2 = 'Otro texto';

  // Event actions (Nivel 2)
  static const String action1 = 'Texto de acción 1';
  static const String action2 = 'Texto de acción 2';

  // Event labels (Nivel 3)
  static const String label1 = 'Texto label 1';
  static const String label2 = 'Texto label 2';

  // Event labels 2 (Nivel 4)
  static const String label2_1 = 'Texto label2 1';
  static const String label2_2 = 'Texto label2 2';

  // Event labels 3 (Nivel 5)
  // ... y así sucesivamente

  // Funciones dinámicas (si aplica)
  static String dynamicLabel(String value) => 'Texto con $value';
}
```

**Ejemplo Real (Pets)**:

```dart
abstract class PetsEventConstants {
  // Event categories
  static const String addPet = 'Agregar mascota';
  static const String purchasePetInsurance = 'Adquiere tu seguro de mascotas';
  static const String petDetail = 'Detalles mascota';

  // Event actions
  static const String addPhoto = 'Seleccionar foto';
  static const String withPolicy = 'Con poliza';
  static const String withoutPolicy = 'Sin poliza';

  // Event labels
  static const String savePet = 'Guardar';
  static const String reminders = 'Recordatorios';
  static const String license = 'Carné Sura';
  
  // Event labels 2
  static const String petAdded = 'Mascota agregada';
  static const String addReminder = 'Agregar recordatorio';
  
  // Event labels 3
  static const String seePetAdded = 'Ver mascota';
  static const String seePetList = 'Ver mi lista de mascotas';
  
  // Funciones dinámicas
  static String recurringReminder(bool isActive) =>
      'Recordatorio recurrente: ${isActive ? 'activado' : 'desactivado'}';
}
```

### Paso 2: Crear Clase de Eventos

**Ubicación**: `modules/rlv_analytics/lib/utils/{domain}_events/log_{domain}_event.dart`

**Naming Convention**:
- Clase: `Log{Domain}Event` (PascalCase, en inglés)
- Métodos: `camelCase`, nombres descriptivos en inglés que reflejen la acción del usuario

**Estructura Base**:

```dart
import 'package:rlv_analytics/domain/entities/analytics_event_name.dart';
import 'package:rlv_analytics/domain/entities/analytics_event_params.dart';
import 'package:rlv_analytics/domain/middlewares/log_event_middleware.dart';
import 'package:rlv_analytics/utils/base/log_event_request_extensions.dart';
import 'package:rlv_analytics/utils/{domain}_events/{domain}_event_constants.dart';

class Log{Domain}Event extends LogEventRequest {
  const Log{Domain}Event({
    required super.params,
  }) : super(eventName: AnalyticsEventName.{eventName});

  // Método base (opcional, solo si tiene sentido un evento sin parámetros)
  static LogEventRequest baseEvent() =>
      const Log{Domain}Event(params: AnalyticsEventParams());

  // Eventos de nivel 1 (eventCategory)
  static LogEventRequest category1() => Log{Domain}Event(
        params: AnalyticsEventParams(
          eventCategory: {Domain}EventConstants.category1,
        ),
      );

  // Eventos de nivel 2 (eventAction)
  // SIEMPRE heredan del nivel anterior
  static LogEventRequest action1() => category1().copyWithParams(
        eventAction: {Domain}EventConstants.action1,
      );

  // Eventos de nivel 3 (eventLabel)
  static LogEventRequest label1() => action1().copyWithParams(
        eventLabel: {Domain}EventConstants.label1,
      );

  // Eventos de nivel 4 (eventLabel2)
  static LogEventRequest label2_1() => label1().copyWithParams(
        eventLabel2: {Domain}EventConstants.label2_1,
      );
  
  // ... continuar según profundidad necesaria
}
```

**Ejemplo Real (Pets - simplificado)**:

```dart
import 'package:rlv_analytics/domain/entities/analytics_event_name.dart';
import 'package:rlv_analytics/domain/entities/analytics_event_params.dart';
import 'package:rlv_analytics/domain/middlewares/log_event_middleware.dart';
import 'package:rlv_analytics/utils/base/log_event_request_extensions.dart';
import 'package:rlv_analytics/utils/pets/pets_event_constants.dart';

class LogPetsEvent extends LogEventRequest {
  const LogPetsEvent({
    required super.params,
  }) : super(eventName: AnalyticsEventName.pets);

  // Base
  static LogEventRequest pets() =>
      const LogPetsEvent(params: AnalyticsEventParams());

  // Nivel 1: Categories
  static LogEventRequest addPet() => LogPetsEvent(
        params: AnalyticsEventParams(
          eventCategory: PetsEventConstants.addPet,
        ),
      );

  static LogEventRequest petDetail() => LogPetsEvent(
        params: AnalyticsEventParams(
          eventCategory: PetsEventConstants.petDetail,
        ),
      );

  // Nivel 2: Actions
  static LogEventRequest addPhoto() => addPet().copyWithParams(
        eventAction: PetsEventConstants.addPhoto,
      );

  // Nivel 3: Labels
  static LogEventRequest savePet() => addPhoto().copyWithParams(
        eventLabel: PetsEventConstants.savePet,
      );

  // Nivel 4: Labels 2
  static LogEventRequest petAdded() => savePet().copyWithParams(
        eventLabel2: PetsEventConstants.petAdded,
      );

  // Nivel 5: Labels 3
  static LogEventRequest seePetAdded() => petAdded().copyWithParams(
        eventLabel3: PetsEventConstants.seePetAdded,
      );

  static LogEventRequest seePetList() => petAdded().copyWithParams(
        eventLabel3: PetsEventConstants.seePetList,
      );
}
```

### Paso 3: Disparar Eventos en el Flujo

**IMPORTANTE**: Los eventos se deben disparar desde el **ViewModel** que maneja los eventos y flujos de la funcionalidad a observar.

En el módulo/feature correspondiente (NO en `rlv_analytics`):

```dart
// En el ViewModel de la funcionalidad
import 'package:rlv_analytics/utils/{domain}_events/log_{domain}_event.dart';

class MyViewModel {
  final Store store;
  
  void onUserTappedButton() {
    // 1. Disparar el evento ANTES de ejecutar la acción
    store.dispatch(Log{Domain}Event.someAction());
    
    // 2. Ejecutar la lógica de negocio
    performBusinessLogic();
  }
}
```

**Ejemplo Real**:

```dart
import 'package:rlv_analytics/utils/pets/log_pets_event.dart';

class PetsViewModel {
  final Store store;
  
  void onSavePetTapped() {
    // Disparar evento desde el ViewModel
    store.dispatch(LogPetsEvent.savePet());
    
    // Guardar mascota
    await repository.savePet(petData);
  }
  
  void onPetAddedConfirmed(bool seesPet) {
    // El ViewModel maneja el flujo y dispara el evento correspondiente
    if (seesPet) {
      store.dispatch(LogPetsEvent.seePetAdded());
      navigateToPetDetail();
    } else {
      store.dispatch(LogPetsEvent.seePetList());
      navigateToPetList();
    }
  }
}
```

**❌ Evitar disparar desde Widgets directamente**:

```dart
// ❌ MAL - Disparar desde el Widget
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () {
        store.dispatch(LogPetsEvent.savePet()); // ❌ No hacer aquí
        // ...
      },
      child: Text('Guardar'),
    );
  }
}
```

**✅ Correcto - Disparar desde el ViewModel**:

```dart
// ✅ BIEN - Widget llama al ViewModel
class MyWidget extends StatelessWidget {
  final MyViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: viewModel.onSavePetTapped, // ✅ ViewModel maneja todo
      child: Text('Guardar'),
    );
  }
}

// ViewModel dispara el evento
class MyViewModel {
  void onSavePetTapped() {
    store.dispatch(LogPetsEvent.savePet()); // ✅ Evento desde ViewModel
    repository.savePet(petData);
  }
}
```

---

## Patrones y Ejemplos

### Patrón 1: Eventos Simples (Sin Estado, Sin Parámetros)

**Cuándo usar**: Flujos lineales sin variantes ni contexto adicional.

**Ejemplo: Agente Virtual**

```dart
class LogAgentEvent extends LogEventRequest {
  const LogAgentEvent({
    required super.params,
  }) : super(eventName: AnalyticsEventName.agent);

  static LogEventRequest accessToTibot() =>
      LogAgentEvent(params: AnalyticsEventParams());
}
```

**Uso**:
```dart
store.dispatch(LogAgentEvent.accessToTibot());
```

### Patrón 2: Eventos con Parámetros Dinámicos (Bool/Enum)

**Cuándo usar**: Cuando el evento cambia según un estado binario o enumerado (con/sin póliza, virtual/presencial, etc.).

**Ejemplo: Mascotas con contexto de póliza**

```dart
// En la clase de eventos
static LogEventRequest petDetailWith(bool isPolicy) =>
    petDetail().copyWithParams(
      eventAction: isPolicy
          ? PetsEventConstants.withPolicy
          : PetsEventConstants.withoutPolicy,
    );

static LogEventRequest quotePolicy(bool isPolicy) =>
    petDetailWith(isPolicy).copyWithParams(
      eventLabel: PetsEventConstants.quote,
    );

static LogEventRequest recurringReminder(bool isPolicy, bool isRecurring) =>
    addPetRemainders(isPolicy).copyWithParams(
      eventLabel3: PetsEventConstants.recurringReminder(isRecurring),
    );
```

**Uso**:
```dart
// Con póliza
store.dispatch(LogPetsEvent.quotePolicy(true));

// Sin póliza
store.dispatch(LogPetsEvent.quotePolicy(false));

// Recordatorio recurrente activado
store.dispatch(LogPetsEvent.recurringReminder(true, true));
```

### Patrón 3: Eventos con Contexto de Store

**Cuándo usar**: Cuando necesitas leer o modificar estado en Redux para construir el evento.

**Ejemplo: Historial Médico con múltiples estados**

```dart
static LogEventRequest medicalRecordAccessSuccess({
  required Store<RlvAnalyticsState> store,
  HealthPlan? healthPlan,
  IdentityValidationAccessType? identityValidationAccessType,
}) {
  // Guardar en el store si se proporciona
  if (identityValidationAccessType != null) {
    store.dispatch(
      SetIdentityValidationAccessType(
        identityValidationAccessType: identityValidationAccessType,
      ),
    );
  }
  
  // Leer del store
  final userHealthPlan = healthPlan ?? selectUserHealthPlan(store.state);
  final accessMethod = identityValidationAccessType ??
      selectIdentityValidationAccessType(store.state);
  
  return requestMedicalRecordContinue(
    healthPlan: userHealthPlan,
  ).copyWithParams(
    eventLabel3: HealthEventConstants.accessWithMethod(accessMethod.value),
  );
}
```

**Uso**:
```dart
store.dispatch(
  LogMedicalRecordEvent.medicalRecordAccessSuccess(
    store: store,
    healthPlan: currentPlan,
    identityValidationAccessType: IdentityValidationAccessType.password,
  ),
);
```

### Patrón 4: Eventos con Entry Points (Múltiples Puntos de Entrada)

**Cuándo usar**: Cuando el flujo puede iniciarse desde diferentes lugares de la app y los eventos deben ser diferentes según el origen.

**Ejemplo: Vacunación (desde Utilidades vs desde Salud)**

```dart
static LogEventRequest openVaccination(
  Store<RlvAnalyticsState> store, {
  required HealthPlan? healthPlan,
}) {
  // Leer entry point del estado
  final entryPoint = selectVaccinationEntryPoint(store.state);
  
  if (entryPoint == VaccinationEntryPoint.utilities) {
    // Evento tipo "utilities"
    return VaccinationLogEvent(
      params: AnalyticsEventParams(
        eventCategory: VaccinationEventsConstants.vaccination,
      ),
    );
  }
  
  // Evento tipo "health"
  return LogHealthEvent.vaccinationDetails(healthPlan: healthPlan);
}

static LogEventRequest openVaccinationCard(
  Store<RlvAnalyticsState> store, {
  required HealthPlan? healthPlan,
}) {
  final entryPoint = selectVaccinationEntryPoint(store.state);
  final baseEvent = openVaccination(store, healthPlan: healthPlan);
  
  if (entryPoint == VaccinationEntryPoint.utilities) {
    // En utilities, usar eventAction
    return baseEvent.copyWithParams(
      eventAction: VaccinationEventsConstants.vaccinationCard,
    );
  }
  
  // En health, usar eventLabel2
  return baseEvent.copyWithParams(
    eventLabel2: VaccinationEventsConstants.vaccinationCard,
  );
}
```

**Uso**:
```dart
// El entry point ya está guardado en el store desde donde se inició el flujo
store.dispatch(
  VaccinationLogEvent.openVaccinationCard(
    store,
    healthPlan: currentPlan,
  ),
);
```

### Patrón 5: Construcción Jerárquica Incremental (Árbol de Eventos)

**Cuándo usar**: Para flujos complejos con múltiples ramas y niveles profundos.

**Ejemplo: Mascotas - Flujo completo de recordatorios**

```dart
// Nivel 1: Base
static LogEventRequest pets() =>
    const LogPetsEvent(params: AnalyticsEventParams());

// Nivel 2: Detalle de mascota (category)
static LogEventRequest petDetail() => LogPetsEvent(
      params: AnalyticsEventParams(
        eventCategory: PetsEventConstants.petDetail,
      ),
    );

// Nivel 3: Con/Sin póliza (action)
static LogEventRequest petDetailWith(bool isPolicy) =>
    petDetail().copyWithParams(
      eventAction: isPolicy
          ? PetsEventConstants.withPolicy
          : PetsEventConstants.withoutPolicy,
    );

// Nivel 4: Recordatorios (label)
static LogEventRequest petRemainders(bool isPolicy) =>
    petDetailWith(isPolicy).copyWithParams(
      eventLabel: PetsEventConstants.reminders,
    );

// Nivel 5: Agregar recordatorio (label2)
static LogEventRequest addPetRemainders(bool isPolicy) =>
    petRemainders(isPolicy).copyWithParams(
      eventLabel2: PetsEventConstants.addReminder,
    );

// Nivel 6: Recordatorio recurrente (label3)
static LogEventRequest recurringReminder(bool isPolicy, bool isRecurring) =>
    addPetRemainders(isPolicy).copyWithParams(
      eventLabel3: PetsEventConstants.recurringReminder(isRecurring),
    );

// Nivel 7: Guardar (label4)
static LogEventRequest saveNewReminder(bool isPolicy, bool isRecurring) =>
    recurringReminder(isPolicy, isRecurring).copyWithParams(
      eventLabel4: PetsEventConstants.saveNewReminder,
    );

// Nivel 8: Ver recordatorios (label5)
static LogEventRequest seeWhenNewReminders(bool isPolicy, bool isRecurrent) =>
    saveNewReminder(isPolicy, isRecurrent).copyWithParams(
      eventLabel5: PetsEventConstants.seeNewReminders,
    );
```

**Visualización del Árbol**:

```
pets()
└── petDetail()
    └── petDetailWith(bool)
        ├── quotePolicy(bool)
        ├── associatePolicy(bool)
        └── petRemainders(bool)
            ├── addPetRemainders(bool)
            │   └── recurringReminder(bool, bool)
            │       └── saveNewReminder(bool, bool)
            │           ├── seeWhenNewReminders(bool, bool)
            │           └── seePetsWhenNewReminders(bool, bool)
            └── editPetRemainders(bool)
                └── saveEditPetRemainders(bool)
                    └── seeWhenEditedReminders(bool)
```

### Patrón 6: Eventos con Lógica Condicional

**Cuándo usar**: Cuando la jerarquía cambia según el estado actual.

**Ejemplo: Compartir carné de mascota (con/sin carné previo)**

```dart
static LogEventRequest sharePetCard(bool isPolicy, bool hasPetCard) {
  if (hasPetCard) {
    // Si ya tiene carné, el evento es más corto
    return license(isPolicy).copyWithParams(
      eventLabel2: PetsEventConstants.shareLicense,
    );
  }
  
  // Si no tiene, primero sube y luego comparte (evento más profundo)
  return uploadPetCard(isPolicy).copyWithParams(
    eventLabel4: PetsEventConstants.shareLicense,
  );
}

static LogEventRequest deletePetCard(bool isPolicy, bool hasPetCard) {
  if (hasPetCard) {
    return license(isPolicy).copyWithParams(
      eventLabel2: PetsEventConstants.removeLicense,
    );
  }
  return seePetCardWithUpload(isPolicy).copyWithParams(
    eventLabel4: PetsEventConstants.removeLicense,
  );
}
```

**Uso**:
```dart
// Usuario con carné
store.dispatch(LogPetsEvent.sharePetCard(true, true));

// Usuario sin carné
store.dispatch(LogPetsEvent.sharePetCard(true, false));
```

---

## Checklist de Implementación

### ✅ Fase 1: Análisis (Antes de Codificar)

- [ ] Documento de especificación de analytics recibido y revisado
- [ ] Todos los eventos están claramente identificados con su jerarquía
- [ ] Se conocen los puntos de entrada del flujo
- [ ] Se identificaron variantes del flujo (con/sin estado, diferentes contextos)
- [ ] Se definió si se necesita `Store` como parámetro
- [ ] Se validó que los textos coincidan exactamente con la especificación

### ✅ Fase 2: Implementación

#### Constantes
- [ ] Archivo `{domain}_event_constants.dart` creado
- [ ] Todas las constantes nombradas en inglés (camelCase)
- [ ] Valores coinciden exactamente con la especificación
- [ ] Constantes agrupadas por nivel jerárquico (con comentarios)
- [ ] Funciones dinámicas implementadas si aplica

#### Clase de Eventos
- [ ] Archivo `log_{domain}_event.dart` creado
- [ ] Clase extiende `LogEventRequest`
- [ ] Constructor configura el `AnalyticsEventName` correcto
- [ ] Todos los métodos estáticos siguen la jerarquía secuencial
- [ ] Métodos nombrados en inglés, descriptivos de la acción del usuario
- [ ] Imports correctos agregados
- [ ] Parámetros dinámicos (`bool`, `enum`, `Store`) manejados correctamente

#### Entry Points (si aplica)
- [ ] Lógica de entry points implementada
- [ ] Selector de entry point creado en Redux
- [ ] Estado de entry point se guarda correctamente al iniciar el flujo

### ✅ Fase 3: Integración

- [ ] Eventos importados en los módulos/features correspondientes
- [ ] Eventos se disparan desde el **ViewModel** que maneja los flujos de la funcionalidad
- [ ] `store.dispatch()` llamados en los lugares correctos
- [ ] Eventos se disparan **antes** de la acción del usuario
- [ ] Contexto necesario (`Store`, parámetros) se pasa correctamente
- [ ] No hay eventos hardcodeados fuera de `rlv_analytics`
- [ ] No se disparan eventos directamente desde Widgets (usar ViewModel)

### ✅ Fase 4: Testing

- [ ] Archivo de test creado en `test/utils/{domain}_events/log_{domain}_event_test.dart`
- [ ] Tests del constructor y event name
- [ ] Tests de cada método estático
- [ ] Validación de jerarquía secuencial en cada test
- [ ] Tests de lógica condicional (si aplica)
- [ ] Mocks configurados correctamente (si usa Store)
- [ ] Coverage > 80%

### ✅ Fase 5: Validación

- [ ] Código revisado por par
- [ ] Tests pasan en pipeline
- [ ] Eventos se disparan en el momento correcto durante el flujo (verificado en debug)
- [ ] Logs de debug muestran la información correcta
- [ ] Analytics confirmó que los eventos se reciben correctamente
- [ ] Documentación actualizada (si aplica)

---

## Testing

### Estructura de Tests

**Ubicación**: `modules/rlv_analytics/test/utils/{domain}_events/log_{domain}_event_test.dart`

### Patrón Básico (Sin Store)

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:rlv_analytics/domain/entities/analytics_event_name.dart';
import 'package:rlv_analytics/domain/entities/analytics_event_params.dart';
import 'package:rlv_analytics/utils/{domain}_events/log_{domain}_event.dart';
import 'package:rlv_analytics/utils/{domain}_events/{domain}_event_constants.dart';

void main() {
  group('Log{Domain}Event', () {
    test('constructor should set correct eventName', () {
      const event = Log{Domain}Event(params: AnalyticsEventParams());
      
      expect(event.eventName, AnalyticsEventName.{domain});
    });

    test('baseEvent should return base event', () {
      final event = Log{Domain}Event.baseEvent();
      
      expect(event.eventName, AnalyticsEventName.{domain});
      expect(event.params, const AnalyticsEventParams());
    });

    test('category1 should set correct eventCategory', () {
      final event = Log{Domain}Event.category1();
      
      expect(event.params.eventCategory, {Domain}EventConstants.category1);
    });

    test('action1 should build correct hierarchy', () {
      final event = Log{Domain}Event.action1();
      
      expect(event.params.eventCategory, {Domain}EventConstants.category1);
      expect(event.params.eventAction, {Domain}EventConstants.action1);
    });

    test('label1 should build correct hierarchy up to eventLabel', () {
      final event = Log{Domain}Event.label1();
      
      expect(event.params.eventCategory, {Domain}EventConstants.category1);
      expect(event.params.eventAction, {Domain}EventConstants.action1);
      expect(event.params.eventLabel, {Domain}EventConstants.label1);
    });

    // Test para parámetros dinámicos
    group('methodWithBool', () {
      test('should set correct value when parameter is true', () {
        final event = Log{Domain}Event.methodWithBool(true);
        
        expect(event.params.eventAction, {Domain}EventConstants.valueForTrue);
      });

      test('should set correct value when parameter is false', () {
        final event = Log{Domain}Event.methodWithBool(false);
        
        expect(event.params.eventAction, {Domain}EventConstants.valueForFalse);
      });
    });
  });
}
```

### Ejemplo Real: Pets

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:rlv_analytics/domain/entities/analytics_event_name.dart';
import 'package:rlv_analytics/domain/entities/analytics_event_params.dart';
import 'package:rlv_analytics/utils/pets/log_pets_event.dart';
import 'package:rlv_analytics/utils/pets/pets_event_constants.dart';

void main() {
  group('LogPetsEvent', () {
    test('constructor should set eventName to pets', () {
      const event = LogPetsEvent(params: AnalyticsEventParams());
      expect(event.eventName, AnalyticsEventName.pets);
    });

    test('pets should return base pets event', () {
      final event = LogPetsEvent.pets();
      
      expect(event.eventName, AnalyticsEventName.pets);
      expect(event.params, const AnalyticsEventParams());
    });

    test('addPet should set correct eventCategory', () {
      final event = LogPetsEvent.addPet();
      
      expect(event.params.eventCategory, PetsEventConstants.addPet);
    });

    test('addPhoto should build correct hierarchy', () {
      final event = LogPetsEvent.addPhoto();
      
      expect(event.params.eventCategory, PetsEventConstants.addPet);
      expect(event.params.eventAction, PetsEventConstants.addPhoto);
    });

    test('savePet should build correct hierarchy up to eventLabel', () {
      final event = LogPetsEvent.savePet();
      
      expect(event.params.eventCategory, PetsEventConstants.addPet);
      expect(event.params.eventAction, PetsEventConstants.addPhoto);
      expect(event.params.eventLabel, PetsEventConstants.savePet);
    });

    test('petAdded should build correct hierarchy up to eventLabel2', () {
      final event = LogPetsEvent.petAdded();
      
      expect(event.params.eventCategory, PetsEventConstants.addPet);
      expect(event.params.eventAction, PetsEventConstants.addPhoto);
      expect(event.params.eventLabel, PetsEventConstants.savePet);
      expect(event.params.eventLabel2, PetsEventConstants.petAdded);
    });

    group('petDetailWith', () {
      test('should set withPolicy when isPolicy is true', () {
        final event = LogPetsEvent.petDetailWith(true);
        
        expect(event.params.eventCategory, PetsEventConstants.petDetail);
        expect(event.params.eventAction, PetsEventConstants.withPolicy);
      });

      test('should set withoutPolicy when isPolicy is false', () {
        final event = LogPetsEvent.petDetailWith(false);
        
        expect(event.params.eventCategory, PetsEventConstants.petDetail);
        expect(event.params.eventAction, PetsEventConstants.withoutPolicy);
      });
    });

    group('recurringReminder', () {
      test('should build with correct text when isRecurring is true', () {
        final event = LogPetsEvent.recurringReminder(true, true);
        
        expect(
          event.params.eventLabel3,
          PetsEventConstants.recurringReminder(true),
        );
      });

      test('should build with correct text when isRecurring is false', () {
        final event = LogPetsEvent.recurringReminder(true, false);
        
        expect(
          event.params.eventLabel3,
          PetsEventConstants.recurringReminder(false),
        );
      });
    });
  });
}
```

### Patrón con Store y Mocks

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:rlv_analytics/domain/entities/analytics_event_name.dart';
import 'package:rlv_analytics/redux/analytics_state.dart';
import 'package:rlv_analytics/utils/{domain}_events/log_{domain}_event.dart';

import '../../mocks/mocks.mocks.dart'; // Generado con build_runner

void main() {
  group('Log{Domain}Event', () {
    late MockStoreRlvAnalyticsState mockStore;
    late MockRlvAnalyticsState mockRlvAnalyticsState;
    late AnalyticsState mockAnalyticsState;

    setUp(() {
      mockStore = MockStoreRlvAnalyticsState();
      mockRlvAnalyticsState = MockRlvAnalyticsState();

      when(mockStore.state).thenReturn(mockRlvAnalyticsState);
    });

    void setupMockState({
      required SomeEntryPoint entryPoint,
      SomeData? someData,
    }) {
      mockAnalyticsState = AnalyticsState(
        someEntryPoint: entryPoint,
        someData: someData,
      );

      when(mockRlvAnalyticsState.analyticsState)
          .thenReturn(mockAnalyticsState);
    }

    test('methodWithStore should create correct event', () {
      // Arrange
      setupMockState(entryPoint: SomeEntryPoint.value1);
      const expectedEventName = AnalyticsEventName.{domain};
      const expectedCategory = {Domain}EventConstants.category1;

      // Act
      final logEventRequest = Log{Domain}Event.methodWithStore(
        mockStore,
        someParam: someValue,
      );

      // Assert
      expect(logEventRequest.eventName, expectedEventName);
      expect(logEventRequest.params.eventCategory, expectedCategory);
    });

    test('methodWithEntryPointLogic should use correct event based on entry', () {
      // Arrange
      setupMockState(entryPoint: SomeEntryPoint.value1);

      // Act
      final logEventRequest = Log{Domain}Event.methodWithEntryPointLogic(
        mockStore,
        someParam: someValue,
      );

      // Assert
      expect(logEventRequest.params.eventCategory, expectedForValue1);
    });
  });
}
```

**Ejemplo Real: Vaccination con Entry Points**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:rlv_analytics/domain/entities/analytics_event_name.dart';
import 'package:rlv_analytics/redux/analytics_state.dart';
import 'package:rlv_analytics/redux/enum/vaccination_entry_point.dart';
import 'package:rlv_analytics/redux/medical_record_state/medical_record_state.dart';
import 'package:rlv_analytics/utils/health_events/health_event_enums.dart';
import 'package:rlv_analytics/utils/vaccination_events/vaccination_event_constants.dart';
import 'package:rlv_analytics/utils/vaccination_events/vaccination_log_event.dart';

import '../../mocks/mocks.mocks.dart';

void main() {
  group('VaccinationLogEvent', () {
    late MockStoreRlvAnalyticsState mockStore;
    late MockRlvAnalyticsState mockRlvAnalyticsState;
    late AnalyticsState mockAnalyticsState;

    HealthPlan? userHealthPlan;

    setUp(() {
      mockStore = MockStoreRlvAnalyticsState();
      mockRlvAnalyticsState = MockRlvAnalyticsState();

      when(mockStore.state).thenReturn(mockRlvAnalyticsState);
    });

    void withVaccinationEntryPointAndUserHealthPlan({
      VaccinationEntryPoint entryPoint = VaccinationEntryPoint.utilities,
      HealthPlan? userHealthPlan,
    }) {
      mockAnalyticsState = AnalyticsState(
        vaccinationEntryPoint: entryPoint,
        userHealthPlan: userHealthPlan,
        medicalRecordState: MedicalRecordState.initial(),
      );

      when(mockRlvAnalyticsState.analyticsState).thenReturn(mockAnalyticsState);
    }

    test('openVaccination from utilities creates utilities event', () {
      // Arrange
      withVaccinationEntryPointAndUserHealthPlan(
        entryPoint: VaccinationEntryPoint.utilities,
      );
      const expectedEventName = AnalyticsEventName.utilities;
      const expectedEventCategory = VaccinationEventsConstants.vaccination;

      // Act
      final logEventRequest = VaccinationLogEvent.openVaccination(
        mockStore,
        healthPlan: userHealthPlan,
      );

      // Assert
      expect(logEventRequest.eventName, expectedEventName);
      expect(logEventRequest.params.eventCategory, expectedEventCategory);
      expect(logEventRequest.params.eventAction, isNull);
    });

    test('openVaccination from health creates health event', () {
      // Arrange
      withVaccinationEntryPointAndUserHealthPlan(
        entryPoint: VaccinationEntryPoint.health,
      );
      const expectedEventName = AnalyticsEventName.health;

      // Act
      final logEventRequest = VaccinationLogEvent.openVaccination(
        mockStore,
        healthPlan: userHealthPlan,
      );

      // Assert
      expect(logEventRequest.eventName, expectedEventName);
    });

    test('openVaccinationCard from utilities uses eventAction', () {
      // Arrange
      withVaccinationEntryPointAndUserHealthPlan(
        entryPoint: VaccinationEntryPoint.utilities,
      );
      const expectedEventAction = VaccinationEventsConstants.vaccinationCard;

      // Act
      final logEventRequest = VaccinationLogEvent.openVaccinationCard(
        mockStore,
        healthPlan: userHealthPlan,
      );

      // Assert
      expect(logEventRequest.params.eventAction, expectedEventAction);
      expect(logEventRequest.params.eventLabel2, isNull);
    });

    test('openVaccinationCard from health uses eventLabel2', () {
      // Arrange
      withVaccinationEntryPointAndUserHealthPlan(
        entryPoint: VaccinationEntryPoint.health,
      );
      const expectedLabel2 = VaccinationEventsConstants.vaccinationCard;

      // Act
      final logEventRequest = VaccinationLogEvent.openVaccinationCard(
        mockStore,
        healthPlan: userHealthPlan,
      );

      // Assert
      expect(logEventRequest.params.eventLabel2, expectedLabel2);
    });
  });
}
```

### Tips de Testing

1. **Siempre validar la jerarquía completa**: No solo el último nivel, sino todos los niveles anteriores
2. **Agrupar tests relacionados**: Usar `group()` para métodos con variantes
3. **Nombres descriptivos**: `'should set withPolicy when isPolicy is true'`
4. **Arrange-Act-Assert**: Seguir el patrón AAA
5. **Un assert por concepto**: Múltiples `expect()` está bien si validan el mismo concepto (jerarquía)
6. **Mocks solo cuando necesario**: Para eventos simples no se necesita mockear nada

---

## Errores Comunes

### ❌ Error 1: No Respetar la Jerarquía Secuencial

**Síntoma**: Evento con `eventLabel3` pero sin `eventLabel2`.

**Incorrecto**:
```dart
static LogEventRequest miEvento() => LogMiEvent(
      params: AnalyticsEventParams(
        eventLabel3: 'Algo', // ❌ Saltando niveles 1, 2, 3
      ),
    );
```

**Correcto**:
```dart
// Opción 1: Construcción directa (solo si es necesario)
static LogEventRequest miEvento() => LogMiEvent(
      params: AnalyticsEventParams(
        eventCategory: 'Cat',      // ✅ Nivel 1
        eventAction: 'Action',      // ✅ Nivel 2
        eventLabel: 'Label',        // ✅ Nivel 3
        eventLabel2: 'Label2',      // ✅ Nivel 4
        eventLabel3: 'Label3',      // ✅ Nivel 5
      ),
    );

// Opción 2: Construcción incremental (RECOMENDADO)
static LogEventRequest nivel1() => LogMiEvent(
      params: AnalyticsEventParams(
        eventCategory: 'Cat',
      ),
    );

static LogEventRequest nivel2() => nivel1().copyWithParams(
      eventAction: 'Action',
    );

static LogEventRequest nivel3() => nivel2().copyWithParams(
      eventLabel: 'Label',
    );

static LogEventRequest nivel4() => nivel3().copyWithParams(
      eventLabel2: 'Label2',
    );

static LogEventRequest miEvento() => nivel4().copyWithParams(
      eventLabel3: 'Label3',
    );
```

### ❌ Error 2: Constantes Hardcodeadas

**Síntoma**: Strings repetidos, errores de tipeo, difícil mantenimiento.

**Incorrecto**:
```dart
static LogEventRequest miEvento() => LogMiEvent(
      params: AnalyticsEventParams(
        eventCategory: 'Agregar mascota', // ❌ Hardcoded
      ),
    );

// En otro lugar
static LogEventRequest otroEvento() => LogMiEvent(
      params: AnalyticsEventParams(
        eventCategory: 'agregar mascota', // ❌ Error de tipeo (minúscula)
      ),
    );
```

**Correcto**:
```dart
// En el archivo de constantes
abstract class MiEventConstants {
  static const String addPet = 'Agregar mascota'; // ✅ Una sola fuente de verdad
}

// En la clase de eventos
static LogEventRequest miEvento() => LogMiEvent(
      params: AnalyticsEventParams(
        eventCategory: MiEventConstants.addPet, // ✅ Usando constante
      ),
    );

static LogEventRequest otroEvento() => LogMiEvent(
      params: AnalyticsEventParams(
        eventCategory: MiEventConstants.addPet, // ✅ Mismo valor, sin errores
      ),
    );
```

### ❌ Error 3: No Pasar el Contexto Necesario

**Síntoma**: Evento necesita datos del estado pero no recibe el Store.

**Incorrecto**:
```dart
// En el evento (sin acceso al estado)
static LogEventRequest miEvento() => LogMiEvent(
      params: AnalyticsEventParams(
        eventCategory: '???', // ❌ ¿De dónde saco el healthPlan?
      ),
    );

// Al disparar
store.dispatch(LogMiEvent.miEvento()); // ❌ Falta contexto
```

**Correcto**:
```dart
// En el evento (con acceso al estado)
static LogEventRequest miEvento({
  required Store<RlvAnalyticsState> store,
  HealthPlan? healthPlan,
}) {
  final plan = healthPlan ?? selectUserHealthPlan(store.state);
  return LogMiEvent(
      params: AnalyticsEventParams(
        eventCategory: plan.planName, // ✅ Usando dato del estado
      ),
    );
}

// Al disparar
store.dispatch(
  LogMiEvent.miEvento(
    store: store,
    healthPlan: currentPlan,
  ),
); // ✅ Pasando contexto
```

### ❌ Error 4: AnalyticsEventName Incorrecto

**Síntoma**: Eventos aparecen en categoría equivocada en analytics.

**Incorrecto**:
```dart
class LogPetsEvent extends LogEventRequest {
  const LogPetsEvent({
    required super.params,
  }) : super(eventName: AnalyticsEventName.health); // ❌ Evento equivocado
}
```

**Correcto**:
```dart
class LogPetsEvent extends LogEventRequest {
  const LogPetsEvent({
    required super.params,
  }) : super(eventName: AnalyticsEventName.pets); // ✅ Evento correcto
}
```

### ❌ Error 5: No Disparar el Evento o Dispararlo en el Lugar Incorrecto

**Síntoma**: Analytics no recibe datos o los recibe después de la acción.

**Incorrecto**:
```dart
// ❌ Opción 1: Nunca se dispara
class MiViewModel {
  Future<void> guardarMascota() async {
    await repository.guardarMascota(); // ❌ Evento nunca se dispara
  }
}

// ❌ Opción 2: Se dispara después de la acción
class MiViewModel {
  Future<void> guardarMascota() async {
    await repository.guardarMascota();
    store.dispatch(LogPetsEvent.savePet()); // ❌ Después de la acción
  }
}

// ❌ Opción 3: Se dispara desde el Widget
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () {
        store.dispatch(LogPetsEvent.savePet()); // ❌ No disparar desde Widget
        viewModel.guardarMascota();
      },
      child: Text('Guardar'),
    );
  }
}
```

**Correcto**:
```dart
// ✅ Disparar desde el ViewModel, ANTES de la acción
class MiViewModel {
  Future<void> guardarMascota() async {
    store.dispatch(LogPetsEvent.savePet()); // ✅ ANTES de la acción, desde ViewModel
    await repository.guardarMascota();
  }
}

// ✅ Widget solo llama al ViewModel
class MyWidget extends StatelessWidget {
  final MiViewModel viewModel;
  
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: viewModel.guardarMascota, // ✅ ViewModel maneja todo
      child: Text('Guardar'),
    );
  }
}
```

### ❌ Error 6: Nombrar Métodos en Español o Sin Sentido

**Síntoma**: Código difícil de leer, no sigue convenciones.

**Incorrecto**:
```dart
static LogEventRequest ver() => ... // ❌ ¿Ver qué?
static LogEventRequest mascotaAgregada() => ... // ❌ Español
static LogEventRequest evt1() => ... // ❌ Sin contexto
```

**Correcto**:
```dart
static LogEventRequest seePetDetail() => ... // ✅ Verbo + sustantivo, inglés
static LogEventRequest petAdded() => ... // ✅ Inglés, descriptivo
static LogEventRequest confirmAddReminder() => ... // ✅ Contexto claro
```

### ❌ Error 7: No Manejar Entry Points

**Síntoma**: Eventos iguales desde diferentes puntos de entrada cuando deberían ser diferentes.

**Incorrecto**:
```dart
static LogEventRequest openVaccination({
  required HealthPlan? healthPlan,
}) {
  // ❌ Siempre retorna el mismo tipo de evento,
  // sin importar desde dónde se accedió
  return VaccinationLogEvent(
    params: AnalyticsEventParams(
      eventCategory: VaccinationEventsConstants.vaccination,
    ),
  );
}
```

**Correcto**:
```dart
static LogEventRequest openVaccination(
  Store<RlvAnalyticsState> store, {
  required HealthPlan? healthPlan,
}) {
  final entryPoint = selectVaccinationEntryPoint(store.state);
  
  // ✅ Retorna diferente evento según el entry point
  if (entryPoint == VaccinationEntryPoint.utilities) {
    return VaccinationLogEvent(
      params: AnalyticsEventParams(
        eventCategory: VaccinationEventsConstants.vaccination,
      ),
    );
  }
  
  return LogHealthEvent.vaccinationDetails(healthPlan: healthPlan);
}
```

### ❌ Error 8: No Hacer Tests o Tests Incompletos

**Síntoma**: Bugs en producción, eventos mal formados.

**Incorrecto**:
```dart
// ❌ Sin tests
// O tests que solo validan el último nivel:
test('savePet should set label', () {
  final event = LogPetsEvent.savePet();
  expect(event.params.eventLabel, PetsEventConstants.savePet); // ❌ Incompleto
});
```

**Correcto**:
```dart
test('savePet should build correct hierarchy', () {
  final event = LogPetsEvent.savePet();
  
  // ✅ Validar TODA la jerarquía
  expect(event.eventName, AnalyticsEventName.pets);
  expect(event.params.eventCategory, PetsEventConstants.addPet);
  expect(event.params.eventAction, PetsEventConstants.addPhoto);
  expect(event.params.eventLabel, PetsEventConstants.savePet);
  expect(event.params.eventLabel2, isNull); // ✅ Validar que no hay más niveles
});
```

---

## Debug y Validación

### Logs de Debug en Desarrollo

En modo debug, el `LogEventMiddleware` automáticamente imprime información detallada del evento:

```
🔥 Firebase Analytics Debug
══════════════════════════════════════════════════
📊 Event Name: AnalyticsEventName.pets
📋 Event Params:
  • Category: Agregar mascota
  • Action: Seleccionar foto
  • Label: Guardar
  • Label2: Mascota agregada
  • Label3: Ver mascota
══════════════════════════════════════════════════
```

**Cómo usar estos logs**:
1. Ejecutar la app en modo debug
2. Realizar la acción del usuario
3. Verificar en la consola que aparezca el log
4. Validar que todos los niveles sean correctos

### Herramientas de Validación

#### 1. Firebase DebugView

- Habilitar debug mode en el dispositivo
- Abrir Firebase Console → DebugView
- Realizar acciones en la app
- Ver eventos en tiempo real con sus parámetros

#### 2. Logs de Consola

```dart
// En desarrollo, puedes agregar logs temporales
static LogEventRequest miEvento() {
  final event = LogMiEvent(...);
  print('📊 Dispatching event: ${event.params}');
  return event;
}
```

#### 3. Tests Unitarios

```bash
# Ejecutar tests del módulo
cd modules/rlv_analytics
flutter test

# Con coverage
flutter test --coverage
```

#### 4. Revisión Manual de Código

Checklist de revisión:
- [ ] Jerarquía secuencial correcta
- [ ] Constantes en lugar de hardcoded
- [ ] Naming conventions en inglés
- [ ] Parámetros necesarios presentes
- [ ] Tests completos

---

## Recursos Adicionales

### Archivos de Referencia en el Proyecto

#### Core
- `modules/rlv_analytics/lib/domain/entities/analytics_event_params.dart` - Estructura de parámetros
- `modules/rlv_analytics/lib/domain/entities/analytics_event_name.dart` - Nombres de eventos
- `modules/rlv_analytics/lib/domain/middlewares/log_event_middleware.dart` - Ejecución de eventos
- `modules/rlv_analytics/lib/utils/base/log_event_request_extensions.dart` - Helpers

#### Ejemplos de Implementación

**Simple (sin estado, sin parámetros)**:
- `modules/rlv_analytics/lib/utils/agent/log_agent_event.dart`
- Test: `modules/rlv_analytics/test/utils/agent/log_agent_event_test.dart`

**Con parámetros dinámicos (bool, enum)**:
- `modules/rlv_analytics/lib/utils/pets/log_pets_event.dart`
- Test: `modules/rlv_analytics/test/utils/pets/log_pets_event_test.dart`

**Con entry points**:
- `modules/rlv_analytics/lib/utils/vaccination_events/vaccination_log_event.dart`
- Test: `modules/rlv_analytics/test/utils/vaccination_events/vaccination_log_event_test.dart`

**Complejo (store, múltiples estados)**:
- `modules/rlv_analytics/lib/utils/health_events/log_health_event.dart`
- `modules/rlv_analytics/lib/utils/health_events/log_medical_record_event.dart`
- Tests: `modules/rlv_analytics/test/utils/health_events/`

### Documentación Relacionada

- **Redux Standards**: `docs/architecture/redux-standards.md`
- **Testing Standards**: `docs/architecture/testing-standards.md`
- **Repository Standards**: `docs/architecture/repository-standards.md`

### Contacto y Soporte

Para dudas sobre implementación de analytics:
- 🎯 **Equipo de Analytics**: Especificaciones y validación de eventos
- 👨‍💻 **Arquitecto de Software**: Patrones de implementación y code review
- 🧪 **QA**: Validación de eventos en diferentes flujos

---

## Apéndices

### A. Template de Especificación para Analytics

Al solicitar la especificación al equipo de analytics, usar este formato:

| # | Pantalla/Flujo | Acción del Usuario | Event Name | Event Category | Event Action | Event Label | Event Label2 | ... | Cuándo Disparar |
|---|----------------|-------------------|------------|----------------|--------------|-------------|--------------|-----|-----------------|
| 1 | Home | Tap "Mascotas" | pets | - | - | - | - | | Al hacer tap en el botón |
| 2 | Mascotas | Tap "Agregar" | pets | Agregar mascota | - | - | - | | Al hacer tap en agregar |
| 3 | Formulario | Tap "Guardar" | pets | Agregar mascota | Seleccionar foto | Guardar | - | | Al hacer tap en guardar |

### B. Checklist de PR para Tags

Al crear un Pull Request con implementación de tags:

```markdown
## Checklist de Tags

- [ ] Especificación de analytics adjunta o referenciada
- [ ] Archivo de constantes creado con naming correcto
- [ ] Clase de eventos implementada con jerarquía secuencial
- [ ] Tests unitarios con coverage > 80%
- [ ] Eventos integrados en los flujos correspondientes
- [ ] Validado en Firebase DebugView (adjuntar screenshot)
- [ ] Code review por par completado
- [ ] Analytics confirmó recepción de eventos

## Screenshots
<!-- Adjuntar screenshots de Firebase DebugView o logs -->
```

### C. Glosario

- **Tag / Tageo**: Implementación de eventos de analytics
- **Event Name**: Categoría principal del evento (ej: SALUD, MASCOTAS)
- **Event Category**: Primera subcategoría (nivel 1)
- **Event Action**: Segunda subcategoría (nivel 2)
- **Event Label**: Tercera subcategoría (nivel 3)
- **Event Label2-9**: Subcategorías adicionales (niveles 4-11)
- **Entry Point**: Punto de entrada de un flujo que determina la variante del evento
- **Store**: Objeto de Redux que contiene el estado global de la app
- **Jerarquía Secuencial**: Los niveles de eventos deben estar completos sin saltos

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0  
**Mantenido por**: Equipo de Arquitectura
