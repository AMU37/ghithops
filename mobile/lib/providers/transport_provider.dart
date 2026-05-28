import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/trip.dart';

class TransportProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  List<Trip> _trips = [];
  List<Vehicle> _vehicles = [];
  List<Driver> _drivers = [];
  bool _loading = false;

  List<Trip> get trips => _trips;
  List<Vehicle> get vehicles => _vehicles;
  List<Driver> get drivers => _drivers;
  bool get loading => _loading;

  Future<void> loadTrips({String? date}) async {
    _loading = true;
    notifyListeners();
    try {
      final q = date != null ? '?date=$date' : '';
      final data = await _api.get('/transport/trips/$q');
      final list = data['results'] ?? data;
      _trips = (list is List ? list : []).map((j) => Trip.fromJson(j)).toList();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadVehicles() async {
    final data = await _api.get('/transport/vehicles/');
    final list = data['results'] ?? data;
    _vehicles = (list is List ? list : []).map((j) => Vehicle.fromJson(j)).toList();
    notifyListeners();
  }

  Future<void> loadDrivers() async {
    final data = await _api.get('/transport/drivers/');
    final list = data['results'] ?? data;
    _drivers = (list is List ? list : []).map((j) => Driver.fromJson(j)).toList();
    notifyListeners();
  }

  Future<Map<String, dynamic>> startTrip(String id) async {
    final res = await _api.post('/transport/trips/$id/start/');
    await loadTrips();
    return res;
  }

  Future<Map<String, dynamic>> completeTrip(String id) async {
    final res = await _api.post('/transport/trips/$id/complete/');
    await loadTrips();
    return res;
  }

  Future<Map<String, dynamic>> cancelTrip(String id) async {
    final res = await _api.post('/transport/trips/$id/cancel/');
    await loadTrips();
    return res;
  }

  Future<Map<String, dynamic>> boardByCode(String tripId, String code) async {
    return await _api.post('/transport/ride-logs/board_by_code/', body: {
      'trip_id': tripId,
      'code': code,
    });
  }

  Future<Map<String, dynamic>> addManual(String tripId, String name) async {
    return await _api.post('/transport/ride-logs/add_manual/', body: {
      'trip_id': tripId,
      'name': name,
    });
  }
}
