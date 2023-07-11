import 'package:flutter/material.dart';
import 'pages/login.dart';
import 'pages/chat.dart';

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
          return new IndexPage();
        },
        "/login": (context) {
          return LoginPage();
        },
        "/chat": (context) {return ChatPage();}

      },
      theme: ThemeData(
        // This is the theme of your application.
        //
        // TRY THIS: Try running your application with "flutter run". You'll see
        // the application has a blue toolbar. Then, without quitting the app,
        // try changing the seedColor in the colorScheme below to Colors.green
        // and then invoke "hot reload" (save your changes or press the "hot
        // reload" button in a Flutter-supported IDE, or press "r" if you used
        // the command line to start the app).
        //
        // Notice that the counter didn't reset back to zero; the application
        // state is not lost during the reload. To reset the state, use hot
        // restart instead.
        //
        // This works for code too, not just values: Most code changes can be
        // tested with just a hot reload.
        colorScheme: ColorScheme.dark(),
        useMaterial3: true,
      ),
    );
  }
}

class IndexPage extends StatelessWidget {
  const IndexPage({super.key});
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
            backgroundColor: Theme.of(context).colorScheme.inversePrimary,
            title: Text("hello")),
        body: Center(
            child: TextButton(
          onPressed: () {
            Navigator.pushNamedAndRemoveUntil(context, "/login", (_) {
              return false;
            });
          },
          child: Text("login"),
        )));
  }
}
