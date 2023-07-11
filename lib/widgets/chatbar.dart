import 'package:flutter/material.dart';

class ChatBar extends StatelessWidget {
  final void Function(String)? send;
  String message = "";
  ChatBar({this.send}) {}
  Widget build(BuildContext context) {
    var controler = TextEditingController();
    Widget field = TextField(
      controller: controler,
      decoration: InputDecoration(
        suffixIcon: IconButton(
          icon: Icon(Icons.send),
          onPressed: () {
            if (this.message != "") {
              this.send!(this.message);
            }
          },
        ),
      ),
      onChanged: (String str) {
        this.message = str;
      },
      onSubmitted: (String msg) {
        if (this.message != "") {
          this.send!(msg);
        }
        controler.clear();
      },
    );

    return Container(
        padding: EdgeInsets.only(left: 6, bottom: 2),
        alignment: Alignment(0, 0),
        decoration: new BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          borderRadius: BorderRadius.all(Radius.circular(4.0)),
        ),
        child: field);
  }
}
