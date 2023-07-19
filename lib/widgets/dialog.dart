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
    return SimpleDialog(title: Text(title), children: [
      Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
                width: 300,
                child: TextField(
                  onChanged: (value) {
                    this.value = value;
                  },
                )),
                SizedBox(height: 10,),
            Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextButton(
                    child: Text(this.submitted_text),
                    onPressed: () {
                      this.onSubmitted!(this.value);
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
