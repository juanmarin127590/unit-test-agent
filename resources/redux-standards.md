# 🔄 Estándares de Redux - Flutter

Este documento define los estándares y mejores prácticas para implementar Redux en el proyecto Relevant SuperApp Flutter.

---

## 📋 Tabla de Contenidos

- [Arquitectura Redux](#arquitectura-redux)
- [Estados (States)](#estados-states)
- [Acciones (Actions)](#acciones-actions)
- [Reducers](#reducers)
- [Middlewares](#middlewares)
- [Selectores y ViewModels](#selectores-y-viewmodels)
- [Mejores Prácticas](#mejores-prácticas)

---

## 🏗️ **Arquitectura Redux**

### Estructura de Directorios

```
lib/redux/
├── [feature_name]/
│   ├── [feature_name]_state.dart          # Estado
│   ├── [feature_name]_actions.dart        # Acciones
│   ├── [feature_name]_reducer.dart        # Reducer
│   ├── [feature_name]_selectors.dart      # Selectores
│   └── middlewares/
│       └── [action]_middleware.dart       # Middlewares
└── [feature-module]_state.dart                        # Estado del módulo
```

**Ejemplo:** `@modules/rlv_pets/lib/redux/policy_details/`

### Flujo de Datos

```
UI → dispatch(Action) → Middleware → Repository → Middleware → dispatch(Action) → Reducer → New State → UI
```

---

## 📦 **Estados (States)**

### Usando Freezed para Estados Inmutables

```dart
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:core_shared/core_shared.dart';

part 'check_professional_availability_state.freezed.dart';

@freezed
class CheckProfessionalAvailabilityState with _$CheckProfessionalAvailabilityState {
  const factory CheckProfessionalAvailabilityState({
    required Status status,
    ProfessionalAvailability? professionalAvailability,
    AvailabilitySlot? selectedSlot,
    Failure? failure,
  }) = _CheckProfessionalAvailabilityState;

  // Factory constructors para estados comunes
  factory CheckProfessionalAvailabilityState.initial() =>
      const CheckProfessionalAvailabilityState(
        status: Status.initial,
      );
}

// Extension para getters útiles
extension CheckProfessionalAvailabilityStateX on CheckProfessionalAvailabilityState {
  bool get hasAvailability => professionalAvailability != null;
}
```

### Enum Status

Usar el enum `Status` de `core_shared` para representar estados de carga:

```dart
enum Status {
  initial,
  loading,
  success,
  failure,
}
```

### Convenciones de Nombres

- **Estados**: `[FeatureName]State`
- **Factory constructors**: `initial()`, `loading()`, `success()`, `failure()`
- **Propiedades**: camelCase, nombres descriptivos
- **Extensions**: `[FeatureName]StateX`

---

## 🎬 **Acciones (Actions)**

### Usando Freezed para Acciones

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'check_professional_availability_actions.freezed.dart';

@freezed
class CheckProfessionalAvailabilityAction with _$CheckProfessionalAvailabilityAction {
  // Acciones públicas (dispatched desde UI o ViewModels)
  const factory CheckProfessionalAvailabilityAction.reset() = 
      _Reset;
  
  const factory CheckProfessionalAvailabilityAction.selectSlot(
    AvailabilitySlot slot,
  ) = _SelectSlot;

  // Acciones internas (dispatched desde middlewares)
  const factory CheckProfessionalAvailabilityAction._setLoading() = 
      _SetLoading;
  
  const factory CheckProfessionalAvailabilityAction._setAvailability(
    ProfessionalAvailability availability,
  ) = _SetAvailability;
  
  const factory CheckProfessionalAvailabilityAction._setFailure(
    Failure failure,
  ) = _SetFailure;
}

// Middleware Request Actions (para operaciones asíncronas)
class GetCocoProfessionalsRequest extends Request {
  const GetCocoProfessionalsRequest();
}
```

### Convenciones de Nombres

#### Acciones Públicas
- Nombres descriptivos en presente: `selectSlot`, `reset`, `updateFilter`
- Sin prefijo underscore

#### Acciones Internas (Middlewares)
- Prefijo underscore: `_setLoading`, `_setSuccess`, `_setFailure`
- Patrones comunes:
  - `_setLoading`: Indica inicio de operación asíncrona
  - `_set[Entity]`: Actualiza entidad en el estado
  - `_setFailure`: Indica error en operación

#### Request Actions (Middlewares)
- Sufijo `Request`: `GetProfessionalAvailabilityRequest`
- Representan intención de ejecutar operación asíncrona
- No modifican el estado directamente

### Tipos de Acciones

```dart
// 1. Acciones de UI (públicas)
const factory MyAction.buttonPressed() = _ButtonPressed;
const factory MyAction.inputChanged(String value) = _InputChanged;

// 2. Acciones de Middleware (internas)
const factory MyAction._setLoading() = _SetLoading;
const factory MyAction._setData(Data data) = _SetData;
const factory MyAction._setError(Failure failure) = _SetError;

// 3. Request Actions (para middlewares)
class GetCocoProfessionalsRequest extends Request {
  const GetCocoProfessionalsRequest();
}

// 4. Acciones de Navegación
const factory MyAction.navigateToDetail(String id) = _NavigateToDetail;
```

---

## ⚙️ **Reducers**

### Implementación de Reducer

Los reducers deben usar **switch pattern** para manejar las acciones. La action ya viene tipada, no es `dynamic`.

```dart
part of 'check_professional_availability_action.dart';

CheckProfessionalAvailabilityState checkProfessionalAvailabilityReducer(
  CheckProfessionalAvailabilityState state,
  CheckProfessionalAvailabilityAction action,
) {
  return switch (action) {
    _Reset() => CheckProfessionalAvailabilityState(),
    
    _SelectSlot(:final slot) => state.copyWith(
        selectedSlot: slot,
      ),

    _SetLoading() => state.copyWith(
        status: Status.loading,
        failure: null,
        selectedSlot: null,
      ),
    
    _SetAvailability(:final professionalAvailability) => state.copyWith(
        status: Status.success,
        professionalAvailability: professionalAvailability,
      ),
    
    _SetFailure(:final failure) => state.copyWith(
        status: Status.failure,
        failure: failure,
        professionalAvailability: null,
      ),
  };
}
```

**Referencia:** `@modules/rlv_health/lib/redux/coco/check_professional_availability/check_professional_availability_reducer.dart`

### Integración con el Reducer del Módulo

```dart
// Combinar reducer en el reducer principal del módulo
Reducer<CocoState> cocoReducer = combineReducers<CocoState>([
  TypedReducer<CocoState, CheckProfessionalAvailabilityAction>(
    _checkProfessionalAvailabilityReducer,
  ).call,
  // ... otros reducers
]);

CocoState _checkProfessionalAvailabilityReducer(
  CocoState state,
  CheckProfessionalAvailabilityAction action,
) {
  return state.copyWith(
    checkProfessionalAvailabilityState: checkProfessionalAvailabilityReducer(
      state.checkProfessionalAvailabilityState,
      action,
    ),
  );
}
```

### Reglas de Reducers

1. **Pureza**: Los reducers deben ser funciones puras
   ```dart
   // ✅ CORRECTO - Función pura
   State reducer(State state, Action action) {
     return state.copyWith(value: action.value);
   }

   // ❌ INCORRECTO - Tiene side effects
   State reducer(State state, Action action) {
     repository.save(action.value); // Side effect!
     return state.copyWith(value: action.value);
   }
   ```

2. **Inmutabilidad**: Nunca modificar el estado directamente
   ```dart
   // ✅ CORRECTO - Crea nuevo estado
   return state.copyWith(count: state.count + 1);

   // ❌ INCORRECTO - Modifica estado existente
   state.count++; // ¡No hacer esto!
   return state;
   ```

3. **Sin lógica asíncrona**: Los reducers deben ser síncronos
   ```dart
   // ❌ INCORRECTO - Operación asíncrona
   State reducer(State state, Action action) async {
     final data = await repository.getData();
     return state.copyWith(data: data);
   }
   ```

4. **Un reducer por feature state**: Cada feature debe tener su propio reducer

---

## 🔀 **Middlewares**

### Estructura de Middleware

Los middlewares deben heredar de `BaseMiddleware<AppState, RequestType>` donde `RequestType` hereda de la clase abstracta `Request`.

**Request Action:**
```dart
import 'package:core_redux/redux.dart';

class GetProfessionalsRequest extends Request {
  final String date;
  final String serviceCode;
  final String ipsCode;
  final String cityCode;

  const GetProfessionalsRequest({
    required this.date,
    required this.serviceCode,
    required this.ipsCode,
    required this.cityCode,
  });

}
```

**Middleware:**
```dart
import 'package:core_di/di.dart';
import 'package:core_redux/redux.dart';
import 'package:rlv_health/di/rlv_health_state.dart';
import 'package:rlv_health/domain/entities/professional_info_appointment.dart';
import 'package:rlv_health/domain/repositories/health_repository.dart';
import 'package:rlv_health/redux/schedule_initial_filter/schedule_initial_filter_actions.dart';

class GetProfessionalsMiddleware
    extends BaseMiddleware<RlvHealthState, GetProfessionalsRequest> {
  @override
  Future run(Store<RlvHealthState> store, GetProfessionalsRequest request,
      NextDispatcher next) async {
    // 1. Dispatch loading state
    store.dispatch(const SetScheduleInitialFilterLoading());
    
    // 2. Obtener dependencias con GetIt
    final repository = GetIt.instance.get<HealthRepository>();
    
    // 3. Llamar al repositorio con los datos del request
    final response = await repository.getProfessionals(
      date: request.date,
      serviceCode: request.serviceCode,
      ipsCode: request.ipsCode,
      cityCode: request.cityCode,
    );
    
    // 4. Procesar resultado con fold
    response.fold(
      (failure) => store.dispatch(SetScheduleInitialFilterFailure(failure)),
      (professionals) {
        store.dispatch(
            SetScheduleInitialFilterProfessionals(professionals));
      },
    );
  }
}
```

**Referencia:** `@modules/rlv_health/lib/domain/middlewares/get_professionals_middleware.dart`

### Middleware Pattern

```dart
import 'package:core_di/di.dart';
import 'package:core_redux/redux.dart';

// 1. Definir Request que hereda de Request
class [Action]Request extends Request {
  final ParamType param;

  const [Action]Request({
    required this.param,
  });

  @override
  List<Object?> get props => [
        ...super.props,
        param,
      ];
}

// 2. Crear Middleware que hereda de BaseMiddleware
class [Action]Middleware extends BaseMiddleware<AppState, [Action]Request> {
  @override
  Future run(
    Store<AppState> store,
    [Action]Request request,
    NextDispatcher next,
  ) async {
    // 1. Dispatch loading
    store.dispatch(const MyAction._setLoading());

    // 2. Get dependencies con GetIt
    final repo = GetIt.instance.get<MyRepository>();

    // 3. Get data from state (if needed)
    final data = store.state.someData;

    // 4. Validate (if needed)
    if (!isValid(data)) {
      store.dispatch(const MyAction._setFailure(ValidationFailure()));
      return;
    }

    // 5. Call repository usando datos del request
    final result = await repo.fetchData(
      param: request.param,
    );

    // 6. Process result con fold
    result.fold(
      (failure) => store.dispatch(MyAction._setFailure(failure)),
      (data) => store.dispatch(MyAction._setData(data)),
    );
  }
}
```

### Registro de Middlewares

```dart
import 'package:core_di/di.dart';
import 'package:core_redux/redux.dart';

@override
Set<Middleware<T>> get middlewares => {
      UpdatePetPhotoMiddleware().call,
      AddPetsNoPolicyMiddleware().call,
      GetPetsMiddleware().call,
      GetPetInfoMiddleware().call,
      DeletePetsNoPolicyMiddleware().call,
      // ... otros middlewares
    };
```

**Referencia:** `@modules/rlv_pets/lib/di/rlv_pets_dependencies.dart`

### Mejores Prácticas de Middlewares

1. **Request hereda de Request**: Todas las request actions deben heredar de la clase abstracta `Request`
2. **Middleware hereda de BaseMiddleware**: Usar `BaseMiddleware<AppState, RequestType>`
3. **Un middleware por request action**
4. **Siempre dispatch loading primero**
5. **Usar GetIt.instance.get<T>() para dependencias**
6. **Validar datos antes de llamar al repositorio**
7. **Manejar ambos casos con fold: success y failure**
8. **No mutar el estado directamente**
9. **Registrar middlewares con .call en el set de middlewares**
3. **Usar GetIt.instance.get<T>() para dependencias**
4. **Validar datos antes de llamar al repositorio**
5. **Manejar ambos casos: success y failure**
6. **No mutar el estado directamente**

---

## 🔍 **Selectores y ViewModels**

### Selectores

Los selectores son funciones puras que extraen datos del estado global. Se deben definir en archivos `[feature]_selectors.dart`.

**Ejemplo:**
```dart
import 'package:core_shared/core_shared.dart';
import 'package:rlv_pets/di/rlv_pets_state.dart';

import 'policy_details_state.dart';

PolicyDetailsState selectPolicyDetailsState(RlvPetsState state) =>
    state.petsState.policyDetailsState;

bool policyDetailsIsLoading(RlvPetsState state) =>
    selectPolicyDetailsState(state).isLoading;

Failure? policyDetailsHasFailure(RlvPetsState state) =>
    selectPolicyDetailsState(state).failure;
```

**Referencia:** `@modules/rlv_pets/lib/redux/policy_details/policy_details_selectors.dart`

### ViewModel Pattern

Los ViewModels transforman el estado de Redux en datos específicos para la UI y exponen callbacks para acciones del usuario.

```dart
import 'package:core_redux/redux.dart';
import 'package:flutter/material.dart';
import 'package:rlv_pets/domain/entities/entities.dart';
import '../../redux/policy_details/policy_details.dart';

class PolicyDetailsViewModel {
  final Policy? policy;
  final bool isLoading;
  final Function(BuildContext context) seePolicyCoverages;

  const PolicyDetailsViewModel({
    this.policy,
    required this.isLoading,
    required this.seePolicyCoverages,
  });

  factory PolicyDetailsViewModel.fromStore(
    PolicyDetailsState state,
  ) {
    return PolicyDetailsViewModel(
      policy: state.policy,
      isLoading: state.isLoading,
      seePolicyCoverages: (context) {
        final store = StoreProvider.of(context);
        store.dispatch(LogPetsEvent.planCoverages(true));
      },
    );
  }

  // Getters derivados en el ViewModel
  bool get hasPolicyData => policy != null;
  bool get canViewCoverages => hasPolicyData && !isLoading;
}
```

**Referencia:** `@modules/rlv_pets/lib/presentation/policy_details/policy_details_view_model.dart`

### Uso en Widgets

El Component usa el Connector pasando una función `builder` que recibe el `viewModel` y construye la UI.

**Component:**
```dart
import 'package:flutter/material.dart';
import 'package:core_ui/resources/colors/sura_colors.dart';
import 'package:core_ui/resources/constants/dimensions.dart';
import 'package:core_ui/theme/styles/sura_text_styles.dart';
import 'package:rlv_health/l10n/health_localizations_extensions.dart';
import 'package:rlv_health/presentation/coco/widgets/widgets.dart';

import 'check_professional_availability_connector.dart';
import 'widgets/widgets.dart';

class CheckProfessionalAvailabilityComponent extends StatelessWidget {
  const CheckProfessionalAvailabilityComponent({super.key});

  @override
  Widget build(BuildContext context) {
    return CheckProfessionalAvailabilityConnector(
      builder: (context, viewModel) {
        // Validaciones iniciales
        if (!viewModel.hasValidSelections || viewModel.isLoading) {
          return const SizedBox.shrink();
        }
        
        // Construir UI con los datos del viewModel
        return CustomScrollView(
          slivers: [
            SpecialtyHeader(
              specialtyName: viewModel.specialty,
              municipalityName: viewModel.municipality,
            ),
            //... otros widgets
          ],
        );
      },
    );
  }
}
```

**Connector:**
```dart
import 'package:core_redux/redux.dart' hide Failure;
import 'package:core_shared/core_shared.dart';
import 'package:core_ui/widgets/alerts/sura_pop_up_alert/sura_pop_up_alert.dart';
import 'package:flutter/widgets.dart';
import 'package:rlv_health/di/rlv_health_state.dart';
import 'package:rlv_health/redux/coco/coco.dart';

import 'check_professional_availability_view_model.dart';

class CheckProfessionalAvailabilityConnector extends StatelessWidget {
  final Widget Function(
    BuildContext context,
    CheckProfessionalAvailabilityViewModel viewModel,
  ) builder;
  
  const CheckProfessionalAvailabilityConnector({
    super.key,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return ResourceConnector<RlvHealthState,
        CheckProfessionalAvailabilityViewModel>(
      onInit: (store) {
        store.dispatch(const CheckProfessionalAvailabilityAction.reset());
        store.dispatch(const GetProfessionalAvailabilityRequest());
      },
      loadingSelector: isCheckProfessionalAvailabilityLoading,
      dataConverter: CheckProfessionalAvailabilityViewModel.fromStore,
      dataBuilder: builder,
      listeners: [
        StoreListener<RlvHealthState, Failure?>(
          converter: (store) =>
              selectCheckProfessionalAvailabilityFailure(store.state),
          listener: _showError,
        ),
      ],
    );
  }

  void _showError(
    BuildContext context,
    Failure? failure,
  ) {
    if (failure != null) {
      SuraPopUpAlert.show(
        context: context,
        title: failure.getMessage(context),
        type: SuraPopUpType.error,
      );
    }
  }
}
```

**Referencia:** 
- Component: `@modules/rlv_health/lib/presentation/coco/check_professional_availability/check_professional_availability_component.dart`
- Connector: `@modules/rlv_health/lib/presentation/coco/check_professional_availability/check_professional_availability_connector.dart`

**Características clave:**
- El **Component** solo se encarga de construir la UI
- El **Connector** maneja:
  - Inicialización de datos (`onInit`)
  - Conversión del estado a ViewModel (`dataConverter`)
  - Indicador de carga (`loadingSelector`)
  - Listeners para efectos secundarios (mostrar errores, navegación, etc.)
- El Component recibe el `viewModel` ya procesado y listo para usar
- Separación clara de responsabilidades entre presentación y lógica de estado

### Testing del Component-Connector Pattern

Para testear Components que usan Connectors, se deben crear mocks de los estados necesarios.

**Definición de Mocks:**
```dart
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
  MockSpec<CheckProfessionalAvailabilityState>(),
  MockSpec<ProfessionalsListState>(),
  MockSpec<OnlineExternalScheduleState>(),
])
void main() {}
```

**Uso en Tests:**
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

import 'mocks.mocks.dart';

void main() {
  late MockStore<RlvHealthState> mockStore;
  late MockRlvHealthState mockRlvHealthState;
  late MockCheckProfessionalAvailabilityState mockAvailabilityState;

  setUp(() {
    mockStore = MockStore<RlvHealthState>();
    mockRlvHealthState = MockRlvHealthState();
    mockAvailabilityState = MockCheckProfessionalAvailabilityState();
    
    // Configurar comportamiento de los mocks
    when(mockStore.state).thenReturn(mockRlvHealthState);
    when(mockAvailabilityState.status).thenReturn(Status.success);
  });

  testWidgets('Component renders correctly with valid data', (tester) async {
    // Arrange
    when(mockAvailabilityState.professionalAvailability)
        .thenReturn(testAvailability);
    
    // Act
    await tester.pumpWidget(
      StoreProvider<RlvHealthState>(
        store: mockStore,
        child: CheckProfessionalAvailabilityComponent(),
      ),
    );
    
    // Assert
    expect(find.byType(AvailableTimesGrid), findsOneWidget);
  });
}
```

**Referencia:** `@modules/rlv_health/test/mocks/mocks.dart`

**Mejores prácticas para testing:**
- Definir todos los mocks en un archivo centralizado `test/mocks/mocks.dart`
- Usar `@GenerateNiceMocks` con `MockSpec` para generar mocks con Mockito
- Mockear los estados necesarios: Store, State principal, Estados de features
- Mockear repositorios para middlewares
- Los tests deben validar la UI basándose en diferentes estados del ViewModel

---

## 🎯 **Mejores Prácticas**

### 1. Separación de Responsabilidades

```dart
// ✅ CORRECTO - Responsabilidades separadas
// State: Solo estructura de datos
@freezed
class MyState with _$MyState {
  const factory MyState({required Data data}) = _MyState;
}

// Actions: Solo intenciones
@freezed
class MyAction with _$MyAction {
  const factory MyAction.loadData() = _LoadData;
}

// Middleware: Lógica de negocio
class LoadDataMiddleware extends MiddlewareClass<AppState> {
  // ... lógica
}

// Reducer: Transiciones de estado
MyState myReducer(MyState state, dynamic action) {
  // ... transiciones
}
```

### 2. Naming Consistency

```dart
// Feature: CheckProfessionalAvailability

// Estado
class CheckProfessionalAvailabilityState { }

// Acciones
class CheckProfessionalAvailabilityAction { }

// Reducer
checkProfessionalAvailabilityReducer() { }

// Middleware Request
class GetProfessionalAvailabilityRequest { }

// Middleware
class GetProfessionalAvailabilityMiddleware { }

// ViewModel
class CheckProfessionalAvailabilityViewModel { }
```

### 3. Estado Inicial

```dart
// Estados con valores constantes: usar @Default
@freezed
class PolicyDetailsState with _$PolicyDetailsState {
  factory PolicyDetailsState({
    @Default(Status.idle) Status status,
    Failure? failure,
    Policy? policy,
  }) = _PolicyDetailsState;

  factory PolicyDetailsState.initial() => PolicyDetailsState();
}

// Estados con valores computados: crear factory initial()
@freezed
class ScheduleState with _$ScheduleState {
  factory ScheduleState({
    required DateTime selectedDate,
    required List<Appointment> appointments,
    @Default(Status.idle) Status status,
  }) = _ScheduleState;

  // Usar factory initial() cuando el valor requiere computación
  factory ScheduleState.initial() => ScheduleState(
    selectedDate: DateTime.now(), // Valor computado en runtime
    appointments: [],
  );
}
```

### 4. Manejo de Errores

```dart
// Incluir failure en el estado
@freezed
class MyState with _$MyState {
  const factory MyState({
    required Status status,
    Failure? failure,
  }) = _MyState;
}

// Dispatch failure desde middleware
result.fold(
  (failure) => store.dispatch(MyAction._setFailure(failure)),
  (data) => store.dispatch(MyAction._setData(data)),
);
```

### 5. Evitar Duplicación - Usar Status Enum

En lugar de tener múltiples booleanos para estados de carga, usar el enum `Status` de `core_shared`.

**❌ Mal - Estado duplicado:**
```dart
@freezed
class MyState with _$MyState {
  const factory MyState({
    Data? data,
    bool isLoading,
    bool hasError,
    bool isSuccess,
  }) = _MyState;
}
```

**✅ Bien - Usar Status enum:**
```dart
@freezed
class MyState with _$MyState {
  const factory MyState({
    @Default(Status.idle) Status status,
    Data? data,
    Failure? failure,
  }) = _MyState;
}

extension MyStateX on MyState {
  bool get isLoading => status == Status.loading;
  bool get hasError => status == Status.failure;
  bool get isSuccess => status == Status.success;
}
```

**Beneficios:**
- Evita estados inconsistentes (ej: `isLoading=true` y `hasError=true` al mismo tiempo)
- Facilita transiciones de estado
- Código más mantenible y testeable

### 6. Testing

```dart
// Los estados deben ser fáciles de testear
test('should update state correctly', () {
  // Arrange
  const initialState = MyState.initial();
  final action = MyAction._setData(data);

  // Act
  final newState = myReducer(initialState, action);

  // Assert
  expect(newState.status, Status.success);
  expect(newState.data, data);
});
```

---

## 📚 **Referencias**

- [Redux Dart](https://pub.dev/packages/redux)
- [Flutter Redux](https://pub.dev/packages/flutter_redux)
- [Freezed](https://pub.dev/packages/freezed)
- [Redux Best Practices](https://redux.js.org/style-guide/style-guide)

---

## 📝 **Checklist de Implementación**

- [ ] ✅ Estado definido con Freezed
- [ ] ✅ Factory constructors para estados comunes (initial, loading, success, failure)
- [ ] ✅ Acciones públicas sin underscore
- [ ] ✅ Acciones internas con underscore
- [ ] ✅ Request actions con sufijo `Request`
- [ ] ✅ Reducer es función pura
- [ ] ✅ Middleware dispatch loading primero
- [ ] ✅ Middleware maneja success y failure
- [ ] ✅ ViewModel creado con factory `fromStore`
- [ ] ✅ Extensions para getters útiles
- [ ] ✅ Nombres consistentes en toda la feature
- [ ] ✅ Tests para reducer
- [ ] ✅ Tests para middleware
