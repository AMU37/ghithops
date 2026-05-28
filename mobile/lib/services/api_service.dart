import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._();
  factory ApiService() => _instance;
  ApiService._();

  final _client = http.Client();

  Future<Map<String, String>> _headers() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token') ?? '';
    return {
      'Content-Type': 'application/json',
      if (token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> _refreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    final refresh = prefs.getString('refresh_token') ?? '';
    if (refresh.isEmpty) throw Exception('No refresh token');

    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/refresh/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh': refresh}),
    );

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      await prefs.setString('access_token', data['access']);
      await prefs.setString('refresh_token', data['refresh']);
      return data;
    }
    throw Exception('Refresh failed');
  }

  Future<dynamic> get(String endpoint) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    var res = await _client.get(url, headers: await _headers()).timeout(ApiConfig.timeout);

    if (res.statusCode == 401) {
      await _refreshToken();
      res = await _client.get(url, headers: await _headers()).timeout(ApiConfig.timeout);
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return jsonDecode(res.body);
    }
    throw Exception('GET $endpoint failed: ${res.statusCode} ${res.body}');
  }

  Future<dynamic> post(String endpoint, {Map<String, dynamic>? body}) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    var res = await _client.post(
      url, headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(ApiConfig.timeout);

    if (res.statusCode == 401) {
      await _refreshToken();
      res = await _client.post(
        url, headers: await _headers(),
        body: body != null ? jsonEncode(body) : null,
      ).timeout(ApiConfig.timeout);
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return jsonDecode(res.body);
    }
    throw Exception('POST $endpoint failed: ${res.statusCode} ${res.body}');
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/login/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    ).timeout(ApiConfig.timeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('access_token', data['access']);
      await prefs.setString('refresh_token', data['refresh']);
      await prefs.setString('user', jsonEncode(data['user']));
      return data;
    }
    throw Exception('Login failed: ${res.body}');
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    await prefs.remove('user');
  }

  Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey('access_token');
  }

  Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('user');
    if (data != null) return jsonDecode(data);
    return null;
  }
}
