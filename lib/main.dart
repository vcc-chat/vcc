import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'pages/login.dart';
import 'pages/chat.dart';
import 'dart:async';

void main() {
  runApp(App());
}

class App extends StatelessWidget {
  App() {
    var key = super.key;
  }
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
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
      theme: ThemeData(
        colorScheme: ColorScheme.dark(),
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
