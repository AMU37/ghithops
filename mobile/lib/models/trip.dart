class Trip {
  final String id;
  final String? vehiclePlate;
  final String? driverName;
  final String? routeName;
  final String tripDate;
  final String? departureTime;
  final String? returnTime;
  final String status;
  final int riderCount;

  Trip({
    required this.id,
    this.vehiclePlate,
    this.driverName,
    this.routeName,
    required this.tripDate,
    this.departureTime,
    this.returnTime,
    this.status = 'scheduled',
    this.riderCount = 0,
  });

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['id'] ?? '',
      vehiclePlate: json['vehicle_plate'],
      driverName: json['driver_name'],
      routeName: json['route_name'],
      tripDate: json['trip_date'] ?? '',
      departureTime: json['departure_time'],
      returnTime: json['return_time'],
      status: json['status'] ?? 'scheduled',
      riderCount: json['rider_count'] ?? 0,
    );
  }
}

class Vehicle {
  final String id;
  final String plateNumber;
  final String model;
  final int capacity;
  final String status;

  Vehicle({
    required this.id,
    required this.plateNumber,
    this.model = '',
    this.capacity = 30,
    this.status = 'active',
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id'] ?? '',
      plateNumber: json['plate_number'] ?? '',
      model: json['model'] ?? '',
      capacity: json['capacity'] ?? 30,
      status: json['status'] ?? 'active',
    );
  }
}

class Driver {
  final String id;
  final String name;
  final String phone;
  final String status;

  Driver({
    required this.id,
    required this.name,
    this.phone = '',
    this.status = 'available',
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      status: json['status'] ?? 'available',
    );
  }
}
