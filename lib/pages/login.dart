import 'dart:async';
import 'package:flutter/material.dart';
import '../vcc.dart';
import '../widgets/movewindow.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  var username = "";
  var password = "";

  bool buttomDisabled = false;
  bool register_password_match = false;
  bool registering = false;
  _LoginPageState() {}
  @override
  initState() {
    unawaited(vccClient.connect("wss://vcc.siliconbio.org.cn/ws"));
  }

  setUsername(username) {
    setState(() {
      this.username = username;
    });
  }

  setPassword(password) {
    setState(() {
      this.password = password;
    });
  }

  login() async {
    if ((await vccClient.login(username, password))) {
      print("ok");
      Navigator.pushNamedAndRemoveUntil(context, "/chat", (_) {
        return false;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text("Worng username or password "),
      ));
    }
    print(2);
    print(this.username + "," + this.password);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PreferredSizedMoveWindow(AppBar(
        title: Text("Login"),
        actions: generateWindowButtons(),
      )),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              "Vcc",
              style: TextStyle(fontSize: 50),
            ),
            Text("The opensoure chat platform", style: TextStyle(fontSize: 20)),
            SizedBox(
              height: 10,
            ),
            SizedBox(
                width: 300,
                child: TextField(
                    onChanged: setUsername,
                    obscureText: false,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(),
                      labelText: 'Username',
                    ))),
            SizedBox(
              height: 10,
            ),
            SizedBox(
                width: 300,
                child: TextField(
                    onChanged: setPassword,
                    obscureText: true,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(),
                      labelText: 'Password',
                    ))),
            this.registering
                ? IntrinsicHeight(
                    child: SizedBox(
                        width: 300,
                        child: Column(
                          children: [
                            SizedBox(
                              height: 10,
                            ),
                            SizedBox(
                                width: 300,
                                child: TextField(
                                    onChanged: (passwd) {
                                      setState(() {
                                        this.register_password_match =
                                            (passwd == this.password);
                                      });
                                    },
                                    obscureText: true,
                                    decoration: InputDecoration(
                                      focusedBorder: OutlineInputBorder(
                                          borderSide: BorderSide(
                                              color:
                                                  this.register_password_match
                                                      ? Theme.of(context)
                                                          .colorScheme
                                                          .primary
                                                      : Colors.red)),
                                      border: OutlineInputBorder(),
                                      labelText: 'Password(confirm)',
                                    ))),
                          ],
                        )))
                : SizedBox.shrink(),
            SizedBox(
              height: 10,
            ),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              FilledButton(
                  child: const Text("Login"),
                  onPressed: this.buttomDisabled
                      ? null
                      : () async {
                          if (this.registering) {
                            setState(() {
                              this.registering = false;
                            });
                          } else {
                            await this.login();
                          }
                        }),
              SizedBox(width: 10),
              FilledButton(
                  child: const Text("Register"),
                  onPressed: this.buttomDisabled
                      ? null
                      : () async {
                          if (this.registering) {
                            if (!this.register_password_match) {
                              return;
                            }
                            if (await vccClient.register(
                                this.username, this.password)) {
                              if (await vccClient.login(username, password)) {
                                Navigator.pushNamedAndRemoveUntil(
                                    context, "/chat", (_) {
                                  return false;
                                });
                                return;
                              }
                            }
                          } else {
                            setState(() {
                              this.registering = true;
                            });
                          }
                        }),
              SizedBox(
                height: 90,
              )
            ]),
          ],
        ),
      ), // This trailing comma makes auto-formatting nicer for build methods.
    );
  }
}
