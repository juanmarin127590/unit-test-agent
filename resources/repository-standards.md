# 🗄️ Estándares de Repositorios - Flutter

Este documento define los estándares y mejores prácticas para implementar la capa de repositorios en el proyecto Relevant SuperApp Flutter.

---

## 📋 Tabla de Contenidos

- [Arquitectura de Repositorios](#arquitectura-de-repositorios)
- [Estructura de Directorios](#estructura-de-directorios)
- [Interfaces de Repositorio](#interfaces-de-repositorio)
- [Implementaciones](#implementaciones)
- [DataSources](#datasources)
- [Manejo de Errores](#manejo-de-errores)
- [DTOs y Mappers](#dtos-y-mappers)
- [Mejores Prácticas](#mejores-prácticas)

---

## 🏗️ **Arquitectura de Repositorios**

### Capas de la Arquitectura

```
Middleware (Redux)
      ↓
  Repository (Interface)
      ↓
  Repository (Implementation)
      ↓
  DataSource (Remote/Local)
      ↓
  API / Database
```

### Responsabilidades

**Repository Interface**:
- Define el contrato de operaciones
- Retorna tipos de dominio (Entities)
- Usa `Either<Failure, T>` para manejo de errores

**Repository Implementation**:
- Implementa la lógica de negocio
- Coordina entre DataSources
- Transforma DTOs en Entities
- Maneja errores y los convierte en Failures

**DataSource**:
- Acceso directo a datos (API, DB, Cache)
- Retorna DTOs (Data Transfer Objects)
- Lanza excepciones en caso de error

---

## 📁 **Estructura de Directorios**

```
lib/
├── domain/
│   ├── entities/
│   │   └── professional.dart              # Entidades de dominio
│   ├── repositories/
│   │   └── coco_repository.dart           # Interface del repositorio
│   └── failures/
│       └── coco_failures.dart             # Failures específicos
│
├── data/
│   ├── repositories/
│   │   └── coco_repository_impl.dart      # Implementación
│   ├── datasources/
│   │   ├── coco_remote_datasource.dart    # DataSource remoto
│   │   └── coco_local_datasource.dart     # DataSource local (opcional)
│   ├── dtos/
│   │   └── professional_dto.dart          # DTOs
│   └── mappers/
│       └── professional_mapper.dart        # Mappers DTO ↔ Entity
│
└── di/
    └── injection.dart                      # Dependency Injection
```

---

## 🔌 **Interfaces de Repositorio**

### Definición de Interface

```dart
import 'package:fpdart/fpdart.dart';
import 'package:core_shared/core_shared.dart';

abstract class CocoRepository {
  /// Obtiene la disponibilidad de un profesional
  ///
  /// Returns:
  /// - [Right<ProfessionalAvailability>] si la operación es exitosa
  /// - [Left<Failure>] si ocurre un error
  Future<Either<Failure, ProfessionalAvailability>> getProfessionalAvailability({
    required int professionalId,
    required int serviceId,
    required int placeId,
    required DateTime startDate,
  });

  /// Obtiene la lista de profesionales disponibles
  Future<Either<Failure, List<Professional>>> getProfessionals({
    required int serviceId,
    required int placeId,
  });

  /// Crea una cita médica
  Future<Either<Failure, Appointment>> createAppointment({
    required CreateAppointmentRequest request,
  });
}
```

### Convenciones de Nombres

- **Repository**: `[Feature]Repository`
- **Métodos**: Verbos en infinitivo (get, create, update, delete, fetch, save)
- **Parámetros**: Named parameters para claridad
- **Return type**: Siempre `Future<Either<Failure, T>>`

### Documentación

```dart
abstract class MyRepository {
  /// Brief description of what this method does
  ///
  /// Detailed explanation if needed.
  ///
  /// Parameters:
  /// - [param1]: Description of param1
  /// - [param2]: Description of param2
  ///
  /// Returns:
  /// - [Right<Entity>] when successful with description
  /// - [Left<Failure>] when error occurs with possible failures:
  ///   - [NetworkFailure]: No internet connection
  ///   - [ServerFailure]: Server error (500)
  ///   - [NotFoundFailure]: Resource not found (404)
  ///
  /// Throws:
  /// - Nothing, all errors are captured in Either
  Future<Either<Failure, Entity>> getEntity({
    required String id,
  });
}
```

---

## 🔨 **Implementaciones**

### Implementación Básica

```dart
import 'package:fpdart/fpdart.dart';
import 'package:core_shared/core_shared.dart';

class CocoRepositoryImpl implements CocoRepository {
  final CocoRemoteDataSource _remoteDataSource;
  final CocoLocalDataSource? _localDataSource; // Opcional

  CocoRepositoryImpl({
    required CocoRemoteDataSource remoteDataSource,
    CocoLocalDataSource? localDataSource,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource;

  @override
  Future<Either<Failure, ProfessionalAvailability>> getProfessionalAvailability({
    required int professionalId,
    required int serviceId,
    required int placeId,
    required DateTime startDate,
  }) async {
    try {
      // 1. Llamar al datasource
      final dto = await _remoteDataSource.getProfessionalAvailability(
        professionalId: professionalId,
        serviceId: serviceId,
        placeId: placeId,
        startDate: startDate,
      );

      // 2. Mapear DTO a Entity
      final entity = ProfessionalAvailabilityMapper.fromDto(dto);

      // 3. Retornar resultado exitoso
      return right(entity);
    } on NetworkException catch (e) {
      // 4. Capturar y convertir excepciones en Failures
      return left(NetworkFailure(e.message));
    } on ServerException catch (e) {
      return left(ServerFailure(e.message));
    } on NotFoundException catch (e) {
      return left(NotFoundFailure(e.message));
    } catch (e) {
      return left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<Professional>>> getProfessionals({
    required int serviceId,
    required int placeId,
  }) async {
    try {
      // Intentar obtener de cache primero (si existe)
      if (_localDataSource != null) {
        try {
          final cachedDtos = await _localDataSource!.getCachedProfessionals(
            serviceId: serviceId,
            placeId: placeId,
          );
          
          if (cachedDtos.isNotEmpty) {
            final entities = cachedDtos
                .map((dto) => ProfessionalMapper.fromDto(dto))
                .toList();
            return right(entities);
          }
        } catch (_) {
          // Continuar con llamada remota si falla el cache
        }
      }

      // Llamar al datasource remoto
      final dtos = await _remoteDataSource.getProfessionals(
        serviceId: serviceId,
        placeId: placeId,
      );

      // Guardar en cache (si existe)
      if (_localDataSource != null) {
        await _localDataSource!.cacheProfessionals(dtos);
      }

      // Mapear a entities
      final entities = dtos
          .map((dto) => ProfessionalMapper.fromDto(dto))
          .toList();

      return right(entities);
    } on NetworkException catch (e) {
      return left(NetworkFailure(e.message));
    } on ServerException catch (e) {
      return left(ServerFailure(e.message));
    } catch (e) {
      return left(UnknownFailure(e.toString()));
    }
  }
}
```

### Pattern con Múltiples DataSources

```dart
class MyRepositoryImpl implements MyRepository {
  final MyRemoteDataSource _remoteDataSource;
  final MyLocalDataSource _localDataSource;
  final MyCacheDataSource _cacheDataSource;

  @override
  Future<Either<Failure, Entity>> getEntity({required String id}) async {
    try {
      // 1. Try cache first
      try {
        final cached = await _cacheDataSource.get(id);
        if (cached != null) {
          return right(EntityMapper.fromDto(cached));
        }
      } catch (_) {
        // Continue to next source
      }

      // 2. Try local database
      try {
        final local = await _localDataSource.get(id);
        if (local != null) {
          // Update cache
          await _cacheDataSource.save(local);
          return right(EntityMapper.fromDto(local));
        }
      } catch (_) {
        // Continue to remote
      }

      // 3. Fetch from remote
      final remote = await _remoteDataSource.get(id);
      
      // 4. Update cache and local
      await Future.wait([
        _cacheDataSource.save(remote),
        _localDataSource.save(remote),
      ]);

      // 5. Return entity
      return right(EntityMapper.fromDto(remote));
      
    } on NetworkException catch (e) {
      return left(NetworkFailure(e.message));
    } on ServerException catch (e) {
      return left(ServerFailure(e.message));
    } catch (e) {
      return left(UnknownFailure(e.toString()));
    }
  }
}
```

---

## 🌐 **DataSources**

### Remote DataSource

```dart
import 'package:dio/dio.dart';

abstract class CocoRemoteDataSource {
  Future<ProfessionalAvailabilityDto> getProfessionalAvailability({
    required int professionalId,
    required int serviceId,
    required int placeId,
    required DateTime startDate,
  });

  Future<List<ProfessionalDto>> getProfessionals({
    required int serviceId,
    required int placeId,
  });
}

class CocoRemoteDataSourceImpl implements CocoRemoteDataSource {
  final Dio _dio;

  CocoRemoteDataSourceImpl({required Dio dio}) : _dio = dio;

  @override
  Future<ProfessionalAvailabilityDto> getProfessionalAvailability({
    required int professionalId,
    required int serviceId,
    required int placeId,
    required DateTime startDate,
  }) async {
    try {
      final response = await _dio.get(
        '/api/v1/coco/professionals/$professionalId/availability',
        queryParameters: {
          'serviceId': serviceId,
          'placeId': placeId,
          'startDate': startDate.toIso8601String(),
        },
      );

      if (response.statusCode == 200) {
        return ProfessionalAvailabilityDto.fromJson(response.data);
      } else {
        throw ServerException(
          'Failed to load availability: ${response.statusCode}',
        );
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        throw NetworkException('Connection timeout');
      } else if (e.response?.statusCode == 404) {
        throw NotFoundException('Professional not found');
      } else if (e.response?.statusCode != null && 
                 e.response!.statusCode! >= 500) {
        throw ServerException('Server error: ${e.response?.statusCode}');
      } else {
        throw NetworkException('Network error: ${e.message}');
      }
    } catch (e) {
      throw ServerException('Unexpected error: $e');
    }
  }
}
```

### Local DataSource (Opcional)

```dart
import 'package:sqflite/sqflite.dart';

abstract class CocoLocalDataSource {
  Future<List<ProfessionalDto>> getCachedProfessionals({
    required int serviceId,
    required int placeId,
  });

  Future<void> cacheProfessionals(List<ProfessionalDto> professionals);
  
  Future<void> clearCache();
}

class CocoLocalDataSourceImpl implements CocoLocalDataSource {
  final Database _database;

  CocoLocalDataSourceImpl({required Database database}) 
      : _database = database;

  @override
  Future<List<ProfessionalDto>> getCachedProfessionals({
    required int serviceId,
    required int placeId,
  }) async {
    final maps = await _database.query(
      'professionals',
      where: 'serviceId = ? AND placeId = ?',
      whereArgs: [serviceId, placeId],
    );

    return maps.map((map) => ProfessionalDto.fromJson(map)).toList();
  }

  @override
  Future<void> cacheProfessionals(List<ProfessionalDto> professionals) async {
    final batch = _database.batch();
    
    for (final professional in professionals) {
      batch.insert(
        'professionals',
        professional.toJson(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }

    await batch.commit(noResult: true);
  }

  @override
  Future<void> clearCache() async {
    await _database.delete('professionals');
  }
}
```

---

## ⚠️ **Manejo de Errores**

### Jerarquía de Failures

```dart
// core_shared/lib/failures/failure.dart
abstract class Failure {
  final String message;
  const Failure(this.message);
}

// Failures comunes
class NetworkFailure extends Failure {
  const NetworkFailure([String message = 'Network error']) : super(message);
}

class ServerFailure extends Failure {
  const ServerFailure([String message = 'Server error']) : super(message);
}

class NotFoundFailure extends Failure {
  const NotFoundFailure([String message = 'Not found']) : super(message);
}

class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure([String message = 'Unauthorized']) : super(message);
}

class ValidationFailure extends Failure {
  const ValidationFailure([String message = 'Validation error']) : super(message);
}

class UnknownFailure extends Failure {
  const UnknownFailure([String message = 'Unknown error']) : super(message);
}

// Failures específicos del dominio
class CocoFailure extends Failure {
  const CocoFailure(String message) : super(message);
}

class ProfessionalNotAvailableFailure extends CocoFailure {
  const ProfessionalNotAvailableFailure() 
      : super('Professional not available');
}
```

### Jerarquía de Exceptions

```dart
// core_shared/lib/exceptions/
abstract class AppException implements Exception {
  final String message;
  const AppException(this.message);
}

class NetworkException extends AppException {
  const NetworkException([String message = 'Network error']) : super(message);
}

class ServerException extends AppException {
  const ServerException([String message = 'Server error']) : super(message);
}

class NotFoundException extends AppException {
  const NotFoundException([String message = 'Not found']) : super(message);
}

class UnauthorizedException extends AppException {
  const UnauthorizedException([String message = 'Unauthorized']) 
      : super(message);
}

class CacheException extends AppException {
  const CacheException([String message = 'Cache error']) : super(message);
}
```

### Mapeo Exception → Failure

```dart
class CocoRepositoryImpl implements CocoRepository {
  
  Future<Either<Failure, T>> _executeWithErrorHandling<T>(
    Future<T> Function() operation,
  ) async {
    try {
      final result = await operation();
      return right(result);
    } on NetworkException catch (e) {
      return left(NetworkFailure(e.message));
    } on ServerException catch (e) {
      return left(ServerFailure(e.message));
    } on NotFoundException catch (e) {
      return left(NotFoundFailure(e.message));
    } on UnauthorizedException catch (e) {
      return left(UnauthorizedFailure(e.message));
    } catch (e) {
      return left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, Entity>> getEntity() async {
    return _executeWithErrorHandling(() async {
      final dto = await _remoteDataSource.getEntity();
      return EntityMapper.fromDto(dto);
    });
  }
}
```

---

## 🔄 **DTOs y Mappers**

### DTO (Data Transfer Object)

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'professional_dto.freezed.dart';
part 'professional_dto.g.dart';

@freezed
class ProfessionalDto with _$ProfessionalDto {
  const factory ProfessionalDto({
    required int id,
    required String name,
    @JsonKey(name: 'specialty_id') required int specialtyId,
    @JsonKey(name: 'place_id') required int placeId,
    String? photoUrl,
    String? description,
  }) = _ProfessionalDto;

  factory ProfessionalDto.fromJson(Map<String, dynamic> json) =>
      _$ProfessionalDtoFromJson(json);
}
```

### Mapper

```dart
class ProfessionalMapper {
  // DTO → Entity
  static Professional fromDto(ProfessionalDto dto) {
    return Professional(
      professionalId: dto.id,
      name: dto.name,
      specialtyId: dto.specialtyId,
      placeId: dto.placeId,
      photoUrl: dto.photoUrl,
      description: dto.description ?? '',
    );
  }

  // Entity → DTO
  static ProfessionalDto toDto(Professional entity) {
    return ProfessionalDto(
      id: entity.professionalId,
      name: entity.name,
      specialtyId: entity.specialtyId,
      placeId: entity.placeId,
      photoUrl: entity.photoUrl,
      description: entity.description.isEmpty ? null : entity.description,
    );
  }

  // List transformations
  static List<Professional> fromDtoList(List<ProfessionalDto> dtos) {
    return dtos.map(fromDto).toList();
  }

  static List<ProfessionalDto> toDtoList(List<Professional> entities) {
    return entities.map(toDto).toList();
  }
}
```

---

## 🎯 **Mejores Prácticas**

### 1. Siempre Retornar Either

```dart
// ✅ CORRECTO
Future<Either<Failure, Data>> getData();

// ❌ INCORRECTO
Future<Data?> getData();
Future<Data> getData(); // Puede lanzar excepciones
```

### 2. Named Parameters para Claridad

```dart
// ✅ CORRECTO
Future<Either<Failure, Data>> getData({
  required String id,
  required int userId,
});

// ❌ INCORRECTO
Future<Either<Failure, Data>> getData(String id, int userId);
```

### 3. Un Repository por Dominio

```dart
// ✅ CORRECTO - Responsabilidad única
abstract class UserRepository {
  Future<Either<Failure, User>> getUser({required String id});
  Future<Either<Failure, List<User>>> getUsers();
}

abstract class AppointmentRepository {
  Future<Either<Failure, Appointment>> getAppointment({required String id});
  Future<Either<Failure, List<Appointment>>> getAppointments();
}

// ❌ INCORRECTO - Demasiadas responsabilidades
abstract class SuperRepository {
  Future<Either<Failure, User>> getUser({required String id});
  Future<Either<Failure, Appointment>> getAppointment({required String id});
  Future<Either<Failure, Professional>> getProfessional({required int id});
  // ... muchas más
}
```

### 4. Dependency Injection

```dart
// Registrar en DI container (GetIt)
void setupRepositories() {
  // DataSources
  getIt.registerLazySingleton<CocoRemoteDataSource>(
    () => CocoRemoteDataSourceImpl(dio: getIt()),
  );

  // Repositories
  getIt.registerLazySingleton<CocoRepository>(
    () => CocoRepositoryImpl(
      remoteDataSource: getIt(),
    ),
  );
}
```

### 5. Testing

**NO se hacen tests unitarios directos de repositorios**. Los repositorios se prueban indirectamente a través de los tests de middlewares de Redux.

Ver [Testing Standards](./testing-standards.md) para más información.

---

## 📚 **Referencias**

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [fpdart - Either](https://pub.dev/packages/fpdart)
- [Dio HTTP Client](https://pub.dev/packages/dio)

---

## 📝 **Checklist de Implementación**

- [ ] ✅ Interface de repositorio en `/domain/repositories/`
- [ ] ✅ Implementación en `/data/repositories/`
- [ ] ✅ DataSource(s) en `/data/datasources/`
- [ ] ✅ DTOs en `/data/dtos/`
- [ ] ✅ Mappers en `/data/mappers/`
- [ ] ✅ Todos los métodos retornan `Either<Failure, T>`
- [ ] ✅ Named parameters en métodos públicos
- [ ] ✅ Documentación completa de métodos
- [ ] ✅ Manejo de errores con try-catch
- [ ] ✅ Conversión de Exceptions a Failures
- [ ] ✅ Mapper DTO ↔ Entity implementado
- [ ] ✅ Repositorio registrado en DI (GetIt)
- [ ] ✅ Pruebas indirectas a través de middlewares
