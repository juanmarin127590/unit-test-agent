# 🧪 Estándares de Testing - Flutter

Este documento define los estándares y mejores prácticas para escribir pruebas unitarias en el proyecto Relevant SuperApp Flutter.

---

## 📋 Tabla de Contenidos

- [Configuración General](#configuración-general)
- [Patrón AAA](#patrón-aaa-arrange-act-assert)
- [Gestión de Mocks](#gestión-de-mocks)
- [Orden Recomendado](#orden-recomendado-para-escribir-tests)
- [Estándares por Tipo](#estándares-por-tipo-de-test)
  - [Redux State (Reducers)](#1-tests-de-redux-state-reducers)
  - [Middlewares](#2-tests-de-middlewares-redux)
  - [Widgets](#3-tests-de-widgets)
- [Mejores Prácticas](#mejores-prácticas-específicas)
- [Cobertura de Código](#cobertura-de-código)
- [Checklist](#checklist-antes-de-commit)

---

## ⚙️ **Configuración General**

### Dependencias Requeridas

```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  mockito: ^5.4.0
  build_runner: ^2.4.0
  fpdart: ^1.1.0
```

### Ubicación de Mocks

**IMPORTANTE**: Todos los mocks deben estar centralizados en un único archivo:

```
/test/mocks/mocks.dart
```

**Ejemplo de referencia**: `@modules/rlv_health/test/mocks/mocks.dart`

❌ **NO** crear archivos `.mocks.dart` dispersos por el proyecto.

### Generación de Mocks con Mockito

**Usar `@GenerateNiceMocks` con `MockSpec`:**

```dart
// mocks.dart
import 'package:core_redux/redux.dart';
import 'package:mockito/annotations.dart';
import 'package:rlv_health/di/rlv_health_state.dart';
import 'package:rlv_health/redux/coco/coco.dart';
import 'package:rlv_health/domain/repositories/repositories.dart';

@GenerateNiceMocks([
  MockSpec<Store<RlvHealthState>>(),
  MockSpec<RlvHealthState>(),
  MockSpec<HealthState>(),
  MockSpec<CocoState>(),
  MockSpec<CocoRepository>(),
  MockSpec<HealthRepository>(),
  MockSpec<CheckProfessionalAvailabilityState>(),
  MockSpec<ProfessionalsListState>(),
  // ... todos los mocks del proyecto
])
void main() {}
```

**Referencia:** `@modules/rlv_health/test/mocks/mocks.dart`

Generar mocks:
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

---

## 🎯 **Patrón AAA (Arrange-Act-Assert)**

Todos los tests deben seguir el patrón AAA:

```dart
test('should do something when condition happens', () {
  // Arrange - Configurar datos y mocks
  final input = 'test';
  when(mockRepository.getData()).thenAnswer((_) async => right(data));

  // Act - Ejecutar la acción a probar
  final result = await service.process(input);

  // Assert - Verificar el resultado
  expect(result.isRight(), true);
  verify(mockRepository.getData()).called(1);
});
```

---

## 📦 **Gestión de Mocks**

### Builder Pattern para Entidades

**OBLIGATORIO**: Usar builders para crear entidades de prueba.

```dart
final professional = ProfessionalBuilder()
    .withId(123)
    .withName('Dr. John Doe')
    .withServiceId(456)
    .build();

final availability = ProfessionalAvailabilityBuilder()
    .withProfessionalId(123)
    .withAvailability([
      AvailabilityDayBuilder()
          .withDate(DateTime.now())
          .build()
    ])
    .build();
```

### Setup y Teardown

```dart
late MockRepository mockRepository;
late Service service;

setUp(() {
  mockRepository = MockRepository();
  service = Service(mockRepository);
  
  // Configurar dummies para Either
  provideDummy<Either<Failure, Data>>(Right(data));
  provideDummy<Either<Failure, Data>>(const Left(failure));
});

tearDown(() {
  reset(mockRepository);
});
```

---

## 🎯 **Orden Recomendado para Escribir Tests**

Al desarrollar una nueva funcionalidad, sigue este orden para escribir tests:

### 1. Testing de Redux State (Reducers)

**Por qué primero**: Los reducers definen las transiciones de estado y son la base de la lógica de Redux.

```dart
// Ejemplo: check_professional_availability_reducer_test.dart
test('should set loading state correctly when _SetLoading action is dispatched', () {
  // Arrange, Act, Assert
});
```

### 2. Testing de Middlewares

**Por qué segundo**: Los middlewares orquestan la lógica de negocio y **es donde se prueban los repositorios**. No se hacen tests directos de repositorios.

```dart
// Ejemplo: get_professional_availability_middleware_test.dart
test('should call repository with correct parameters and dispatch success', () async {
  // Aquí se verifica el comportamiento del repositorio indirectamente
});
```

### 3. Testing de Widgets

**Por qué tercero**: Los widgets dependen del estado de Redux, que ya está probado.

```dart
// Ejemplo: check_professional_availability_component_test.dart
testWidgets('should dispatch initial actions onInit', (tester) async {
  // ...
});
```

**IMPORTANTE**: ❌ **NO** se hacen tests unitarios directamente de repositorios. Los repositorios se prueban **indirectamente** a través de los middlewares.

---

## 🧪 **Estándares por Tipo de Test**

### 1. Tests de Redux State (Reducers)

Los reducers transforman el estado de la aplicación en respuesta a acciones.

```dart
void main() {
  group('CheckProfessionalAvailabilityReducer', () {
    test('should set loading state when _SetLoading action is dispatched', () {
      // Arrange
      const initialState = CheckProfessionalAvailabilityState.initial();
      const action = CheckProfessionalAvailabilityAction._setLoading();

      // Act
      final newState = checkProfessionalAvailabilityReducer(initialState, action);

      // Assert
      expect(newState.status, Status.loading);
      expect(newState.isLoading, true);
      expect(newState.professionalAvailability, isNull);
    });

    test('should update state with availability data when _SetAvailability is dispatched', () {
      // Arrange
      const initialState = CheckProfessionalAvailabilityState.loading();
      final availability = ProfessionalAvailabilityBuilder().build();
      final action = CheckProfessionalAvailabilityAction._setAvailability(availability);

      // Act
      final newState = checkProfessionalAvailabilityReducer(initialState, action);

      // Assert
      expect(newState.status, Status.success);
      expect(newState.professionalAvailability, availability);
      expect(newState.isLoading, false);
    });

    test('should set failure state when _SetFailure action is dispatched', () {
      // Arrange
      const initialState = CheckProfessionalAvailabilityState.loading();
      const failure = CustomFailure('Error loading availability');
      const action = CheckProfessionalAvailabilityAction._setFailure(failure);

      // Act
      final newState = checkProfessionalAvailabilityReducer(initialState, action);

      // Assert
      expect(newState.status, Status.failure);
      expect(newState.failure, failure);
      expect(newState.isLoading, false);
    });

    test('should reset state to initial when _Reset action is dispatched', () {
      // Arrange
      final currentState = CheckProfessionalAvailabilityState.success(
        professionalAvailability: ProfessionalAvailabilityBuilder().build(),
      );
      const action = CheckProfessionalAvailabilityAction._reset();

      // Act
      final newState = checkProfessionalAvailabilityReducer(currentState, action);

      // Assert
      expect(newState, const CheckProfessionalAvailabilityState.initial());
      expect(newState.status, Status.initial);
      expect(newState.professionalAvailability, isNull);
    });
  });
}
```

**Verificaciones comunes**:
- ✅ Transiciones de estado correctas (initial → loading → success/failure)
- ✅ Datos correctamente asignados en el nuevo estado
- ✅ Inmutabilidad del estado (no se modifica el estado anterior)
- ✅ Reset a estado inicial funciona correctamente

---

### 2. Tests de Middlewares Redux

Los middlewares manejan acciones asíncronas y llamadas a repositorios en Redux. **Aquí es donde se prueban los repositorios**, no directamente.

```dart
void main() {
  late GetProfessionalAvailabilityMiddleware middleware;
  late MockCocoRepository mockCocoRepository;
  late MockStore mockStore;
  late MockRlvHealthState mockRlvHealthState;
  late MockHealthState mockHealthState;
  late MockCocoState mockCocoState;
  late MockOnlineExternalScheduleState mockOnlineExternalScheduleState;
  late MockProfessionalsListState mockProfessionalsListState;

  final professional = ProfessionalBuilder()
      .withId(123)
      .withName('Dr. John Doe')
      .build();

  final availability = ProfessionalAvailabilityBuilder()
      .withProfessionalId(123)
      .build();

  setUp(() {
    middleware = GetProfessionalAvailabilityMiddleware();
    mockCocoRepository = MockCocoRepository();
    mockStore = MockStore();
    mockRlvHealthState = MockRlvHealthState();
    mockHealthState = MockHealthState();
    mockCocoState = MockCocoState();
    mockOnlineExternalScheduleState = MockOnlineExternalScheduleState();
    mockProfessionalsListState = MockProfessionalsListState();

    GetIt.I.allowReassignment = true;
    GetIt.I.registerSingleton<CocoRepository>(mockCocoRepository);

    provideDummy<Either<Failure, ProfessionalAvailability>>(Right(availability));

    // Configurar mocks de estados anidados
    when(mockCocoState.onlineExternalScheduleState)
        .thenReturn(mockOnlineExternalScheduleState);
    when(mockCocoState.professionalsListState)
        .thenReturn(mockProfessionalsListState);
    when(mockHealthState.cocoState).thenReturn(mockCocoState);
    when(mockRlvHealthState.healthState).thenReturn(mockHealthState);
    when(mockStore.state).thenReturn(mockRlvHealthState);
  });

  tearDown(() {
    reset(mockCocoRepository);
    reset(mockStore);
    reset(mockRlvHealthState);
  });

  group('GetProfessionalAvailabilityMiddleware', () {
    test('should call repository with correct parameters and dispatch success', () async {
      // Arrange
      when(mockProfessionalsListState.selectedProfessional)
          .thenReturn(professional);
      when(mockCocoRepository.getProfessionalAvailability(
        professionalId: professional.professionalId,
        serviceId: professional.specialtyId,
        placeId: professional.placeId,
        startDate: anyNamed('startDate'),
      )).thenAnswer((_) async => right(availability));

      // Act
      await middleware.run(mockStore, const GetProfessionalAvailabilityRequest(), (_) {});

      // Assert
      verifyInOrder([
        mockStore.dispatch(const CheckProfessionalAvailabilityAction.setLoading()),
        mockCocoRepository.getProfessionalAvailability(
          professionalId: professional.professionalId,
          serviceId: professional.specialtyId,
          placeId: professional.placeId,
          startDate: anyNamed('startDate'),
        ),
        mockStore.dispatch(
            CheckProfessionalAvailabilityAction.setAvailability(availability)),
      ]);

      verifyNoMoreInteractions(mockCocoRepository);
    });

    test('should dispatch setFailure when selectedProfessional is null', () async {
      // Arrange
      when(mockProfessionalsListState.selectedProfessional).thenReturn(null);

      // Act
      await middleware.run(mockStore, const GetProfessionalAvailabilityRequest(), (_) {});

      // Assert
      verifyInOrder([
        mockStore.dispatch(const CheckProfessionalAvailabilityAction.setLoading()),
        mockStore.dispatch(const CheckProfessionalAvailabilityAction.setFailure(
            CustomFailure('No professional selected'))),
      ]);

      verifyNever(mockCocoRepository.getProfessionalAvailability(
        professionalId: anyNamed('professionalId'),
        serviceId: anyNamed('serviceId'),
        placeId: anyNamed('placeId'),
        startDate: anyNamed('startDate'),
      ));
    });
  });
}
```

**Verificaciones comunes**:
- ✅ Dispatch de acciones en orden correcto con `verifyInOrder`
- ✅ Llamadas al repositorio con parámetros correctos
- ✅ Manejo de casos edge (datos null, estados inválidos)
- ✅ `verifyNoMoreInteractions` para asegurar no hay llamadas extra
- ✅ Mock de estados anidados de Redux correctamente configurados

---

### 3. Tests de Widgets

**Buena práctica**: Mock del Redux State completo para widget tests.

```dart
void main() {
  late MockStore mockStore;
  late MockRlvHealthState mockRlvHealthState;
  late MockHealthState mockHealthState;
  late MockCocoState mockCocoState;
  late MockCheckProfessionalAvailabilityState mockCheckAvailabilityState;
  late MockOnlineExternalScheduleState mockOnlineExternalScheduleState;
  late MockProfessionalsListState mockProfessionalsListState;

  setUp(() {
    mockStore = MockStore();
    mockRlvHealthState = MockRlvHealthState();
    mockHealthState = MockHealthState();
    mockCocoState = MockCocoState();
    mockCheckAvailabilityState = MockCheckProfessionalAvailabilityState();
    mockOnlineExternalScheduleState = MockOnlineExternalScheduleState();
    mockProfessionalsListState = MockProfessionalsListState();

    // Configurar la jerarquía completa del estado Redux
    when(mockStore.state).thenReturn(mockRlvHealthState);
    when(mockRlvHealthState.healthState).thenReturn(mockHealthState);
    when(mockHealthState.cocoState).thenReturn(mockCocoState);
    when(mockCocoState.checkProfessionalAvailabilityState)
        .thenReturn(mockCheckAvailabilityState);
    when(mockCocoState.onlineExternalScheduleState)
        .thenReturn(mockOnlineExternalScheduleState);
    when(mockCocoState.professionalsListState)
        .thenReturn(mockProfessionalsListState);
  });

  tearDown(() {
    reset(mockStore);
    reset(mockRlvHealthState);
    reset(mockHealthState);
    reset(mockCocoState);
    reset(mockCheckAvailabilityState);
    reset(mockOnlineExternalScheduleState);
    reset(mockProfessionalsListState);
  });

  // Helper para wrapper con localizaciones y StoreProvider
  Widget wrapperWidget(Widget child) {
    return StoreProvider(
      store: mockStore,
      child: MaterialApp(
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
          CoreLocalizations.delegate,
          HealthLocalizations.delegate,
        ],
        supportedLocales: HealthLocalizations.supportedLocales,
        home: Scaffold(body: child),
      ),
    );
  }

  group('CheckProfessionalAvailabilityComponent', () {
    testWidgets('should dispatch initial actions onInit',
        (WidgetTester tester) async {
      // Arrange
      when(mockCheckAvailabilityState.status).thenReturn(Status.loading);
      when(mockCheckAvailabilityState.isLoading).thenReturn(true);
      when(mockOnlineExternalScheduleState.selectedDate)
          .thenReturn(DateTime.now());
      when(mockProfessionalsListState.selectedProfessional)
          .thenReturn(ProfessionalBuilder().build());

      // Act
      await tester.pumpWidget(
          wrapperWidget(const CheckProfessionalAvailabilityComponent()));

      // Assert
      verify(mockStore
              .dispatch(const CheckProfessionalAvailabilityAction.reset()))
          .called(1);
      verify(mockStore.dispatch(const GetProfessionalAvailabilityRequest()))
          .called(1);
    });

    testWidgets('should dispatch action when slot is selected',
        (WidgetTester tester) async {
      // Arrange
      final slot = AvailabilitySlotBuilder().build();
      final availability = ProfessionalAvailabilityBuilder()
          .withAvailability([
            AvailabilityDayBuilder()
                .withAvailableSlots([slot])
                .build()
          ]).build();

      when(mockCheckAvailabilityState.status).thenReturn(Status.success);
      when(mockCheckAvailabilityState.professionalAvailability)
          .thenReturn(availability);
      when(mockOnlineExternalScheduleState.selectedDate)
          .thenReturn(DateTime.now());

      // Act
      await tester.pumpWidget(
          wrapperWidget(const CheckProfessionalAvailabilityComponent()));
      await tester.pumpAndSettle();

      // Limpiar llamadas previas del onInit
      clearInteractions(mockStore);

      // Simular selección de slot a través del ViewModel
      final viewModel =
          CheckProfessionalAvailabilityViewModel.fromStore(mockStore);
      viewModel.onSlotSelected(slot);

      // Assert
      verify(mockStore
              .dispatch(CheckProfessionalAvailabilityAction.selectSlot(slot)))
          .called(1);
    });
  });
}
```

**Verificaciones comunes**:
- ✅ Configuración completa de jerarquía de estados Redux mockeados
- ✅ Uso de `wrapperWidget` helper para localizaciones y StoreProvider
- ✅ `clearInteractions` para limpiar dispatches del onInit
- ✅ Interacción a través del ViewModel en lugar de tocar UI directamente
- ✅ `pumpAndSettle` para esperar animaciones y renders completos
- ✅ Uso de builders para crear datos de prueba

---

## 🚀 **Mejores Prácticas Específicas**

### Manejo de Dependency Injection en Tests

```dart
// ✅ CORRECTO - Permitir reasignación y limpiar después
setUp(() {
  GetIt.I.allowReassignment = true;
  GetIt.I.registerSingleton<CocoRepository>(mockRepository);
});

tearDown() {
  GetIt.I.reset();
  // También hacer reset de todos los mocks
  reset(mockStore);
  reset(mockCocoRepository);
});
```

### Mock de Estados Anidados de Redux

**RECOMENDACIÓN IMPORTANTE**: Configurar correctamente la jerarquía completa de estados mockeados.

```dart
// ✅ CORRECTO - Mock completo de jerarquía de estados
setUp(() {
  mockStore = MockStore();
  mockRlvHealthState = MockRlvHealthState();
  mockHealthState = MockHealthState();
  mockCocoState = MockCocoState();
  mockCheckAvailabilityState = MockCheckProfessionalAvailabilityState();
  
  // Configurar la cadena completa de estados
  when(mockStore.state).thenReturn(mockRlvHealthState);
  when(mockRlvHealthState.healthState).thenReturn(mockHealthState);
  when(mockHealthState.cocoState).thenReturn(mockCocoState);
  when(mockCocoState.checkProfessionalAvailabilityState)
      .thenReturn(mockCheckAvailabilityState);
});

// ❌ INCORRECTO - Mock parcial que puede causar null references
setUp(() {
  mockStore = MockStore();
  when(mockStore.state.healthState.cocoState)
      .thenReturn(mockCocoState); // Esto puede fallar
});
```

### Uso de `clearInteractions` en Widget Tests

Cuando un widget dispara acciones en `onInit`, usa `clearInteractions` antes de verificar acciones del test.

```dart
testWidgets('should dispatch action when slot is selected', (tester) async {
  // Arrange
  await tester.pumpWidget(wrapperWidget(const MyComponent()));
  await tester.pumpAndSettle();

  // ✅ CORRECTO - Limpiar interacciones del onInit
  clearInteractions(mockStore);

  // Act
  final viewModel = MyViewModel.fromStore(mockStore);
  viewModel.onSlotSelected(slot);

  // Assert
  verify(mockStore.dispatch(MyAction.selectSlot(slot))).called(1);
});
```

### Uso de `verifyInOrder` para Secuencias de Dispatches

```dart
// ✅ CORRECTO - Verificar orden de dispatches en middlewares
test('should dispatch actions in correct order', () async {
  // Act
  await middleware.run(mockStore, request, (_) {});

  // Assert
  verifyInOrder([
    mockStore.dispatch(const MyAction.setLoading()),
    mockRepository.getData(params),
    mockStore.dispatch(MyAction.setSuccess(data)),
  ]);
  
  verifyNoMoreInteractions(mockRepository);
});
```

---

## 📊 **Cobertura de Código**

### Umbrales de Cobertura

| Tipo de Código              | Umbral Mínimo | Herramienta           |
| --------------------------- | ------------- | --------------------- |
| **Middlewares**             | 80%           | flutter test --coverage |
| **Redux States (Reducers)** | 80%           | flutter test --coverage |
| **Widgets (Recomendado)**   | 60%           | flutter test --coverage |
| **Proyecto General**        | 70%           | melos coverage_report |

**Nota**: Los repositorios NO tienen umbral de cobertura porque se prueban indirectamente a través de middlewares.

### Generación de Reportes de Cobertura

#### Por Módulo Individual
```bash
cd modules/rlv_health
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

#### Para Todo el Proyecto (con Melos)
```bash
melos coverage_report
```

Esto genera un reporte consolidado de cobertura de todos los módulos.

### Excluir Archivos de Cobertura

Editar `analysis_options.yaml`:
```yaml
analyzer:
  exclude:
    - '**/*.g.dart'
    - '**/*.freezed.dart'
    - '**/*.mocks.dart'
    - '**/mocks.dart'
    - 'test/**'
```

---

## ✅ **Checklist Antes de Commit**

- [ ] ✅ Todos los mocks están en `/test/mocks/mocks.dart`
- [ ] ✅ No existen archivos `.mocks.dart` dispersos en el proyecto
- [ ] ✅ Los tests siguen el patrón AAA (Arrange-Act-Assert)
- [ ] ✅ Los nombres de tests describen claramente el comportamiento esperado
- [ ] ✅ Se usan builders para crear entidades en tests
- [ ] ✅ Los tests de middlewares verifican dispatch de acciones con `verifyInOrder`
- [ ] ✅ Los tests de middlewares prueban indirectamente los repositorios (NO tests directos de repos)
- [ ] ✅ Los tests de reducers verifican transiciones de estado correctas
- [ ] ✅ Los widget tests mockean la jerarquía completa de Redux state
- [ ] ✅ Se usa `clearInteractions` en widgets después de `onInit`
- [ ] ✅ La cobertura cumple con los umbrales mínimos
- [ ] ✅ No hay tests comentados o deshabilitados sin justificación
- [ ] ✅ Los tests son independientes y no dependen del orden de ejecución
- [ ] ✅ Se usa `verifyNoMoreInteractions` para asegurar no hay llamadas extra

---

## 📚 **Referencias**

- [Flutter Testing](https://docs.flutter.dev/testing)
- [Mockito Documentation](https://pub.dev/packages/mockito)
- [Redux Testing Best Practices](https://redux.js.org/usage/writing-tests)
- Ejemplos en el proyecto:
  - `@modules/rlv_health/test/redux/coco/check_professional_availability/middlewares/get_professional_availability_middleware_test.dart`
  - `@modules/rlv_health/test/redux/coco/check_professional_availability/check_professional_availability_reducer_test.dart`
  - `@modules/rlv_health/test/presentation/coco/check_professional_availability/check_professional_availability_component_test.dart`
