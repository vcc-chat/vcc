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
    doWhenWindowReady(() {
    const initialSize = Size(600, 450);
    appWindow.minSize = initialSize;
    appWindow.size = initialSize;
    appWindow.alignment = Alignment.center;
    appWindow.show();
  });
  }
}

class App extends StatelessWidget {
  App() {}
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    bool useAdwita = true;
    //if (isDesktop()) {
    //  useAdwita = mapGetDefault(Platform.environment, "DESKTOP_SESSION", "")
    //      .startsWith("gnome");
    //}
    // Disable adwita theme since it is buggy
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
      theme: (useAdwita
          ? ThemeData(
              colorScheme:
                  MediaQuery.platformBrightnessOf(context) == Brightness.dark
                      ? AdwaitaThemeData.dark().colorScheme
                      : AdwaitaThemeData.light().colorScheme,
              useMaterial3: true)
          : ThemeData(
              colorScheme:
                  MediaQuery.platformBrightnessOf(context) == Brightness.dark
                      ? ColorScheme.dark()
                      : ColorScheme.light(),
              useMaterial3: true,
            )),
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
