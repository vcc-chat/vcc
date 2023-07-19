import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'utils.dart';
import 'pages/login.dart';
import 'pages/chat.dart';
import 'dart:async';
import 'dart:io';
import 'package:bitsdojo_window/bitsdojo_window.dart';
import 'package:vcc/widgets/movewindow.dart' show isDesktop;
import 'package:adwaita/adwaita.dart';

void main() {
  runApp(App());
  if (isDesktop()) {
    appWindow.minSize = Size(400, 300);
    appWindow.size = Size(800, 600);
  }
}

class App extends StatelessWidget {
  App() {}
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    bool useAdwita = isDesktop() &
        mapGetDefault(Platform.environment, "DESKTOP_SESSION", "")
            .startsWith("gnome");
    print(MediaQuery.platformBrightnessOf(context));
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Vcc',
      routes: {
        "/": (context) {
          return IndexPage();
        },
        "/login": (context) {
          return LoginPage();
        },
        "/chat": (context) {
          return ChatPage();
        }
      },
      theme: useAdwita
          ? MediaQuery.platformBrightnessOf(context) == Brightness.dark?AdwaitaThemeData.dark():AdwaitaThemeData.light()
          : ThemeData(
              colorScheme:
                  MediaQuery.platformBrightnessOf(context) == Brightness.dark
                      ? ColorScheme.dark()
                      : ColorScheme.light(),
              useMaterial3: true,
            ),
    );
  }
}

class IndexPage extends StatelessWidget {
  login(context) async {
    await Future.delayed(Duration.zero); // Keep it run after the 'build' method
    Navigator.pushNamedAndRemoveUntil(context, "/login", (_) {
      return false;
    });
  }

  Widget build(BuildContext context) {
    this.login(context);
    return Center(
        child: Container(
      child:
          CupertinoActivityIndicator(), // Just "steal" a IOS activity indicator :)
    ));
  }
}
