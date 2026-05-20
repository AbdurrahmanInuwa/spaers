import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final Map<String, dynamic>? body;
  ApiException(this.statusCode, this.message, [this.body]);
  @override
  String toString() => message;
}

/// Thin HTTP wrapper that mirrors the web app's `apiFetch`.
/// Persists the express-session cookie via `flutter_secure_storage` so the
/// session survives app restarts.
class Api {
  Api._();
  static final instance = Api._();

  static const _cookieKey = 'spaers_session_cookie_v1';
  static const _storage = FlutterSecureStorage();

  // Override at runtime via --dart-define=API_URL=https://your.api.url
  static const _envUrl = String.fromEnvironment('API_URL', defaultValue: '');
  static String get baseUrl {
    final raw = _envUrl.isNotEmpty
        ? _envUrl
        : (Platform.isAndroid
            ? 'http://10.0.2.2:5000'
            : 'http://localhost:5000');
    final stripped = raw.replaceAll(RegExp(r'/+$'), '');
    return stripped.endsWith('/api') ? stripped : '$stripped/api';
  }

  String? _sessionCookie;
  bool _hydrated = false;

  Future<void> _ensureCookieHydrated() async {
    if (_hydrated) return;
    _hydrated = true;
    try {
      _sessionCookie = await _storage.read(key: _cookieKey);
    } catch (_) {
      _sessionCookie = null;
    }
  }

  Future<void> _persistCookie(String? value) async {
    _sessionCookie = value;
    try {
      if (value == null) {
        await _storage.delete(key: _cookieKey);
      } else {
        await _storage.write(key: _cookieKey, value: value);
      }
    } catch (_) {}
  }

  /// Strip cookie prefix (`name=value; Path=/...`) and keep just `name=value`.
  String? _extractSetCookie(http.Response res) {
    final header = res.headers['set-cookie'];
    if (header == null || header.isEmpty) return null;
    // Multiple Set-Cookie headers are comma-joined by dart:io. We want the
    // first cookie pair only — the express session cookie.
    final firstPair = header.split(',').first.split(';').first.trim();
    return firstPair.isEmpty ? null : firstPair;
  }

  Future<Map<String, String>> _buildHeaders(Map<String, String>? extra) async {
    await _ensureCookieHydrated();
    final headers = <String, String>{
      'Accept': 'application/json',
    };
    if (_sessionCookie != null && _sessionCookie!.isNotEmpty) {
      headers['Cookie'] = _sessionCookie!;
    }
    if (extra != null) headers.addAll(extra);
    return headers;
  }

  Future<http.Response> _send(
    String method,
    String pathOrUrl, {
    Object? body,
    Map<String, String>? headers,
  }) async {
    final url = pathOrUrl.startsWith('http')
        ? Uri.parse(pathOrUrl)
        : Uri.parse('$baseUrl$pathOrUrl');
    final h = await _buildHeaders(headers);
    if (body != null && !h.containsKey('Content-Type')) {
      h['Content-Type'] = 'application/json';
    }
    final encoded = body == null
        ? null
        : (body is String ? body : jsonEncode(body));

    http.Response res;
    switch (method) {
      case 'GET':
        res = await http.get(url, headers: h);
        break;
      case 'POST':
        res = await http.post(url, headers: h, body: encoded);
        break;
      case 'PATCH':
        res = await http.patch(url, headers: h, body: encoded);
        break;
      case 'PUT':
        res = await http.put(url, headers: h, body: encoded);
        break;
      case 'DELETE':
        res = await http.delete(url, headers: h, body: encoded);
        break;
      default:
        throw ArgumentError('Unsupported method: $method');
    }

    final cookie = _extractSetCookie(res);
    if (cookie != null) {
      // If it's a session-clearing cookie, drop our state.
      if (cookie.contains('=;') || cookie.endsWith('=')) {
        await _persistCookie(null);
      } else {
        await _persistCookie(cookie);
      }
    }
    return res;
  }

  Future<http.Response> get(String path, {Map<String, String>? headers}) =>
      _send('GET', path, headers: headers);
  Future<http.Response> post(String path,
          {Object? body, Map<String, String>? headers}) =>
      _send('POST', path, body: body, headers: headers);
  Future<http.Response> patch(String path,
          {Object? body, Map<String, String>? headers}) =>
      _send('PATCH', path, body: body, headers: headers);
  Future<http.Response> delete(String path,
          {Object? body, Map<String, String>? headers}) =>
      _send('DELETE', path, body: body, headers: headers);

  Future<void> clearSession() => _persistCookie(null);

  /// Decode a response body as JSON, swallow parse errors as `{}`.
  Map<String, dynamic> decode(http.Response res) {
    try {
      final v = jsonDecode(res.body);
      return v is Map<String, dynamic> ? v : <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  /// PUT a file directly to a presigned S3 URL. Used for avatars and IDs.
  Future<void> putFileToSignedUrl({
    required String url,
    required List<int> bytes,
    required String contentType,
  }) async {
    final res = await http.put(
      Uri.parse(url),
      body: bytes,
      headers: {'Content-Type': contentType},
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(res.statusCode, 'Upload failed (${res.statusCode})');
    }
  }
}

/// Two-step S3 upload helper, mirrors `lib/uploads.js`.
Future<String> uploadToS3({
  required String category,
  required List<int> bytes,
  required String fileName,
  required String contentType,
  String? ownerId,
}) async {
  final api = Api.instance;
  final res = await api.post('/uploads/sign', body: {
    'category': category,
    'contentType': contentType,
    'ownerId': ownerId,
    'sizeBytes': bytes.length,
  });
  final data = api.decode(res);
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw ApiException(
        res.statusCode, data['error']?.toString() ?? 'Failed to get upload URL');
  }
  final uploadUrl = data['uploadUrl'] as String?;
  final key = data['key'] as String?;
  if (uploadUrl == null || key == null) {
    throw ApiException(500, 'Bad upload response');
  }
  await api.putFileToSignedUrl(
    url: uploadUrl,
    bytes: bytes,
    contentType: contentType,
  );
  return key;
}

final Map<String, String> _signedUrlCache = {};

Future<String?> getSignedDownloadUrl(String? key) async {
  if (key == null || key.isEmpty) return null;
  final cached = _signedUrlCache[key];
  if (cached != null) return cached;
  try {
    final api = Api.instance;
    final res = await api.get('/uploads/url?key=${Uri.encodeComponent(key)}');
    final data = api.decode(res);
    if (res.statusCode < 200 || res.statusCode >= 300) return null;
    final url = data['url'] as String?;
    if (url == null) return null;
    _signedUrlCache[key] = url;
    return url;
  } catch (e) {
    if (kDebugMode) print('Signed URL error: $e');
    return null;
  }
}
