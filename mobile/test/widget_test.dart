// Smoke test for the SPAERS mobile app.
//
// The app's first screen is the splash, which immediately calls /auth/me on
// boot. We don't want widget tests to hit the network, so this test just
// instantiates the root widget and checks the splash renders.

import 'package:flutter_test/flutter_test.dart';

import 'package:spaers_mobile/main.dart';

void main() {
  testWidgets('App boots to splash', (WidgetTester tester) async {
    await tester.pumpWidget(const SpaersApp());
    expect(find.text('SPAERS'), findsOneWidget);
  });
}
