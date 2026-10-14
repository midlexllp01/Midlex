class ApiConfig {
  // Configurable base URL: Defaults to production, can be overridden via --dart-define=API_URL=... or at runtime
  static const String _defaultUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://midlex-new.onrender.com',
  );

  static String _baseUrl = _defaultUrl;
  static String get baseUrl => _baseUrl;

  static void setBaseUrl(String url) {
    _baseUrl = url.replaceAll(RegExp(r'/+$'), '');
  }

  // Health / Warmup
  static String get health => '$baseUrl/health';

  // Auth
  static String get login => '$baseUrl/auth/login';
  static String get register => '$baseUrl/auth/signup';
  static String get signup => '$baseUrl/auth/signup';
  static String get me => '$baseUrl/auth/me';
  static String get forgotPassword => '$baseUrl/auth/forgot-password';

  // Directory (Courts & Litigation Teams from Backend)
  static String get directoryCourts => '$baseUrl/directory/courts';
  static String get directoryTeams => '$baseUrl/directory/teams';

  // Cases
  static String get cases => '$baseUrl/cases';
  static String get myCases => '$baseUrl/cases/my-cases';
  static String caseDetail(String id) => '$baseUrl/cases/$id';

  // Documents
  static String get documents => '$baseUrl/documents';

  // Messages
  static String get messages => '$baseUrl/messages';

  // Payments
  static String get payments => '$baseUrl/payments';
  static String get paymentAccounts => '$baseUrl/payment-accounts';

  // Inquiries
  static String get inquiries => '$baseUrl/inquiries';

  // Court Dates
  static String get courtDates => '$baseUrl/court-dates';

  // Users
  static String get users => '$baseUrl/users';
  static String get lawyers => '$baseUrl/users/lawyers';
  static String get clients => '$baseUrl/users/clients';
  static String get admins => '$baseUrl/users/admins';

  // Notifications
  static String get notifications => '$baseUrl/notifications';
  static String get markNotificationsRead => '$baseUrl/notifications/read-all';
}
