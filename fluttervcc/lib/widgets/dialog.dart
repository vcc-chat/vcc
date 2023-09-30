import 'package:flutter/material.dart';

class TextInputDialog extends StatelessWidget {
  String value = "";
  late String title;
  late String submitted_text;
  void Function(String)? onSubmitted;

  TextInputDialog(
      String title, String submitted_text, void Function(String)? onSubmitted) {
    this.submitted_text = submitted_text;
    this.onSubmitted = onSubmitted;
    this.title = title;
  }
  Widget build(BuildContext context) {
    return DialogBase(
      title: this.title,
      child: SizedBox(
          width: 300,
          child: TextField(
            onChanged: (value) {
              this.value = value;
            },
          )),
      submitted_text: this.submitted_text,
      onSubmitted: () {
        this.onSubmitted!(this.value);
      },
    );
  }
}

class DialogBase extends StatelessWidget {
  String value = "";
  late Widget child;
  late String title;
  late String submitted_text;
  void Function()? onSubmitted;

  DialogBase(
      {required String title,
      required String submitted_text,
      void Function()? onSubmitted,
      required Widget child}) {
    this.child = child;
    this.submitted_text = submitted_text;
    this.onSubmitted = onSubmitted;
    this.title = title;
  }
  Widget build(BuildContext context) {
    return SimpleDialog(title: Text(title), children: [
      Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            this.child,
            SizedBox(
              height: 10,
            ),
            Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextButton(
                    child: Text(this.submitted_text),
                    onPressed: () {
                      this.onSubmitted!();
                      Navigator.pop(context);
                    },
                  ),
                  TextButton(
                    child: Text("Cancel"),
                    onPressed: () {
                      Navigator.pop(context);
                    },
                  )
                ])
          ],
        ),
      )
    ]);
  }
}
