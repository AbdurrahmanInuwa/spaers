import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'api/auth_provider.dart';
import 'api/emergency_provider.dart';
import 'screens/dashboard_shell.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/my_reports_screen.dart';
import 'screens/public_home_screen.dart';
import 'screens/responder_shell.dart';
import 'screens/signin_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/splash_screen.dart';
import 'theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
  ));
  runApp(const SpaersApp());
}

class SpaersApp extends StatelessWidget {
  const SpaersApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => EmergencyProvider()),
      ],
      child: MaterialApp(
        title: 'SPAERS',
        debugShowCheckedModeBanner: false,
        theme: buildSpaersTheme(),
        initialRoute: '/',
        routes: {
          '/': (_) => const SplashScreen(),
          '/home': (_) => const PublicHomeScreen(),
          '/signin': (_) => const SignInScreen(),
          '/signup': (_) => const SignUpScreen(),
          '/forgot': (_) => const ForgotPasswordScreen(),
          '/dashboard': (_) => const DashboardShell(),
          '/reports': (_) => const MyReportsScreen(),
          '/responder': (_) => const ResponderShell(),
        },
      ),
    );
  }
}
