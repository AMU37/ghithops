class User {
  final String id;
  final String? company;
  final String? companyName;
  final String fullName;
  final String email;
  final String phone;
  final String role;

  User({
    required this.id,
    this.company,
    this.companyName,
    required this.fullName,
    required this.email,
    this.phone = '',
    this.role = 'department_user',
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      company: json['company'],
      companyName: json['company_name'],
      fullName: json['full_name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'department_user',
    );
  }
}
